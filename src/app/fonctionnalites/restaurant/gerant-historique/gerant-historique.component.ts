import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  LigneHistoriqueGerant,
  ServiceRestaurantCommandesService
} from '../../../socle/services/service-restaurant-commandes.service';

@Component({
  selector: 'app-gerant-historique',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-historique.component.html'
})
export class GerantHistoriqueComponent {
  private readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);

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

  // Données de l'historique connectées en temps réel au service central
  readonly listeCommandes = computed(() => this.serviceRestaurant.historiqueCommandes());

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
    Math.ceil(this.commandesFiltrees().length / this.elementsParPage) || 1
  );

  readonly commandesPaginees = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.commandesFiltrees().slice(debut, debut + this.elementsParPage);
  });

  // Métriques du résumé du jour en temps réel
  readonly totalCommandesJour = computed(() => this.serviceRestaurant.totalCommandesJour());
  readonly chiffreAffairesJour = computed(() => this.serviceRestaurant.chiffreAffairesJour());

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
