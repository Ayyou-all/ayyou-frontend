import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-trajet-client',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './trajet-client.component.html'
})
export class TrajetClientComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);

  /**
   * Arrivé chez le client : bascule vers la saisie du code de sécurité (Image 3).
   */
  arriverChezClient(): void {
    this.serviceLivreur.avancerEtapeCourse('VALIDATION_CODE');
    this.routeur.navigate(['/livreur/validation-code']);
  }

  /**
   * Retourne à la vérification de la commande.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur/verification']);
  }
}
