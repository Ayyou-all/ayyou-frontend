import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Plat } from '../../../socle/modeles/plat.modele';
import { Restaurant } from '../../../socle/modeles/restaurant.modele';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

@Component({
  selector: 'app-detail-restaurant',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail-restaurant.component.html'
})
export class DetailRestaurantComponent {
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly servicePanier = inject(ServicePanierService);

  // Onglet interne actif : 'MENU' ou 'VIDEOS'
  readonly ongletActif = signal<'MENU' | 'VIDEOS'>('MENU');

  // Restaurant courant
  readonly restaurant = computed<Restaurant>(() => {
    const id = this.route.snapshot.paramMap.get('id') || 'resto-chez-habitant';
    return (
      this.serviceCatalogue.trouverRestaurantParId(id) ??
      this.serviceCatalogue.restaurants()[0]
    );
  });

  // Plats du restaurant
  readonly listePlats = computed<Plat[]>(() => {
    return this.restaurant()?.plats ?? [];
  });

  // Message temporaire
  readonly notificationPanier = signal<string | null>(null);

  /**
   * Ajoute un plat au panier.
   */
  ajouterAuPanier(plat: Plat): void {
    if (plat.statut === 'INDISPONIBLE') {
      return;
    }
    this.servicePanier.ajouterPlat(plat, 1);
    this.notificationPanier.set(`${plat.nom} ajouté !`);
    setTimeout(() => {
      this.notificationPanier.set(null);
    }, 2000);
  }

  /**
   * Retourne à la page précédente.
   */
  retourner(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.routeur.navigate(['/catalogue']);
    }
  }

  /**
   * Partager la page du restaurant.
   */
  partager(): void {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: this.restaurant().nom,
        text: this.restaurant().description,
        url: window.location.href
      }).catch(() => {});
    } else {
      this.notificationPanier.set('Lien copié dans le presse-papier !');
      setTimeout(() => this.notificationPanier.set(null), 2000);
    }
  }
}
