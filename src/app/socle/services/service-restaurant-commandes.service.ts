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

  constructor() {
    this.chargerCommandesRestaurant();
  }

  /**
   * Charge les commandes réelles de l'établissement depuis l'API Django.
   */
  chargerCommandesRestaurant(): void {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);

    this.http.get<any>(`${environment.apiUrl}/commandes/restaurant/`).subscribe({
      next: (commandes) => {
        const kanban: CommandeKanban[] = [];
        const historique: LigneHistoriqueGerant[] = [];
        const liste: any[] = Array.isArray(commandes) ? commandes : (commandes?.results || []);

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
            kanban.push({
              idInterne: c.id,
              numero: numeroAffiche,
              clientNom,
              totalMontant: `${montant.toLocaleString('fr-FR')} FCFA`,
              totalValeurNumerique: montant,
              typeLivraison: 'LIVRAISON',
              statut: 'NOUVELLES',
              articles,
              remarqueClient: c.instructions_livraison || undefined
            });
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
          } else {
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

        this.commandesKanban.set(kanban);
        this.historiqueCommandes.set(historique);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
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
        delai_preparation_estime_minutes: delaiMinutes
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
        error: () => {
          // Mise à jour optimiste locale en cas de session valide
          this.commandesKanban.update((liste) =>
            liste.map((c) =>
              c.numero === numero
                ? { ...c, statut: 'PREPARATION' as const, bordureActive: true }
                : c
            )
          );
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
        motif_refus: motif
      })
      .subscribe({
        next: () => {},
        error: () => {}
      });

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
        next: () => {},
        error: () => {}
      });

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
  }

  /**
   * Remet le colis au livreur.
   */
  remettreAuLivreur(numero: string): void {
    const cmd = this.commandesKanban().find((c) => c.numero === numero);
    if (!cmd) return;

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
  }

  toutMarquerCommeLu(): void {
    this.notifications.update((liste) => liste.map((n) => ({ ...n, lue: true })));
  }

  ajouterNotification(notif: NotificationGerant): void {
    this.notifications.update((liste) => [notif, ...liste]);
  }
}
