import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PanierRestaurant } from '../../socle/modeles/panier.modele';
import { Plat } from '../../socle/modeles/plat.modele';
import { ServiceCatalogueService } from '../../socle/services/service-catalogue.service';
import { ServicePanierService } from '../../socle/services/service-panier.service';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './panier.component.html'
})
export class PanierComponent {
  readonly servicePanier = inject(ServicePanierService);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly routeur = inject(Router);

  // Filtre sélectionné par pilule : 'TOUS' ou identifiant restaurant
  readonly filtreRestaurant = signal<string>('TOUS');

  // Liste des paniers affichés selon le filtre actif
  readonly paniersAffiches = computed(() => {
    const tousPaniers = this.servicePanier.listePaniersRestaurants();
    const filtre = this.filtreRestaurant();

    const paniersFiltres = tousPaniers.filter((p) => p.identifiantRestaurant === filtre);
    // « Tous », ou restaurant dont le panier vient d'être vidé : on affiche tous les paniers.
    return filtre === 'TOUS' || paniersFiltres.length === 0 ? tousPaniers : paniersFiltres;
  });

  /**
   * Calcule le nombre total d'articles d'un panier spécifique.
   */
  totalArticlesPanier(panier: PanierRestaurant): number {
    return panier.lignes.reduce((acc, l) => acc + l.quantite, 0);
  }

  /**
   * Calcule le nombre d'articles additionnels au-delà des 2 premières miniatures.
   */
  nombreArticlesSupplementaires(panier: PanierRestaurant): number {
    const total = this.totalArticlesPanier(panier);
    return Math.max(0, total - 2);
  }

  /**
   * Ouvre la fiche de détail d'un plat (Image 1).
   */
  ouvrirDetailPlat(plat: Plat): void {
    this.serviceCatalogue.ouvrirDetailPlat(plat);
  }

  /**
   * Navigue directement vers le profil du restaurant d'où provient le plat.
   */
  allerVersProfilRestaurant(identifiantRestaurant: string): void {
    this.routeur.navigate(['/restaurant', identifiantRestaurant]);
  }

  /**
   * Ouvre la page de détail du panier pour le restaurant sélectionné (Image 3).
   */
  ouvrirDetailPanier(identifiantRestaurant: string): void {
    this.routeur.navigate(['/panier/detail', identifiantRestaurant]);
  }

  /**
   * Bouton retour : revient en arrière dans l'historique ou vers l'accueil.
   */
  retourner(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      this.routeur.navigate(['/accueil']);
    }
  }
}
