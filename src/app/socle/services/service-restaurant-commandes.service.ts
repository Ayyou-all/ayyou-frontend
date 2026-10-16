import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ColonneKanbanGerant = 'NOUVELLES' | 'PREPARATION' | 'PRETES';
export type TypeCommande = 'LIVRAISON' | 'EMPORTÉ' | 'SUR PLACE';
export type StatutHistorique = 'LIVRÉE' | 'ANNULÉE' | 'EN_COURS';

export interface NotificationGerant {
  id: string;
  titre: string;
  message: string;
  texteVocal: string;
  heure: string;
  lue: boolean;
  type: 'COMMANDE_NOUVELLE' | 'COMMANDE_PRETE' | 'LIVREUR_ARRIVE';
  numeroCommande?: string;
}

export interface ArticleCommandeGerant {
  nom: string;
  quantite: number;
}

export interface CommandeKanban {
  idInterne?: number;
  numero: string;
  clientNom: string;
  totalMontant: string;
  totalValeurNumerique: number;
  typeLivraison: 'LIVRAISON' | 'SUR_PLACE' | 'A_EMPORTER';
  statut: ColonneKanbanGerant;
  articles: ArticleCommandeGerant[];
  remarqueClient?: string;
  coursierNom?: string;
  coursierVehicule?: string;
  coursierPhoto?: string;
  bordureActive?: boolean;
}

export interface LigneHistoriqueGerant {
  numero: string;
  heure: string;
  clientNom: string;
  type: TypeCommande;
  articlesResume: string;
  statut: StatutHistorique;
  montantTotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceRestaurantCommandesService {
  private readonly http = inject(HttpClient);

  // Liste des commandes actives dans le Kanban (alimentée par Django)
  readonly commandesKanban = signal<CommandeKanban[]>([]);

  // Liste de l'historique des commandes terminées
  readonly historiqueCommandes = signal<LigneHistoriqueGerant[]>([]);

  // Notifications en direct
  readonly notifications = signal<NotificationGerant[]>([]);

  // États de chargement et d'erreur
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);

  // Signaux calculés par colonne du Kanban
  readonly commandesNouvelles = computed(() =>
    this.commandesKanban().filter((c) => c.statut === 'NOUVELLES')
  );

  readonly commandesEnPreparation = computed(() =>
    this.commandesKanban().filter((c) => c.statut === 'PREPARATION')
  );
  readonly commandesPreparation = computed(() => this.commandesEnPreparation());

  readonly commandesPretes = computed(() =>
    this.commandesKanban().filter((c) => c.statut === 'PRETES')
  );

  // Total de commandes actives
  readonly totalCommandesActives = computed(() => this.commandesKanban().length);

  // Chiffre d'affaires de la journée (somme des commandes en cours + historique livrées)
  readonly chiffreAffairesDuJour = computed(() => {
    const totalKanban = this.commandesKanban().reduce((acc, c) => acc + c.totalValeurNumerique, 0);
    const totalHist = this.historiqueCommandes()
      .filter((h) => h.statut === 'LIVRÉE')
      .reduce((acc, h) => acc + h.montantTotal, 0);
    return totalKanban + totalHist;
  });
  readonly chiffreAffairesJour = computed(() => this.chiffreAffairesDuJour());

  readonly totalCommandesJour = computed(() =>
    this.commandesKanban().length + this.historiqueCommandes().length
  );

  readonly nombreCommandesLivreesJour = computed(() =>
    this.historiqueCommandes().filter((h) => h.statut === 'LIVRÉE').length
  );

  readonly notificationsNonLues = computed(() =>
    this.notifications().filter((n) => !n.lue)
  );

  readonly nombreNotificationsNonLues = computed(() =>
    this.notificationsNonLues().length
  );

