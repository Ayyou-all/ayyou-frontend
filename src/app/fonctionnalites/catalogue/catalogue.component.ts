import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Plat } from '../../socle/modeles/plat.modele';
import { CategorieRestaurant, Restaurant } from '../../socle/modeles/restaurant.modele';
import { ServiceCatalogueService } from '../../socle/services/service-catalogue.service';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './catalogue.component.html'
})
export class CatalogueComponent {
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly routeur = inject(Router);

  // Recherche textuelle
  readonly texteRecherche = signal<string>('');

  // Catégorie filtrée sélectionnée
  readonly categorieSelectionnee = signal<string | null>(null);

  // Liste filtrée des restaurants
  readonly listeRestaurantsFiltree = computed(() => {
    const recherche = this.texteRecherche().trim().toLowerCase();
    const cat = this.categorieSelectionnee();

    return this.serviceCatalogue.restaurants().filter((resto) => {
      const correspondRecherche =
        !recherche ||
        resto.nom.toLowerCase().includes(recherche) ||
        resto.specialite.toLowerCase().includes(recherche) ||
        resto.quartierVille.toLowerCase().includes(recherche);

      return correspondRecherche;
    });
  });

  // Plats populaires à la carte à explorer
  readonly platsPopulaires = computed<Plat[]>(() => {
    return this.serviceCatalogue.restaurants().flatMap((r) => r.plats ?? []).slice(0, 6);
  });

  /**
   * Sélectionne ou désélectionne une catégorie.
   */
  filtrerParCategorie(nomCategorie: string): void {
    if (this.categorieSelectionnee() === nomCategorie) {
      this.categorieSelectionnee.set(null);
    } else {
      this.categorieSelectionnee.set(nomCategorie);
    }
  }

  /**
   * Ouvre la fiche de profil d'un restaurant (navigue directement vers son profil).
   */
  ouvrirRestaurant(identifiantRestaurant: string): void {
    this.routeur.navigate(['/restaurant', identifiantRestaurant]);
  }

  /**
   * Ouvre la fiche détaillée d'un plat (Image 1).
   */
  ouvrirDetailPlat(plat: Plat): void {
    this.serviceCatalogue.ouvrirDetailPlat(plat);
  }
}
