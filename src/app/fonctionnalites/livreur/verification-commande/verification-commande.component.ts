import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-verification-commande',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verification-commande.component.html'
})
export class VerificationCommandeComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);

  /**
   * Coche ou décoche la vérification d'un article.
   */
  basculerArticle(index: number): void {
    this.serviceLivreur.basculerArticleVerifie(index);
  }

  /**
   * Coche tous les articles.
   */
  toutCocher(): void {
    this.serviceLivreur.cocherTousArticles();
  }

  /**
   * Valide la récupération et démarre le trajet vers le client (Image 2).
   */
  confirmerRecuperation(): void {
    // Si certains articles n'étaient pas encore cochés, on les valide pour l'expérience fluide
    this.serviceLivreur.cocherTousArticles();
    this.serviceLivreur.avancerEtapeCourse('VERS_CLIENT');
    this.routeur.navigate(['/livreur/trajet-client']);
  }

  /**
   * Retourne à la navigation GPS vers le restaurant.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur/navigation']);
  }
}
