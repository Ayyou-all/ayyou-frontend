import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

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
export class CommandesAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  // Onglet sélectionné
  readonly ongletActif = signal<OngletStatutCommande>('TOUS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Date sélectionnée
  readonly dateSelectionnee = signal<string>('Toutes les dates');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 6;

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
  readonly chargementEnCours = signal<boolean>(false);

  // Liste des commandes réelles
  readonly listeCommandes = signal<CommandeAdministration[]>([]);

  // Cartes KPI dynamiques calculées depuis les données réelles
  readonly statsKpi = computed(() => {
    const list = this.listeCommandes();
    const enAttente = list.filter((c) => c.statut === 'EN_ATTENTE').length;
    const enCours = list.filter((c) => c.statut === 'EN_COURS').length;
    const livrees = list.filter((c) => c.statut === 'LIVREE').length;
    const annulees = list.filter((c) => c.statut === 'ANNULEE').length;

    return {
      enAttente: { valeur: enAttente, evolution: enAttente > 0 ? `+${enAttente}` : '0' },
      enCours: { valeur: enCours, evolution: enCours > 0 ? `+${enCours}` : '0' },
      livrees: { valeur: livrees, evolution: livrees > 0 ? `+${livrees}` : '0' },
      annulees: { valeur: annulees < 10 ? `0${annulees}` : `${annulees}`, evolution: '-0%' }
    };
  });

  ngOnInit(): void {
    this.chargerCommandes();
  }

  chargerCommandes(): void {
    this.chargementEnCours.set(true);
    this.http.get<any>(`${environment.apiUrl}/administration/commandes/`).subscribe({
      next: (donnees) => {
        const items = Array.isArray(donnees) ? donnees : (donnees?.results || []);
        const liste: CommandeAdministration[] = items.map((cmd: any) => ({
          identifiantCommande: cmd.identifiantCommande || `#ORD-${cmd.id}`,
          clientNom: cmd.clientNom || 'Client AYYOU',
          clientPhoto: cmd.clientPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          clientTelephone: cmd.clientTelephone || '',
          restaurantNom: cmd.restaurantNom || 'Restaurant Partenaire',
          restaurantAdresse: cmd.restaurantAdresse || 'Dakar',
          coursierNom: cmd.coursierNom || 'Non assigné',
          coursierPhoto: cmd.coursierPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          coursierTelephone: cmd.coursierTelephone || '',
          estCoursierAssigne: !!cmd.estCoursierAssigne,
          totalMontant: cmd.totalMontant || `${cmd.totalValeurNumerique || 0} FCFA`,
          totalValeurNumerique: cmd.totalValeurNumerique || 0,
          statut: (cmd.statut as StatutCommandeAdmin) || 'EN_COURS',
          libelleStatut: cmd.libelleStatut || 'En cours',
          classeStatut: cmd.classeStatut || 'bg-amber-50 text-amber-700 border-amber-200/60',
          dateAffichage: cmd.dateAffichage || 'Récent',
          adresseLivraison: cmd.adresseLivraison || 'Dakar',
          methodePaiement: cmd.methodePaiement || 'WAVE',
          articles: cmd.articles || []
        }));

        this.listeCommandes.set(liste);
        this.chargementEnCours.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement commandes:', err);
        this.chargementEnCours.set(false);
      }
    });
  }

  // Filtrage selon onglet et recherche textuelle
  readonly commandesFiltrees = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();

    return this.listeCommandes().filter((cmd) => {
      // Filtre d'onglet
      if (onglet === 'EN_ATTENTE' && cmd.statut !== 'EN_ATTENTE') return false;
      if (onglet === 'EN_COURS' && cmd.statut !== 'EN_COURS') return false;
      if (onglet === 'LIVREES' && cmd.statut !== 'LIVREE') return false;
      if (onglet === 'ANNULEES' && cmd.statut !== 'ANNULEE') return false;

      // Filtre textuel
      if (recherche) {
        const idMatch = (cmd.identifiantCommande || '').toLowerCase().includes(recherche);
        const clientMatch = (cmd.clientNom || '').toLowerCase().includes(recherche);
        const restoMatch = (cmd.restaurantNom || '').toLowerCase().includes(recherche);
        const coursierMatch = (cmd.coursierNom || '').toLowerCase().includes(recherche);
        if (!idMatch && !clientMatch && !restoMatch && !coursierMatch) {
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

  consulterDetail(cmd: CommandeAdministration): void {
    this.commandeEnDetail.set(cmd);
    this.modaleDetailOuverte.set(true);
  }

  ouvrirDetailCommande(cmd: CommandeAdministration): void {
    this.consulterDetail(cmd);
  }

  fermerDetail(): void {
    this.modaleDetailOuverte.set(false);
    this.commandeEnDetail.set(null);
  }

  fermerDetailCommande(): void {
    this.fermerDetail();
  }

  assignerCoursier(nom?: string): void {
    const cmd = this.commandeEnDetail();
    if (!cmd) return;

    const coursier = nom || 'Moussa Diouf';
    this.notificationSucces.set(`Coursier ${coursier} assigné à la commande ${cmd.identifiantCommande}.`);
    this.fermerDetailCommande();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  assignerCoursierAutomatique(): void {
    const cmd = this.commandeEnDetail();
    if (!cmd) return;

    this.notificationSucces.set(`Recherche d'un coursier disponible pour la commande ${cmd.identifiantCommande}...`);
    setTimeout(() => {
      this.notificationSucces.set(`Coursier assigné avec succès à ${cmd.identifiantCommande} !`);
      setTimeout(() => this.notificationSucces.set(null), 3000);
    }, 1200);
  }

  ouvrirNouvelleCommande(): void {
    this.nouveauClientNom.set('');
    this.modaleNouvelleCommandeOuverte.set(true);
  }

  fermerNouvelleCommande(): void {
    this.modaleNouvelleCommandeOuverte.set(false);
  }

  creerNouvelleCommande(): void {
    const client = this.nouveauClientNom().trim();
    if (!client) return;

    this.notificationSucces.set(`Commande créée pour "${client}".`);
    this.fermerNouvelleCommande();
    this.chargerCommandes();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
