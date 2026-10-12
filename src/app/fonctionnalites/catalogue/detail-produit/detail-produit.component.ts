import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Plat } from '../../../socle/modeles/plat.modele';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

@Component({
  selector: 'app-detail-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detail-produit.component.html'
})
export class DetailProduitComponent {
  readonly servicePanier = inject(ServicePanierService);

  // Plat affiché (par défaut : Thieboudienne Royal conforme à la maquette 1)
  @Input() plat: Plat = {
    identifiant: 'plat-thieb-royal',
    identifiantRestaurant: 'resto-chez-fatou',
    nomRestaurant: 'Chez Fatou',
    nom: 'Thieboudienne Royal',
    description:
      'Le plat national par excellence. Riz rouge parfumé cuit dans un bouillon de poisson et légumes, accompagné de mérou frais, manioc, carotte, chou et sa sauce gombo onctueuse.',
    prixFcfa: 3500,
    adresseImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    categorie: 'Plats',
    statut: 'DISPONIBLE'
  };

  // Événement de fermeture du modal / fiche produit
  @Output() fermer = new EventEmitter<void>();

  // Quantité choisie
  readonly quantite = signal<number>(1);

  // Instructions spéciales saisies
  readonly instructionsSpeciales = signal<string>('');

  // Notification de confirmation
  readonly confirmationAjout = signal<boolean>(false);

  // Total calculé (prix unitaire * quantité)
  readonly prixTotalCalculer = computed(() => {
    return this.plat.prixFcfa * this.quantite();
  });

  /**
   * Incrémente la quantité.
   */
  augmenterQuantite(): void {
    this.quantite.update((q) => q + 1);
  }

  /**
   * Décrémente la quantité (minimum 1).
   */
  diminuerQuantite(): void {
    if (this.quantite() > 1) {
      this.quantite.update((q) => q - 1);
    }
  }

  /**
   * Ajoute le plat au panier avec les instructions et ferme.
   */
  ajouterAuPanier(): void {
    this.servicePanier.ajouterPlat(
      this.plat,
      this.quantite(),
      this.instructionsSpeciales().trim() || undefined
    );

    this.confirmationAjout.set(true);
    setTimeout(() => {
      this.confirmationAjout.set(false);
      this.fermer.emit();
    }, 600);
  }
}
