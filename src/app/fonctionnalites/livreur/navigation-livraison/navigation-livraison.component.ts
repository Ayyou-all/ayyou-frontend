import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-navigation-livraison',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation-livraison.component.html'
})
export class NavigationLivraisonComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);

  // Libellé du bouton d'action principal selon l'étape de livraison
  readonly libelleActionBouton = computed(() => {
    switch (this.serviceLivreur.etapeCourse()) {
      case 'VERS_RESTAURANT':
        return 'Arrivé au restaurant';
      case 'ARRIVE_RESTAURANT':
        return 'Commande récupérée';
      case 'VERS_CLIENT':
        return 'Arrivé chez le client';
      case 'ARRIVE_CLIENT':
        return 'Valider la livraison';
      default:
        return 'Arrivé au restaurant';
    }
  });

  // Icône du bouton d'action selon l'étape
  readonly iconeActionBouton = computed(() => {
    switch (this.serviceLivreur.etapeCourse()) {
      case 'VERS_RESTAURANT':
        return 'fa-solid fa-location-dot';
      case 'ARRIVE_RESTAURANT':
        return 'fa-solid fa-box';
      case 'VERS_CLIENT':
        return 'fa-solid fa-flag-checkered';
      case 'ARRIVE_CLIENT':
        return 'fa-solid fa-circle-check';
      default:
        return 'fa-solid fa-location-dot';
    }
  });

  /**
   * Arrivé au restaurant : bascule vers la vérification des articles (Image 1).
   */
  effectuerActionEtape(): void {
    this.serviceLivreur.avancerEtapeCourse('ARRIVE_RESTAURANT');
    this.routeur.navigate(['/livreur/verification']);
  }

  /**
   * Retourne à l'accueil livreur.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur']);
  }
}
