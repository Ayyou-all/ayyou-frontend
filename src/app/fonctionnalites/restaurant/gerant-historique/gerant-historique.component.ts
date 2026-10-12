import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type TypeCommande = 'LIVRAISON' | 'EMPORTÉ' | 'SUR PLACE';
export type StatutHistorique = 'LIVRÉE' | 'ANNULÉE' | 'EN_COURS';

export interface LigneHistoriqueGerant {
  numero: string;
  heure: string;
  clientNom: string;
  type: TypeCommande;
  articlesResume: string;
  statut: StatutHistorique;
  montantTotal: number;
}

@Component({
  selector: 'app-gerant-historique',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-historique.component.html'
})
export class GerantHistoriqueComponent {
  // Date sélectionnée
  readonly dateSelectionnee = signal<string>("Aujourd'hui, 24 Mai 2024");

  // Recherche
  readonly rechercheTexte = signal<string>('');

  // Tri
  readonly triActif = signal<'recent' | 'montant'>('recent');

  // Modale détail commande
  readonly commandeSelectionnee = signal<LigneHistoriqueGerant | null>(null);

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 5;

  // Données de l'historique (exactes à l'Image 3)
  readonly listeCommandes = signal<LigneHistoriqueGerant[]>([
    {
      numero: '#1245',
      heure: '14:20',
      clientNom: 'Mamadou Faye',
      type: 'LIVRAISON',
      articlesResume: '2x Thieboudienne, 1x Bissap',
      statut: 'LIVRÉE',
      montantTotal: 8500
    },
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
      numero: '#1242',
      heure: '13:30',
      clientNom: 'Inconnu (Invité)',
      type: 'SUR PLACE',
      articlesResume: "1x Grillades Mixte, 1x Jus d'Orange",
      statut: 'LIVRÉE',
      montantTotal: 9000
    },
    {
      numero: '#1241',
      heure: '12:15',
      clientNom: 'Fatou Camara',
      type: 'LIVRAISON',
      articlesResume: '4x Pastels Viande, 4x Pastels Poisson',
      statut: 'LIVRÉE',
      montantTotal: 6000
    },
    // Commandes page 2 & 3 pour simuler les 12 commandes
    {
      numero: '#1240',
      heure: '12:00',
      clientNom: 'Ousmane Ba',
      type: 'LIVRAISON',
      articlesResume: '2x Thieboudienne Penda Mbaye, 2x Bissap',
      statut: 'LIVRÉE',
      montantTotal: 12400
    },
    {
      numero: '#1239',
      heure: '11:45',
      clientNom: 'Seydou Kane',
      type: 'EMPORTÉ',
      articlesResume: '1x Soupou Kandja',
      statut: 'LIVRÉE',
      montantTotal: 5000
    },
    {
      numero: '#1238',
      heure: '11:30',
      clientNom: 'Aïssatou Diallo',
      type: 'LIVRAISON',
      articlesResume: '2x Yassa Guinar, 2x Dibi Agneau',
      statut: 'LIVRÉE',
      montantTotal: 18600
    },
    {
      numero: '#1237',
      heure: '11:10',
      clientNom: 'Cheikh Tidiane',
      type: 'SUR PLACE',
      articlesResume: '1x Riz Gras, 1x Bouye',
      statut: 'LIVRÉE',
      montantTotal: 5500
    },
    {
      numero: '#1236',
      heure: '10:50',
      clientNom: 'Mariama Ndiaye',
      type: 'LIVRAISON',
      articlesResume: '1x Dibi Poulet, 1x Bissap',
      statut: 'LIVRÉE',
      montantTotal: 6500
    },
    {
      numero: '#1235',
      heure: '10:30',
      clientNom: 'Abdoulaye Wade',
      type: 'LIVRAISON',
      articlesResume: '1x Cothi Boulette, 1x Gingembre',
      statut: 'LIVRÉE',
      montantTotal: 5200
    },
    {
      numero: '#1234',
      heure: '10:00',
      clientNom: 'Rokhaya Seck',
      type: 'EMPORTÉ',
      articlesResume: '2x Thieboudienne Blanc',
      statut: 'LIVRÉE',
      montantTotal: 5800
    }
  ]);

  // Commandes filtrées
  readonly commandesFiltrees = computed(() => {
    const q = this.rechercheTexte().trim().toLowerCase();
    let res = this.listeCommandes().filter((c) => {
      if (!q) return true;
      return (
        c.numero.toLowerCase().includes(q) ||
        c.clientNom.toLowerCase().includes(q) ||
        c.articlesResume.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
      );
    });

    if (this.triActif() === 'montant') {
      res = [...res].sort((a, b) => b.montantTotal - a.montantTotal);
    }
    return res;
  });

  // Pagination dynamique
  readonly nombrePages = computed(() =>
    Math.ceil(this.commandesFiltrees().length / this.elementsParPage)
  );

  readonly commandesPaginees = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.commandesFiltrees().slice(debut, debut + this.elementsParPage);
  });

  // Métriques du résumé du jour
  readonly totalCommandesJour = computed(() => 12);
  readonly chiffreAffairesJour = computed(() => 102500);

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePages()) {
      this.pageActuelle.set(page);
    }
  }

  exporterHistorique(): void {
    this.notificationSucces.set('Génération du fichier Excel/CSV des commandes...');
    setTimeout(() => {
      this.notificationSucces.set('Export "commandes-le-teranga-24-mai.csv" téléchargé.');
      setTimeout(() => this.notificationSucces.set(null), 3000);
    }, 1200);
  }

  genererRapportPdf(): void {
    this.notificationSucces.set('Génération du rapport journalier PDF en cours...');
    setTimeout(() => {
      this.notificationSucces.set('Rapport PDF officiel "bilan-journalier-24mai.pdf" prêt.');
      setTimeout(() => this.notificationSucces.set(null), 3000);
    }, 1500);
  }

  afficherDetail(commande: LigneHistoriqueGerant): void {
    this.commandeSelectionnee.set(commande);
  }

  fermerDetail(): void {
    this.commandeSelectionnee.set(null);
  }
}
