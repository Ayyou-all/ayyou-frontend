import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ServiceRestaurantCommandesService } from '../../../socle/services/service-restaurant-commandes.service';

export interface ElementMenuGerant {
  code: string;
  libelle: string;
  icone: string;
  chemin: string;
}

@Component({
  selector: 'app-mise-en-page-gerant',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mise-en-page-gerant.component.html'
})
export class MiseEnPageGerantComponent {
  readonly routeur = inject(Router);
  readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);

  // État du tiroir mobile
  readonly menuMobileOuvert = signal<boolean>(false);

  // Statut d'ouverture du restaurant (OUVERT / FERMÉ)
  readonly estOuvert = signal<boolean>(true);

  // Alerte sonore activée ou coupée
  readonly sonActive = signal<boolean>(true);

  // Nombre de commandes du jour (dynamique en temps réel)
  readonly totalCommandesJour = computed(() => this.serviceRestaurant.totalCommandesJour());

  // Notification toast
  readonly notificationSucces = signal<string | null>(null);

  // Liste des menus du parcours Gérant Restaurant (conforme aux 3 images)
  readonly listeMenu: ElementMenuGerant[] = [
    {
      code: 'commandes',
      libelle: 'Commandes',
      icone: 'fa-solid fa-receipt',
      chemin: '/gerant/commandes'
    },
    {
      code: 'menu',
      libelle: 'Menu',
      icone: 'fa-solid fa-utensils',
      chemin: '/gerant/menu'
    },
    {
      code: 'historique',
      libelle: 'Historique',
      icone: 'fa-solid fa-clock-rotate-left',
      chemin: '/gerant/historique'
    },
    {
      code: 'analytiques',
      libelle: 'Analytiques',
      icone: 'fa-solid fa-chart-simple',
      chemin: '/gerant/analytiques'
    },
    {
      code: 'ayyou-studio',
      libelle: 'Ayyou-studio',
      icone: 'fa-solid fa-video',
      chemin: '/gerant/ayyou-studio'
    }
  ];

  /**
   * Vérifie si le lien correspond à la route actuelle.
   */
  estLienActif(chemin: string): boolean {
    return this.routeur.url.startsWith(chemin);
  }

  /**
   * Ouvre ou ferme le menu mobile.
   */
  basculerMenuMobile(): void {
    this.menuMobileOuvert.update((v) => !v);
  }

  /**
   * Ferme le menu mobile.
   */
  fermerMenuMobile(): void {
    this.menuMobileOuvert.set(false);
  }

  /**
   * Bascule le statut du restaurant (Ouvert / Fermé).
   */
  basculerStatutRestaurant(): void {
    this.estOuvert.update((v) => !v);
    const etat = this.estOuvert() ? 'OUVERT' : 'FERMÉ';
    this.notificationSucces.set(`Le restaurant "Le Teranga" est maintenant ${etat}.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Active ou coupe le son des notifications de commandes.
   */
  basculerSon(): void {
    this.sonActive.update((v) => !v);
    const etat = this.sonActive() ? 'activé' : 'en sourdine';
    this.notificationSucces.set(`Signal sonore des nouvelles commandes ${etat}.`);
    setTimeout(() => this.notificationSucces.set(null), 2500);
  }
}
