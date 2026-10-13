import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type OngletStatutCommande =
  | 'TOUS'
  | 'EN_ATTENTE'
  | 'EN_COURS'
  | 'LIVREES'
  | 'ANNULEES';

export type StatutCommandeAdmin = 'EN_ATTENTE' | 'EN_COURS' | 'LIVREE' | 'ANNULEE';

export interface ArticleCommandeAdmin {
  nom: string;
  quantite: number;
  prixUnitaire: number;
}

export interface CommandeAdministration {
  identifiantCommande: string;
  clientNom: string;
  clientPhoto: string;
  clientTelephone: string;
  restaurantNom: string;
  restaurantAdresse: string;
  coursierNom: string;
  coursierPhoto?: string;
  coursierTelephone?: string;
  estCoursierAssigne: boolean;
  totalMontant: string;
  totalValeurNumerique: number;
  statut: StatutCommandeAdmin;
  libelleStatut: string;
  classeStatut: string;
  dateAffichage: string;
  adresseLivraison: string;
  articles: ArticleCommandeAdmin[];
  methodePaiement: string;
}

@Component({
  selector: 'app-commandes-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './commandes-admin.component.html'
})
export class CommandesAdminComponent {
  // Onglet sélectionné
  readonly ongletActif = signal<OngletStatutCommande>('TOUS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Date sélectionnée
  readonly dateSelectionnee = signal<string>('Aujourd’hui, 24 Mai');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 4;

  // Modale de détail d'une commande
  readonly commandeEnDetail = signal<CommandeAdministration | null>(null);
  readonly modaleDetailOuverte = signal<boolean>(false);

  // Modale de nouvelle commande
  readonly modaleNouvelleCommandeOuverte = signal<boolean>(false);
  readonly nouveauClientNom = signal<string>('');
  readonly nouveauRestaurantNom = signal<string>('Le Ryad Dakar');
  readonly nouveauMontant = signal<number>(12500);
  readonly nouvelleAdresse = signal<string>('Plateau, Rue Carnot');

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);

  // Cartes KPI (conformes à l'Image 2)
  readonly statsKpi = {
    enAttente: { valeur: 42, evolution: '+12%' },
    enCours: { valeur: 18, evolution: '+5%' },
    livrees: { valeur: 156, evolution: '+18%' },
    annulees: { valeur: '04', evolution: '-2%' }
  };

