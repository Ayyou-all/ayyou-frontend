import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Plat } from '../../../socle/modeles/plat.modele';
import { Restaurant } from '../../../socle/modeles/restaurant.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
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
  readonly serviceAuthentification = inject(ServiceAuthentification);

  // État d'abonnement au restaurant
  readonly estAbonne = signal<boolean>(false);

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
   * Bascule l'abonnement à ce restaurant.
   * En mode visiteur, exige la connexion.
   */
  basculerAbonnement(): void {
    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'ABONNEMENT',
        () => this.basculerAbonnement(),
        {
          titre: `S'abonner à ${this.restaurant().nom}`,
          description: `Connectez-vous pour vous abonner à ${this.restaurant().nom} et être informé de sa carte et de ses promotions.`
        }
      );
      return;
    }

    this.estAbonne.update((abonne) => !abonne);
    this.notificationPanier.set(
      this.estAbonne() ? `Abonné à ${this.restaurant().nom} !` : `Désabonné de ${this.restaurant().nom}`
    );
    setTimeout(() => {
      this.notificationPanier.set(null);
    }, 2000);
  }

  /**
   * Ajoute un plat au panier.
   * En mode visiteur, exige la connexion au préalable.
   */
  ajouterAuPanier(plat: Plat): void {
    if (plat.statut === 'INDISPONIBLE') {
      return;
    }

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'COMMANDE',
        () => this.ajouterAuPanier(plat),
        {
          titre: `Commander ${plat.nom}`,
          description: `Connectez-vous pour ajouter ce plat à votre panier et commander chez ${this.restaurant().nom}.`
        }
      );
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
   * En mode visiteur, exige la connexion au préalable.
   */
  partager(): void {
    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'PARTAGE',
        () => this.partager(),
        {
          titre: `Partager ${this.restaurant().nom}`,
          description: `Connectez-vous pour partager ce restaurant avec vos proches et amis.`
        }
      );
      return;
    }

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