  // Indicateur d'état de connectivité réseau
  readonly estEnLigne = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  private intervallePolling: any = null;
  private idsCommandesConnues = new Set<string>();
  private readonly idsCommandesRemises = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.estEnLigne.set(true);
        if (this.estRoleGerant()) {
          this.chargerCommandesRestaurant(false);
        }
      });
      window.addEventListener('offline', () => {
        this.estEnLigne.set(false);
      });
    }

    if (this.estRoleGerant()) {
      this.demarrerEcouteTempsReel(3500);
    }
  }

  /**
   * Vérifie si l'utilisateur actuellement connecté est un gérant de restaurant.
   */
  estRoleGerant(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const brut = localStorage.getItem('ayyou_utilisateur_connecte');
      if (brut) {
        const u = JSON.parse(brut);
        return u?.role === 'RESTAURANT' || u?.role === 'GERANT_RESTAURANT';
      }
    } catch {}
    return false;
  }

  /**
   * Démarre l'écoute temps réel des commandes restaurant via polling automatique.
   */
  demarrerEcouteTempsReel(intervalleMs: number = 3500): void {
    if (!this.estRoleGerant()) {
      this.arreterEcouteTempsReel();
      return;
    }
    this.chargerCommandesRestaurant(true);
    if (!this.intervallePolling) {
      this.intervallePolling = setInterval(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          this.estEnLigne.set(false);
          return;
        }
        this.chargerCommandesRestaurant(false);
      }, intervalleMs);
    }
  }

  /**
   * Arrête l'écoute temps réel.
   */
  arreterEcouteTempsReel(): void {
    if (this.intervallePolling) {
      clearInterval(this.intervallePolling);
      this.intervallePolling = null;
    }
  }

  /**
   * Émet un carillon sonore pour avertir le gérant d'une nouvelle commande.
   */
  jouerSonNouvelleCommande(texte?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
      if ('speechSynthesis' in window && texte) {
        const u = new SpeechSynthesisUtterance(texte);
        u.lang = 'fr-FR';
        window.speechSynthesis.speak(u);
      }
    } catch {}
  }

  /**
   * Charge les commandes réelles de l'établissement depuis l'API Django.
   */
  chargerCommandesRestaurant(afficherChargement: boolean = false): void {
    if (!this.estRoleGerant()) {
      this.arreterEcouteTempsReel();
      if (afficherChargement) this.chargementEnCours.set(false);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.estEnLigne.set(false);
      if (afficherChargement) this.chargementEnCours.set(false);
      return;
    }

    if (afficherChargement) {
      this.chargementEnCours.set(true);
    }
    this.messageErreur.set(null);

    // Actualisation conjointe des notifications serveur
    this.chargerNotifications();

    this.http.get<any>(`${environment.apiUrl}/commandes/restaurant/`).subscribe({
      next: (commandes) => {
        const kanban: CommandeKanban[] = [];
        const historique: LigneHistoriqueGerant[] = [];
        const liste: any[] = Array.isArray(commandes) ? commandes : (commandes?.results || []);
        const nouvellesArrivees: CommandeKanban[] = [];

        liste.forEach((c) => {
          const numeroAffiche = c.reference || `#${c.id}`;
          const clientNom = c.client_nom || 'Client AYYOU';
          const montant = Number(c.total_fcfa || 0);
          const articles: ArticleCommandeGerant[] = (c.articles || []).map((art: any) => ({
            nom: art.nom_plat || 'Plat',
            quantite: Number(art.quantite || 1)
          }));
          const articlesResume = articles.map((a) => `${a.quantite}x ${a.nom}`).join(', ');
          const date = c.date_creation ? new Date(c.date_creation) : new Date();
          const heureStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

          if (c.statut === 'CREEE_EN_ATTENTE') {
            const itemKanban: CommandeKanban = {
              idInterne: c.id,
              numero: numeroAffiche,
              clientNom,
              totalMontant: `${montant.toLocaleString('fr-FR')} FCFA`,
              totalValeurNumerique: montant,
              typeLivraison: 'LIVRAISON',
              statut: 'NOUVELLES',
              articles,
              remarqueClient: c.instructions_livraison || undefined
            };
            kanban.push(itemKanban);

            // Détection temps réel : si nouvelle commande non vue auparavant
            if (this.idsCommandesConnues.size > 0 && !this.idsCommandesConnues.has(numeroAffiche)) {
              nouvellesArrivees.push(itemKanban);
            }
          } else if (c.statut === 'EN_PREPARATION') {
            kanban.push({
              idInterne: c.id,
              numero: numeroAffiche,
              clientNom,
              totalMontant: `${montant.toLocaleString('fr-FR')} FCFA`,
              totalValeurNumerique: montant,
              typeLivraison: 'LIVRAISON',
              statut: 'PREPARATION',
              articles,
              remarqueClient: c.instructions_livraison || undefined,
              bordureActive: true
            });
          } else if (c.statut === 'PRETE_POUR_RETRAIT' || c.statut === 'COURSE_ASSIGNEE' || c.statut === 'EN_VERIFICATION') {
            if (this.idsCommandesRemises.has(numeroAffiche)) {
              // Déjà remise par le restaurant au comptoir : maintenue dans l'historique en cours
              historique.push({
                numero: numeroAffiche,
                heure: heureStr,
                clientNom,
                type: 'LIVRAISON',
                articlesResume,
                statut: 'EN_COURS',
                montantTotal: montant
              });
            } else {
              kanban.push({
                idInterne: c.id,
                numero: numeroAffiche,
                clientNom,
                totalMontant: `${montant.toLocaleString('fr-FR')} FCFA`,
                totalValeurNumerique: montant,
                typeLivraison: 'LIVRAISON',
                statut: 'PRETES',
                articles,
                coursierNom: c.livreur?.nom || 'Coursier en cours d\'assignation',
                coursierVehicule: c.livreur?.vehicule || 'Livraison AYYOU Express',
                coursierPhoto: c.livreur?.adressePhoto || ''
              });
            }
          } else {
            // Le serveur confirme le départ en livraison ou la livraison finale
            this.idsCommandesRemises.delete(numeroAffiche);
            // Historique
            const statutHist: StatutHistorique =
              c.statut === 'LIVREE' ? 'LIVRÉE' : c.statut === 'REFUSEE_ANNULEE' ? 'ANNULÉE' : 'EN_COURS';
            historique.push({
              numero: numeroAffiche,
              heure: heureStr,
              clientNom,
              type: 'LIVRAISON',
              articlesResume,
              statut: statutHist,
              montantTotal: montant
            });
          }
        });

        // Alerte sonore et visuelle pour les nouvelles commandes
        if (nouvellesArrivees.length > 0) {
          nouvellesArrivees.forEach((cmd) => {
            this.ajouterNotification({
              id: `notif-${Date.now()}-${cmd.numero}`,
              titre: `Nouvelle commande reçue !`,
              message: `${cmd.numero} • ${cmd.totalMontant} (${cmd.articles.length} plat(s))`,
              texteVocal: `Nouvelle commande reçue. Numéro ${cmd.numero}.`,
              heure: 'À l\'instant',
              lue: false,
              type: 'COMMANDE_NOUVELLE',
              numeroCommande: cmd.numero
            });
            this.jouerSonNouvelleCommande(`Nouvelle commande ${cmd.numero}`);
          });
        }

        // Mémorisation des identifiants connus
        this.idsCommandesConnues = new Set(liste.map((c) => c.reference || `#${c.id}`));

        this.commandesKanban.set(kanban);
        this.historiqueCommandes.set(historique);
        this.estEnLigne.set(true);
        if (afficherChargement) {
          this.chargementEnCours.set(false);
        }
      },
      error: (err: any) => {
        if (afficherChargement) {
          this.chargementEnCours.set(false);
        }
        if (err?.status === 0) {
          this.estEnLigne.set(false);
        } else if (err?.status === 401 || err?.status === 403) {
          this.arreterEcouteTempsReel();
        }
      }
    });
  }

  accepterCommande(numero: string): void {
    this.passerEnPreparation(numero);
  }

  /**
   * Accepte une commande et la passe en préparation (action persistée par Django).
   */
  passerEnPreparation(numero: string, delaiMinutes: number = 20): void {
    const cmd = this.commandesKanban().find((c) => c.numero === numero);
    const idCommande = cmd?.idInterne || (cmd?.numero ? cmd.numero.replace('#', '') : numero);

    this.http
      .post(`${environment.apiUrl}/commandes/${idCommande}/accepter/`, {
        delai_minutes: delaiMinutes
      })
      .subscribe({
        next: () => {
          this.commandesKanban.update((liste) =>
            liste.map((c) =>
              c.numero === numero
                ? { ...c, statut: 'PREPARATION' as const, bordureActive: true }
                : c
            )
          );
        },
        error: (err) => {
          const detail =
            err?.error?.detail ||
            err?.error?.message ||
            'Échec de l\'acceptation de la commande. Veuillez vérifier la connexion.';
          this.messageErreur.set(detail);
          // Rollback immédiat : synchronisation avec l'état réel de la base de données
          this.chargerCommandesRestaurant(false);
        }
      });
  }

  /**
   * Refuse une commande via l'API Django et la place dans l'historique en ANNULÉE.
   */
  refuserCommande(numero: string, motif: string = 'Refusée par le restaurant'): void {
    const cmd = this.commandesKanban().find((c) => c.numero === numero);
    if (!cmd) return;

    const idCommande = cmd.idInterne || cmd.numero.replace('#', '');
    this.http
      .post(`${environment.apiUrl}/commandes/${idCommande}/refuser/`, {
        motif: motif
      })
      .subscribe({
        next: () => {
          this.commandesKanban.update((liste) => liste.filter((c) => c.numero !== numero));

          const dateNow = new Date();
          const heureStr = `${dateNow.getHours().toString().padStart(2, '0')}:${dateNow.getMinutes().toString().padStart(2, '0')}`;
          const articlesStr = cmd.articles.map((a) => `${a.quantite}x ${a.nom}`).join(', ');

          const ligneRefusee: LigneHistoriqueGerant = {
            numero: cmd.numero,
            heure: heureStr,
            clientNom: cmd.clientNom,
            type: cmd.typeLivraison === 'LIVRAISON' ? 'LIVRAISON' : cmd.typeLivraison === 'SUR_PLACE' ? 'SUR PLACE' : 'EMPORTÉ',
            articlesResume: articlesStr,
            statut: 'ANNULÉE',
            montantTotal: cmd.totalValeurNumerique
          };

          this.historiqueCommandes.update((hist) => [ligneRefusee, ...hist]);
        },
        error: (err) => {
          const detail =
            err?.error?.detail ||
            err?.error?.message ||
            'Impossible de refuser la commande sur le serveur.';
          this.messageErreur.set(detail);
          this.chargerCommandesRestaurant(false);
        }
      });
  }

  /**
   * Marque une commande en préparation comme prête (API Django).
   */
  marquerCommePrete(numero: string): void {
    const cmd = this.commandesKanban().find((c) => c.numero === numero);
    const idCommande = cmd?.idInterne || (cmd?.numero ? cmd.numero.replace('#', '') : numero);

    this.http
      .post(`${environment.apiUrl}/commandes/${idCommande}/marquer-prete/`, {})
      .subscribe({
        next: () => {
          this.commandesKanban.update((liste) =>
            liste.map((c) =>
              c.numero === numero
                ? {
                    ...c,
                    statut: 'PRETES' as const,
                    bordureActive: false,
                    coursierNom: c.coursierNom,
                    coursierVehicule: c.coursierVehicule,
                    coursierPhoto: c.coursierPhoto
                  }
                : c
            )
          );
        },
        error: (err) => {
          const detail =
            err?.error?.detail ||
            err?.error?.message ||
            'Impossible de marquer la commande comme prête sur le serveur.';
          this.messageErreur.set(detail);
          this.chargerCommandesRestaurant(false);
        }
      });
  }

  /**
   * Remet le colis au livreur.
   */
  remettreAuLivreur(numero: string): void {
    const cmd = this.commandesKanban().find((c) => c.numero === numero);
    if (!cmd) return;

    this.idsCommandesRemises.add(numero);
    this.commandesKanban.update((liste) => liste.filter((c) => c.numero !== numero));

    const dateNow = new Date();
    const heureStr = `${dateNow.getHours().toString().padStart(2, '0')}:${dateNow.getMinutes().toString().padStart(2, '0')}`;
    const articlesStr = cmd.articles.map((a) => `${a.quantite}x ${a.nom}`).join(', ');

    const ligneHistorique: LigneHistoriqueGerant = {
      numero: cmd.numero,
      heure: heureStr,
      clientNom: cmd.clientNom,
      type: cmd.typeLivraison === 'LIVRAISON' ? 'LIVRAISON' : cmd.typeLivraison === 'SUR_PLACE' ? 'SUR PLACE' : 'EMPORTÉ',
      articlesResume: articlesStr,
      statut: cmd.typeLivraison === 'LIVRAISON' ? 'EN_COURS' : 'LIVRÉE',
      montantTotal: cmd.totalValeurNumerique
    };

    this.historiqueCommandes.update((hist) => [ligneHistorique, ...hist]);
  }

  remettreAuLivreurEtTerminer(numero: string): void {
    this.remettreAuLivreur(numero);
  }

  marquerCommandeLivreeParLivreur(numeroOuId: string): void {
    const numeroNormalise = numeroOuId.startsWith('#') ? numeroOuId : `#${numeroOuId}`;
    this.historiqueCommandes.update((liste) =>
      liste.map((c) =>
        c.numero === numeroNormalise || c.numero === numeroOuId
          ? { ...c, statut: 'LIVRÉE' as const }
          : c
      )
    );
  }

  marquerNotificationCommeLue(id: string): void {
    this.notifications.update((liste) =>
      liste.map((n) => (n.id === id ? { ...n, lue: true } : n))
    );
    this.http.post(`${environment.apiUrl}/notifications/${id}/lire/`, {}).subscribe({
      error: () => {}
    });
  }

  toutMarquerCommeLu(): void {
    this.notifications.update((liste) => liste.map((n) => ({ ...n, lue: true })));
    this.http.post(`${environment.apiUrl}/notifications/tout-lire/`, {}).subscribe({
      error: () => {}
    });
  }

  ajouterNotification(notif: NotificationGerant): void {
    this.notifications.update((liste) => [notif, ...liste]);
  }

  chargerNotifications(): void {
    this.http.get<any>(`${environment.apiUrl}/notifications/`).subscribe({
      next: (reponse) => {
        const liste = Array.isArray(reponse) ? reponse : (reponse?.results || []);
        const adaptees: NotificationGerant[] = liste.map((n: any) => ({
          id: String(n.id),
          titre: n.titre || 'Notification',
          message: n.message || '',
          texteVocal: n.texteVocal || n.texte_vocal || '',
          heure: n.heure || '',
          lue: Boolean(n.lue),
          type: n.type || 'COMMANDE',
          numeroCommande: n.numeroCommande || n.numero_commande
        }));
        this.notifications.set(adaptees);
      },
      error: () => {}
    });
  }
}