  // Liste des commandes (conformes à l'Image 2)
  readonly listeCommandes = signal<CommandeAdministration[]>([
    {
      identifiantCommande: '#ORD-8821',
      clientNom: 'Aminata Sow',
      clientPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      clientTelephone: '+221 77 111 44 22',
      restaurantNom: 'Le Ryad Dakar',
      restaurantAdresse: 'Plateau, Dakar',
      coursierNom: 'Moussa Diouf',
      coursierPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      coursierTelephone: '+221 77 888 99 00',
      estCoursierAssigne: true,
      totalMontant: '15,400 FCFA',
      totalValeurNumerique: 15400,
      statut: 'EN_COURS',
      libelleStatut: 'En cours',
      classeStatut: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dateAffichage: 'Auj, 14:20',
      adresseLivraison: 'Avenue Pasteur, Dakar Plateau',
      methodePaiement: 'Wave (+221 77 111 44 22)',
      articles: [
        { nom: 'Tajine d’Agneau aux Pruneaux', quantite: 2, prixUnitaire: 6000 },
        { nom: 'Pastilla au Poulet', quantite: 1, prixUnitaire: 3400 }
      ]
    },
    {
      identifiantCommande: '#ORD-8819',
      clientNom: 'Binta Thiam',
      clientPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      clientTelephone: '+221 77 222 55 33',
      restaurantNom: 'Chez Loutcha',
      restaurantAdresse: 'Dakar Centre',
      coursierNom: 'Non assigné',
      estCoursierAssigne: false,
      totalMontant: '8,200 FCFA',
      totalValeurNumerique: 8200,
      statut: 'EN_ATTENTE',
      libelleStatut: 'En attente',
      classeStatut: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dateAffichage: 'Auj, 13:55',
      adresseLivraison: 'Rue Victor Hugo, Plateau',
      methodePaiement: 'Orange Money (+221 77 222 55 33)',
      articles: [
        { nom: 'Thiéboudienne Penda Mbaye', quantite: 2, prixUnitaire: 3500 },
        { nom: 'Jus de Bissap Artisanal', quantite: 2, prixUnitaire: 600 }
      ]
    },
    {
      identifiantCommande: '#ORD-8815',
      clientNom: 'Papa Ndiaye',
      clientPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      clientTelephone: '+221 77 333 66 44',
      restaurantNom: 'KFC Plateaux',
      restaurantAdresse: 'Boulevard de la République',
      coursierNom: 'Abdou Fall',
      coursierPhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      coursierTelephone: '+221 77 444 77 88',
      estCoursierAssigne: true,
      totalMontant: '22,100 FCFA',
      totalValeurNumerique: 22100,
      statut: 'LIVREE',
      libelleStatut: 'Livrée',
      classeStatut: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dateAffichage: 'Auj, 12:10',
      adresseLivraison: 'Point E, Rue 10',
      methodePaiement: 'Carte Bancaire (VISA)',
      articles: [
        { nom: 'Bucket Mega Crispy (18 pcs)', quantite: 1, prixUnitaire: 18500 },
        { nom: 'Frites Maxi & Boissons', quantite: 2, prixUnitaire: 1800 }
      ]
    },
    {
      identifiantCommande: '#ORD-8802',
      clientNom: 'Fatou Gueye',
      clientPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      clientTelephone: '+221 77 444 77 55',
      restaurantNom: 'Griot Express',
      restaurantAdresse: 'Almadies, Dakar',
      coursierNom: 'Omar Sy',
      coursierPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      coursierTelephone: '+221 77 555 88 99',
      estCoursierAssigne: true,
      totalMontant: '5,500 FCFA',
      totalValeurNumerique: 5500,
      statut: 'ANNULEE',
      libelleStatut: 'Annulée',
      classeStatut: 'bg-red-50 text-red-700 border-red-200/60',
      dateAffichage: 'Hier, 21:30',
      adresseLivraison: 'Route des Almadies, Villa 42',
      methodePaiement: 'Espèces à la livraison',
      articles: [
        { nom: 'Dibi d’Agneau Braisé', quantite: 1, prixUnitaire: 5500 }
      ]
    },
    {
      identifiantCommande: '#ORD-8799',
      clientNom: 'Cheikh Sarr',
      clientPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      clientTelephone: '+221 77 555 88 00',
      restaurantNom: 'Pâtisserie La Rose',
      restaurantAdresse: 'Mermoz',
      coursierNom: 'Non assigné',
      estCoursierAssigne: false,
      totalMontant: '9,800 FCFA',
      totalValeurNumerique: 9800,
      statut: 'EN_ATTENTE',
      libelleStatut: 'En attente',
      classeStatut: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dateAffichage: 'Hier, 19:40',
      adresseLivraison: 'Mermoz Pyrotechnie',
      methodePaiement: 'Wave',
      articles: [
        { nom: 'Tarte Framboise & Éclair Café', quantite: 4, prixUnitaire: 2450 }
      ]
    }
  ]);

  // Commandes filtrées selon l'onglet actif et le texte recherché
  readonly commandesFiltrees = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();

