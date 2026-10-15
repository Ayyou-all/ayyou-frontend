import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

@Component({
  selector: 'app-modale-connexion-requise',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modale-connexion-requise.component.html'
})
export class ModaleConnexionRequiseComponent {
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly routeur = inject(Router);

  /**
   * Fermeture de la modale via la touche Échap.
   */
  @HostListener('window:keydown.escape')
  gererEchap(): void {
    if (this.serviceAuthentification.modaleConnexionOuverte()) {
      this.fermer();
    }
  }

  /**
   * Ferme la boîte de dialogue sans bloquer la navigation.
   */
  fermer(): void {
    this.serviceAuthentification.fermerModaleConnexion();
  }

  /**
   * Redirige l'utilisateur vers la page de connexion.
   */
  allerVersConnexion(): void {
    this.fermer();
    this.routeur.navigate(['/connexion']);
  }

  /**
   * Redirige l'utilisateur vers la page d'inscription.
   */
  allerVersInscription(): void {
    this.fermer();
    this.routeur.navigate(['/inscription']);
  }
}
