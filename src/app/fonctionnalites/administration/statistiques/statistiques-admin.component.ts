import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface PointEvolutionRevenu {
  date: string;
  valeurMilliers: number;
  label: string;
  xPourcentage: number;
  yPourcentage: number;
}

export interface RestaurantPerformanceTop {
  nom: string;
  commandes: number;
  pourcentageBarre: number; // largeur % relative à 900
}

@Component({
  selector: 'app-statistiques-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './statistiques-admin.component.html'
})
export class StatistiquesAdminComponent {
  // Période sélectionnée
  readonly periodeSelectionnee = signal<string>('1 Oct 2023 - 31 Oct 2023');

  // Fréquence graphique (Hebdomadaire vs Mensuel)
  readonly frequenceGraphique = signal<'HEBDOMADAIRE' | 'MENSUEL'>('HEBDOMADAIRE');

  // Point survolé sur la courbe des revenus
  readonly pointSurvole = signal<PointEvolutionRevenu | null>(null);

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);

  // 4 Cartes KPI (conformes à l'Image 2)
  readonly kpis = {
    revenuTotal: { valeur: '45,820,000 FCFA', evolution: '+12.5%' },
    commandesTotales: { valeur: '8,432', evolution: '+8.2%' },
    utilisateursActifs: { valeur: '12,540', evolution: '+4.1%' },
    tauxCroissance: { valeur: '24.8%', evolution: 'Record' }
  };

  // Points de la courbe d'évolution des revenus (conformes à l'Image 2)
  readonly pointsCourbeRevenus: PointEvolutionRevenu[] = [
    { date: '01 Oct', valeurMilliers: 1200, label: '1 200 000 FCFA', xPourcentage: 35, yPourcentage: 195 },
    { date: '05 Oct', valeurMilliers: 1850, label: '1 850 000 FCFA', xPourcentage: 110, yPourcentage: 165 },
    { date: '10 Oct', valeurMilliers: 1600, label: '1 600 000 FCFA', xPourcentage: 185, yPourcentage: 175 },
    { date: '15 Oct', valeurMilliers: 2300, label: '2 300 000 FCFA', xPourcentage: 260, yPourcentage: 135 },
    { date: '20 Oct', valeurMilliers: 2100, label: '2 100 000 FCFA', xPourcentage: 335, yPourcentage: 145 },
    { date: '25 Oct', valeurMilliers: 2950, label: '2 950 000 FCFA', xPourcentage: 410, yPourcentage: 90 },
    { date: '31 Oct', valeurMilliers: 2700, label: '2 700 000 FCFA', xPourcentage: 485, yPourcentage: 105 }
  ];

  // Performance des Meilleurs Restaurants (Top 5 bar chart de l'Image 2)
  readonly topRestaurants: RestaurantPerformanceTop[] = [
    { nom: 'La Fourchette', commandes: 490, pourcentageBarre: 54 },
    { nom: 'Chez Loutcha', commandes: 580, pourcentageBarre: 64 },
    { nom: 'Planet Kebab', commandes: 640, pourcentageBarre: 71 },
    { nom: 'Diberie Haoussa', commandes: 720, pourcentageBarre: 80 },
    { nom: 'KFC Plateau', commandes: 850, pourcentageBarre: 94 }
  ];

  /**
   * Déclenche l'exportation des rapports et statistiques.
   */
  exporterRapport(): void {
    this.notificationSucces.set('Génération du rapport statistique consolidé (PDF/Excel)...');
    setTimeout(() => {
      this.notificationSucces.set('Rapport "statistiques-ayyou-octobre-2023.pdf" téléchargé.');
      setTimeout(() => this.notificationSucces.set(null), 3000);
    }, 1500);
  }
}
