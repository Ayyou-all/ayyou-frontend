import { Injectable, computed, signal } from '@angular/core';

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
  // Liste des commandes actives dans le Kanban
  readonly commandesKanban = signal<CommandeKanban[]>([
    {
      numero: '#1245',
      clientNom: 'Mamadou Faye',
      totalMontant: '8 500 FCFA',
      totalValeurNumerique: 8500,
      typeLivraison: 'LIVRAISON',
      statut: 'NOUVELLES',
      articles: [
        { nom: 'Thieboudienne', quantite: 2 },
        { nom: 'Bissap (50cl)', quantite: 1 }
      ],
      remarqueClient: 'Pas de piment svp'
    },
    {
      numero: '#1246',
      clientNom: 'Fatou Diop',
      totalMontant: '4 200 FCFA',
      totalValeurNumerique: 4200,
      typeLivraison: 'LIVRAISON',
      statut: 'NOUVELLES',
      articles: [
        { nom: 'Mafe Poulet', quantite: 1 }
      ]
    },
    {
      numero: '#1242',
      clientNom: 'Ibrahima Sarr',
      totalMontant: '5 800 FCFA',
      totalValeurNumerique: 5800,
      typeLivraison: 'LIVRAISON',
      statut: 'PREPARATION',
      articles: [
        { nom: 'Yassa Poulet (Premium)', quantite: 1 }
      ],
      bordureActive: true
    },
    {
      numero: '#1241',
      clientNom: 'Aïssatou Sow',
      totalMontant: '6 000 FCFA',
      totalValeurNumerique: 6000,
      typeLivraison: 'LIVRAISON',
      statut: 'PREPARATION',
      articles: [
        { nom: 'Pastels Viande (4x)', quantite: 1 },
        { nom: 'Pastels Poisson (4x)', quantite: 1 }
      ]
    },
    {
      numero: '#1240',
      clientNom: 'Cheikh Ndiaye',
      totalMontant: '12 400 FCFA',
      totalValeurNumerique: 12400,
      typeLivraison: 'LIVRAISON',
      statut: 'PRETES',
      articles: [
        { nom: 'Thieboudienne Penda Mbaye', quantite: 2 },
        { nom: 'Bissap', quantite: 2 }
      ],
      coursierNom: 'Moussa S.',
      coursierVehicule: 'Moto • Dakar Plateau',
      coursierPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
      numero: '#1239',
      clientNom: 'Seydou Kane',
      totalMontant: '5 000 FCFA',
      totalValeurNumerique: 5000,
      typeLivraison: 'A_EMPORTER',
      statut: 'PRETES',
      articles: [
        { nom: 'Soupou Kandja', quantite: 1 }
      ]
    }
  ]);

  // Liste de l'historique des commandes terminées
  readonly historiqueCommandes = signal<LigneHistoriqueGerant[]>([
    {
      numero: '#1244',
      heure: '14:05',
      clientNom: 'Aminata Sow',
      type: 'EMPORTÉ',
      articlesResume: '1x Yassa Poulet, 1x Coca',
      statut: 'ANNULÉE',
      montantTotal: 4800
    },
    {
      numero: '#1243',
      heure: '13:45',
      clientNom: 'Moussa Ndoye',
      type: 'LIVRAISON',
      articlesResume: '3x Mafe Viande, 2x Bouye',
      statut: 'LIVRÉE',
      montantTotal: 15200
    },
    {
      numero: '#1238',
      heure: '13:30',
      clientNom: 'Inconnu (Invité)',
      type: 'SUR PLACE',
      articlesResume: "1x Grillades Mixte, 1x Jus d'Orange",
      statut: 'LIVRÉE',
      montantTotal: 9000
    },
    {
      numero: '#1237',
      heure: '12:15',
      clientNom: 'Fatou Camara',
      type: 'LIVRAISON',
      articlesResume: '4x Pastels Viande, 4x Pastels Poisson',
      statut: 'LIVRÉE',
      montantTotal: 6000
    },
    {
      numero: '#1236',
      heure: '11:45',
      clientNom: 'Ousmane Ba',
      type: 'LIVRAISON',
      articlesResume: '2x Thieboudienne, 2x Bissap',
      statut: 'LIVRÉE',
      montantTotal: 12400
    }
  ]);

  // Liste des notifications du gérant (commandes entrantes, alertes, etc.)
  readonly notifications = signal<NotificationGerant[]>([
    {
      id: 'notif-1246',
      titre: 'Nouvelle commande #1246',
      message: 'Fatou Diop • 1x Mafé Poulet • 4 200 FCFA • Livraison rapide',
      texteVocal: "Nouvelle commande numéro 1246. Fatou Diop, un Mafé Poulet, en livraison rapide.",
      heure: "À l'instant",
      lue: false,
      type: 'COMMANDE_NOUVELLE',
      numeroCommande: '#1246'
    },
    {
      id: 'notif-1245',
      titre: 'Nouvelle commande #1245',
      message: 'Mamadou Faye • 2x Thiéboudienne, 1x Bissap • 8 500 FCFA',
      texteVocal: "Nouvelle commande numéro 1245. Mamadou Faye, deux Thiéboudienne et un Bissap.",
      heure: 'Il y a 4 min',
      lue: false,
      type: 'COMMANDE_NOUVELLE',
      numeroCommande: '#1245'
    },
    {
      id: 'notif-1240',
      titre: 'Commande #1240 prête',
      message: 'Prête pour le retrait par le livreur Moussa',
      texteVocal: 'La commande numéro 1240 est prête pour le retrait par le livreur.',
      heure: 'Il y a 10 min',
      lue: true,
      type: 'COMMANDE_PRETE',
      numeroCommande: '#1240'
    }
  ]);

  // Nombre de notifications non lues
  readonly nombreNotificationsNonLues = computed(() =>
    this.notifications().filter((n) => !n.lue).length
  );

  // Colonnes Kanban filtrées
  readonly commandesNouvelles = computed(() =>
    this.commandesKanban().filter((c) => c.statut === 'NOUVELLES')
  );

  readonly commandesPreparation = computed(() =>
    this.commandesKanban().filter((c) => c.statut === 'PREPARATION')
  );

  readonly commandesPretes = computed(() =>
    this.commandesKanban().filter((c) => c.statut === 'PRETES')
  );

  // Statistiques calculées
  readonly totalCommandesJour = computed(() =>
    this.historiqueCommandes().length + this.commandesKanban().length
  );

  readonly chiffreAffairesJour = computed(() => {
    return this.historiqueCommandes()
      .filter((c) => c.statut === 'LIVRÉE')
      .reduce((total, c) => total + c.montantTotal, 0);
  });

  /**
   * Accepte une nouvelle commande et la bascule directement en préparation.
   */
  accepterCommande(numero: string): void {
    this.commandesKanban.update((liste) =>
      liste.map((c) => (c.numero === numero ? { ...c, statut: 'PREPARATION' as const } : c))
    );
  }

  /**
   * Refuse une commande : elle est retirée du tableau et va DIRECTEMENT dans l'historique en statut ANNULÉE.
   */
  refuserCommande(numero: string, motif: string = 'Refusée par le restaurant'): void {
    const cmd = this.commandesKanban().find((c) => c.numero === numero);
    if (!cmd) return;

    // Retirer du Kanban
    this.commandesKanban.update((liste) => liste.filter((c) => c.numero !== numero));

    // Ajouter directement dans l'historique
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
   * Marque une commande en préparation comme prête.
   */
  marquerCommePrete(numero: string): void {
    this.commandesKanban.update((liste) =>
      liste.map((c) =>
        c.numero === numero
          ? {
              ...c,
              statut: 'PRETES' as const,
              bordureActive: false,
              coursierNom: c.coursierNom || 'Moussa S.',
              coursierVehicule: c.coursierVehicule || 'Moto • Dakar Plateau',
              coursierPhoto:
                c.coursierPhoto ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
            }
          : c
      )
    );
  }

  /**
   * Remet le colis au livreur :
   * - Si LIVRAISON : la commande quitte la cuisine et part dans l'historique en statut EN_COURS (en cours de livraison par le coursier).
   *   Elle ne passera à LIVRÉE qu'après la validation effective du code PIN par le livreur auprès du client.
   * - Si SUR_PLACE ou A_EMPORTER : remise directe au client en main propre -> statut LIVRÉE.
   */
  remettreAuLivreur(numero: string): void {
    const cmd = this.commandesKanban().find((c) => c.numero === numero);
    if (!cmd) return;

    // Retirer du Kanban
    this.commandesKanban.update((liste) => liste.filter((c) => c.numero !== numero));

    // Ajouter dans l'historique avec le statut métier approprié
    const dateNow = new Date();
    const heureStr = `${dateNow.getHours().toString().padStart(2, '0')}:${dateNow.getMinutes().toString().padStart(2, '0')}`;
    const articlesStr = cmd.articles.map((a) => `${a.quantite}x ${a.nom}`).join(', ');

    // Pour une livraison par coursier, le statut reste EN_COURS jusqu'à remise au client
    const statutInitial: StatutHistorique =
      cmd.typeLivraison === 'LIVRAISON' ? 'EN_COURS' : 'LIVRÉE';

    const ligneHistorique: LigneHistoriqueGerant = {
      numero: cmd.numero,
      heure: heureStr,
      clientNom: cmd.clientNom,
      type:
        cmd.typeLivraison === 'LIVRAISON'
          ? 'LIVRAISON'
          : cmd.typeLivraison === 'SUR_PLACE'
            ? 'SUR PLACE'
            : 'EMPORTÉ',
      articlesResume: articlesStr,
      statut: statutInitial,
      montantTotal: cmd.totalValeurNumerique
    };

    this.historiqueCommandes.update((hist) => [ligneHistorique, ...hist]);
  }

  /**
   * Alias de rétrocompatibilité préservant les appels existants
   */
  remettreAuLivreurEtTerminer(numero: string): void {
    this.remettreAuLivreur(numero);
  }

  /**
   * Marque la commande comme définitivement livrée dans l'historique après validation du code PIN par le livreur.
   */
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

  /**
   * Marque une notification spécifique comme lue.
   */
  marquerNotificationCommeLue(id: string): void {
    this.notifications.update((liste) =>
      liste.map((n) => (n.id === id ? { ...n, lue: true } : n))
    );
  }

  /**
   * Marque toutes les notifications comme lues.
   */
  toutMarquerCommeLu(): void {
    this.notifications.update((liste) => liste.map((n) => ({ ...n, lue: true })));
  }

  /**
   * Ajoute une nouvelle notification en tête de liste.
   */
  ajouterNotification(notif: NotificationGerant): void {
    this.notifications.update((liste) => [notif, ...liste]);
  }
}
