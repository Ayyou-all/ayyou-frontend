/**
 * Service de l'espace restaurant : tableau de cuisine (Kanban), historique du jour et notifications.
 *
 * Règles :
 * - toutes les données viennent de l'API Django (GET /api/commandes/restaurant/?vue=jour) ;
 * - chaque action (accepter, refuser, prête, remise au livreur) renvoie un Observable :
 *   l'écran n'affiche « succès » qu'après la réponse du serveur, puis recharge l'état réel.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
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
  type: string;
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
  coursierTelephone?: string;
  livreurAssigne?: boolean; // un livreur a accepté la course
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
  montantRestaurant: number; // plats − commission AYYOU (sans les frais de livraison)
}

const STATUTS_TERMINES_LIVRES = ['LIVREE'];
const STATUTS_TERMINES_ANNULES = ['REFUSEE_ANNULEE', 'ECHEC_LIVRAISON'];

@Injectable({
  providedIn: 'root'
})
export class ServiceRestaurantCommandesService {
  private readonly http = inject(HttpClient);
  private readonly urlCommandes = `${environment.apiUrl}/commandes/`;

  readonly commandesKanban = signal<CommandeKanban[]>([]);
  readonly historiqueCommandes = signal<LigneHistoriqueGerant[]>([]);
  readonly notifications = signal<NotificationGerant[]>([]);
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);
  readonly estEnLigne = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  readonly commandesNouvelles = computed(() => this.commandesKanban().filter((c) => c.statut === 'NOUVELLES'));
  readonly commandesEnPreparation = computed(() => this.commandesKanban().filter((c) => c.statut === 'PREPARATION'));
  readonly commandesPreparation = computed(() => this.commandesEnPreparation());
  readonly commandesPretes = computed(() => this.commandesKanban().filter((c) => c.statut === 'PRETES'));
  readonly totalCommandesActives = computed(() => this.commandesKanban().length);

  // Indicateurs du jour (la liste chargée ne contient que les commandes du jour et celles encore en cours)
  readonly totalCommandesJour = computed(() => this.commandesKanban().length + this.historiqueCommandes().length);
  readonly nombreCommandesLivreesJour = computed(() => this.historiqueCommandes().filter((h) => h.statut === 'LIVRÉE').length);
  readonly chiffreAffairesDuJour = computed(() =>
    this.historiqueCommandes()
      .filter((h) => h.statut === 'LIVRÉE')
      .reduce((total, h) => total + h.montantRestaurant, 0)
  );
  readonly chiffreAffairesJour = computed(() => this.chiffreAffairesDuJour());

  readonly notificationsNonLues = computed(() => this.notifications().filter((n) => !n.lue));
  readonly nombreNotificationsNonLues = computed(() => this.notificationsNonLues().length);

  private intervallePolling: any = null;
  private referencesConnues = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.estEnLigne.set(true);
        if (this.estRoleGerant()) this.chargerCommandesRestaurant(false);
      });
      window.addEventListener('offline', () => this.estEnLigne.set(false));
    }
    if (this.estRoleGerant()) {
      this.demarrerEcouteTempsReel();
    }
  }

  estRoleGerant(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const utilisateur = JSON.parse(localStorage.getItem('ayyou_utilisateur_connecte') || 'null');
      return utilisateur?.role === 'RESTAURANT';
    } catch {
      return false;
    }
  }

  /** Rafraîchit régulièrement le tableau de cuisine (voir phase 9 pour le temps réel). */
  demarrerEcouteTempsReel(intervalleMs: number = 5000): void {
    if (!this.estRoleGerant()) return;
    this.chargerCommandesRestaurant(true);
    if (!this.intervallePolling) {
      this.intervallePolling = setInterval(() => this.chargerCommandesRestaurant(false), intervalleMs);
    }
  }

  arreterEcouteTempsReel(): void {
    if (this.intervallePolling) {
      clearInterval(this.intervallePolling);
      this.intervallePolling = null;
    }
  }

  /** Signal sonore + annonce vocale pour une nouvelle commande. */
  jouerSonNouvelleCommande(texte?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const oscillateur = ctx.createOscillator();
        const volume = ctx.createGain();
        oscillateur.connect(volume);
        volume.connect(ctx.destination);
        oscillateur.frequency.setValueAtTime(880, ctx.currentTime);
        oscillateur.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        volume.gain.setValueAtTime(0.3, ctx.currentTime);
        volume.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillateur.start();
        oscillateur.stop(ctx.currentTime + 0.5);
      }
      if ('speechSynthesis' in window && texte) {
        const annonce = new SpeechSynthesisUtterance(texte);
        annonce.lang = 'fr-FR';
        window.speechSynthesis.speak(annonce);
      }
    } catch {
      // Le navigateur peut bloquer le son tant que l'utilisateur n'a pas touché la page.
    }
  }

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  chargerCommandesRestaurant(afficherChargement: boolean = false): void {
    if (!this.estRoleGerant()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.estEnLigne.set(false);
      return;
    }
    if (afficherChargement) this.chargementEnCours.set(true);

    this.chargerNotifications();
    this.http.get<any[]>(`${this.urlCommandes}restaurant/`, { params: { vue: 'jour' } }).subscribe({
      next: (commandes) => {
        this.appliquerCommandesServeur(commandes || []);
        this.estEnLigne.set(true);
        this.messageErreur.set(null);
        this.chargementEnCours.set(false);
      },
      error: (erreur) => {
        this.chargementEnCours.set(false);
        if (erreur?.status === 0) {
          this.estEnLigne.set(false);
          this.messageErreur.set('Connexion perdue. Nouvelle tentative automatique...');
        } else if (erreur?.status === 401 || erreur?.status === 403) {
          this.arreterEcouteTempsReel();
        } else {
          this.messageErreur.set('Impossible de charger les commandes. Veuillez réessayer.');
        }
      }
    });
  }

  /** Répartit les commandes du serveur entre le Kanban et l'historique du jour. */
  appliquerCommandesServeur(commandes: any[]): void {
    const kanban: CommandeKanban[] = [];
    const historique: LigneHistoriqueGerant[] = [];
    const nouvellesArrivees: string[] = [];

    for (const c of commandes) {
      const articles: ArticleCommandeGerant[] = (c.articles || []).map((a: any) => ({ nom: a.nom_plat, quantite: a.quantite }));
      const base = {
        idInterne: c.id,
        numero: c.reference,
        clientNom: c.client_nom || '',
        totalMontant: `${Number(c.total_fcfa).toLocaleString('fr-FR')} FCFA`,
        totalValeurNumerique: Number(c.total_fcfa),
        typeLivraison: 'LIVRAISON' as const,
        articles,
        remarqueClient: c.instructions_livraison || undefined
      };

      if (c.statut === 'CREEE_EN_ATTENTE') {
        kanban.push({ ...base, statut: 'NOUVELLES' });
        if (this.referencesConnues.size > 0 && !this.referencesConnues.has(c.reference)) nouvellesArrivees.push(c.reference);
      } else if (c.statut === 'EN_PREPARATION') {
        kanban.push({ ...base, statut: 'PREPARATION', bordureActive: true });
      } else if (['PRETE_POUR_RETRAIT', 'COURSE_ASSIGNEE', 'EN_VERIFICATION'].includes(c.statut) && !c.remise_confirmee) {
        kanban.push({
          ...base,
          statut: 'PRETES',
          livreurAssigne: Boolean(c.livreur),
          coursierNom: c.livreur?.nom || '',
          coursierVehicule: c.livreur?.vehicule || '',
          coursierPhoto: c.livreur?.adressePhoto || '',
          coursierTelephone: c.livreur?.numeroTelephone || ''
        });
      } else {
        const date = new Date(c.date_creation);
        historique.push({
          numero: c.reference,
          heure: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
          clientNom: c.client_nom || '',
          type: 'LIVRAISON',
          articlesResume: articles.map((a) => `${a.quantite}x ${a.nom}`).join(', '),
          statut: STATUTS_TERMINES_LIVRES.includes(c.statut)
            ? 'LIVRÉE'
            : STATUTS_TERMINES_ANNULES.includes(c.statut)
              ? 'ANNULÉE'
              : 'EN_COURS',
          montantTotal: Number(c.total_fcfa),
          montantRestaurant: Number(c.sous_total_fcfa ?? 0) - Number(c.commission_plateforme_fcfa ?? 0)
        });
      }
    }

    // Les notifications « Nouvelle commande » sont créées par le serveur ; ici on ne joue que le son.
    nouvellesArrivees.forEach((reference) => this.jouerSonNouvelleCommande(`Nouvelle commande ${reference}`));
    this.referencesConnues = new Set(commandes.map((c) => c.reference));
    this.commandesKanban.set(kanban);
    this.historiqueCommandes.set(historique);
  }

  // ---------------------------------------------------------------------------
  // Actions (chacune confirmée par le serveur, puis l'état réel est rechargé)
  // ---------------------------------------------------------------------------

  private idCommande(numero: string): string | number {
    return this.commandesKanban().find((c) => c.numero === numero)?.idInterne ?? numero;
  }

  private actionServeur(chemin: string, numero: string, corps: object = {}): Observable<any> {
    return this.http
      .post(`${this.urlCommandes}${this.idCommande(numero)}/${chemin}/`, corps)
      .pipe(tap({ next: () => this.chargerCommandesRestaurant(false), error: () => this.chargerCommandesRestaurant(false) }));
  }

  /** Accepte la commande avec le temps de préparation choisi par le gérant (en minutes). */
  accepterCommande(numero: string, delaiMinutes: number): Observable<any> {
    return this.actionServeur('accepter', numero, { delai_minutes: delaiMinutes });
  }

  /** Refuse une commande pas encore acceptée ; le client est remboursé par le serveur. */
  refuserCommande(numero: string, motif: string): Observable<any> {
    return this.actionServeur('refuser', numero, { motif });
  }

  marquerCommePrete(numero: string): Observable<any> {
    return this.actionServeur('marquer-prete', numero);
  }

  /** Confirme que le sac a été remis au livreur : il peut ensuite partir chez le client. */
  remettreAuLivreur(numero: string): Observable<any> {
    return this.actionServeur('remettre-au-livreur', numero);
  }

  // ---------------------------------------------------------------------------
  // Notifications (créées par le serveur)
  // ---------------------------------------------------------------------------

  chargerNotifications(): void {
    this.http.get<any>(`${environment.apiUrl}/notifications/`).subscribe({
      next: (reponse) => {
        const liste = Array.isArray(reponse) ? reponse : reponse?.results || [];
        this.notifications.set(
          liste.map((n: any) => ({
            id: String(n.id),
            titre: n.titre,
            message: n.message,
            texteVocal: n.texteVocal || '',
            heure: n.heure || '',
            lue: Boolean(n.lue),
            type: n.type || '',
            numeroCommande: n.numeroCommande
          }))
        );
      },
      error: () => {
        // Les notifications sont secondaires : l'erreur de chargement des commandes suffit à prévenir.
      }
    });
  }

  marquerNotificationCommeLue(id: string): void {
    this.http.post(`${environment.apiUrl}/notifications/${id}/lire/`, {}).subscribe({
      next: () => this.notifications.update((liste) => liste.map((n) => (n.id === id ? { ...n, lue: true } : n))),
      error: () => this.messageErreur.set('Impossible de marquer la notification comme lue.')
    });
  }

  toutMarquerCommeLu(): void {
    this.http.post(`${environment.apiUrl}/notifications/tout-lire/`, {}).subscribe({
      next: () => this.notifications.update((liste) => liste.map((n) => ({ ...n, lue: true }))),
      error: () => this.messageErreur.set('Impossible de marquer les notifications comme lues.')
    });
  }
}
