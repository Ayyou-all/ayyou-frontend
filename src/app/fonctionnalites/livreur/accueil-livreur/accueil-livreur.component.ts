import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { PropositionLivraisonComponent } from '../proposition-livraison/proposition-livraison.component';

@Component({
  selector: 'app-accueil-livreur',
  standalone: true,
  imports: [CommonModule, RouterModule, PropositionLivraisonComponent],
  templateUrl: './accueil-livreur.component.html'
})
export class AccueilLivreurComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);

  /**
   * Accepte la proposition de livraison et bascule vers la navigation GPS (Image 3).
   */
  accepterLivraison(): void {
    this.serviceLivreur.accepterProposition();
    this.routeur.navigate(['/livreur/navigation']);
  }

  /**
   * Refuse la proposition.
   */
  refuserLivraison(): void {
    this.serviceLivreur.refuserProposition();
  }

  /**
   * Déclenche une nouvelle proposition de test.
   */
  simulerNouvelleCommande(): void {
    this.serviceLivreur.declencherNouvelleProposition();
  }
}
