import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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

  // Message d'erreur éventuel retourné par l'API
  readonly messageErreur = signal<string | null>(null);

  /**
   * Accepte la proposition de livraison et bascule vers la navigation GPS seulement en cas de confirmation backend.
   */
  accepterLivraison(): void {
    this.messageErreur.set(null);
    this.serviceLivreur.accepterProposition(
      () => {
        this.routeur.navigate(['/livreur/navigation']);
      },
      (erreur) => {
        this.messageErreur.set(erreur || 'Impossible d\'accepter la course. Veuillez réessayer.');
      }
    );
  }

  /**
   * Refuse la proposition.
   */
  refuserLivraison(): void {
    this.serviceLivreur.refuserProposition();
  }

  /**
   * Actualise immédiatement les courses disponibles depuis la base de données.
   */
  rafraichirCourses(): void {
    this.serviceLivreur.verifierNouvellesPropositions();
    this.serviceLivreur.chargerProfilLivreur();
  }
}
