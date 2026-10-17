import { CommonModule } from '@angular/common';
import { MenuLivreurComponent } from '../../../partages/composants/menu-livreur/menu-livreur.component';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-fin-livraison',
  standalone: true,
  imports: [MenuLivreurComponent, CommonModule, RouterModule],
  templateUrl: './fin-livraison.component.html'
})
export class FinLivraisonComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);

  /**
   * Retourne à l'accueil livreur.
   */
  retournerAccueil(): void {
    this.routeur.navigate(['/livreur']);
  }
}