    return this.listeCommandes().filter((cmd) => {
      // Filtre statut
      if (onglet === 'EN_ATTENTE' && cmd.statut !== 'EN_ATTENTE') return false;
      if (onglet === 'EN_COURS' && cmd.statut !== 'EN_COURS') return false;
      if (onglet === 'LIVREES' && cmd.statut !== 'LIVREE') return false;
      if (onglet === 'ANNULEES' && cmd.statut !== 'ANNULEE') return false;

      // Filtre textuel (ID, client, restaurant, coursier)
      if (recherche) {
        const idMatch = cmd.identifiantCommande.toLowerCase().includes(recherche);
        const clientMatch = cmd.clientNom.toLowerCase().includes(recherche);
        const restMatch = cmd.restaurantNom.toLowerCase().includes(recherche);
        const coursierMatch = cmd.coursierNom.toLowerCase().includes(recherche);
        if (!idMatch && !clientMatch && !restMatch && !coursierMatch) {
          return false;
        }
      }

      return true;
    });
  });

  // Pagination dynamique
  readonly commandesAffichees = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.commandesFiltrees().slice(debut, debut + this.elementsParPage);
  });

  readonly nombrePagesTotal = computed(() => {
    return Math.ceil(this.commandesFiltrees().length / this.elementsParPage) || 1;
  });

  /**
   * Ouvre la modale pour consulter les détails d'une commande.
   */
  ouvrirDetailCommande(commande: CommandeAdministration): void {
    this.commandeEnDetail.set({ ...commande });
    this.modaleDetailOuverte.set(true);
  }

  /**
   * Ferme la modale de détail.
   */
  fermerDetailCommande(): void {
    this.modaleDetailOuverte.set(false);
    this.commandeEnDetail.set(null);
  }

  /**
   * Ouvre la modale pour créer une nouvelle commande manuelle.
   */
  ouvrirNouvelleCommande(): void {
    this.nouveauClientNom.set('');
    this.modaleNouvelleCommandeOuverte.set(true);
  }

  /**
   * Ferme la modale de nouvelle commande.
   */
  fermerNouvelleCommande(): void {
    this.modaleNouvelleCommandeOuverte.set(false);
  }

  /**
   * Enregistre une nouvelle commande.
   */
  creerNouvelleCommande(): void {
    const nomClient = this.nouveauClientNom().trim() || 'Client Guichet';
    const nouvelleCmd: CommandeAdministration = {
      identifiantCommande: `#ORD-${Math.floor(8822 + Math.random() * 50)}`,
      clientNom: nomClient,
      clientPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      clientTelephone: '+221 77 999 00 11',
      restaurantNom: this.nouveauRestaurantNom(),
      restaurantAdresse: 'Dakar',
      coursierNom: 'Non assigné',
      estCoursierAssigne: false,
      totalMontant: `${this.nouveauMontant().toLocaleString()} FCFA`,
      totalValeurNumerique: this.nouveauMontant(),
      statut: 'EN_ATTENTE',
      libelleStatut: 'En attente',
      classeStatut: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dateAffichage: 'Auj, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      adresseLivraison: this.nouvelleAdresse(),
      methodePaiement: 'Wave',
      articles: [
        { nom: 'Menu Spécial Partenaire', quantite: 1, prixUnitaire: this.nouveauMontant() }
      ]
    };

    this.listeCommandes.update((liste) => [nouvelleCmd, ...liste]);
    this.notificationSucces.set(`La commande ${nouvelleCmd.identifiantCommande} a été créée avec succès.`);
    this.fermerNouvelleCommande();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Assigner un coursier à la commande en cours d'examen.
   */
  assignerCoursier(coursierNom: string): void {
    const cmd = this.commandeEnDetail();
    if (!cmd) return;

    const cmdMaj: CommandeAdministration = {
      ...cmd,
      coursierNom: coursierNom,
      estCoursierAssigne: true,
      coursierPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      statut: 'EN_COURS',
      libelleStatut: 'En cours',
      classeStatut: 'bg-amber-50 text-amber-700 border-amber-200/60'
    };

    this.listeCommandes.update((liste) =>
      liste.map((c) => (c.identifiantCommande === cmd.identifiantCommande ? cmdMaj : c))
    );

    this.commandeEnDetail.set(cmdMaj);
    this.notificationSucces.set(`Le coursier ${coursierNom} a été assigné à la commande ${cmd.identifiantCommande}.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Changement de page.
   */
  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
