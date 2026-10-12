import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-validation-code',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './validation-code.component.html'
})
export class ValidationCodeComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);

  // Chiffres saisis par le livreur (ex: '8', '2')
  readonly codeSaisi = signal<string>('82');

  // État de succès de la livraison
  readonly livraisonReussie = signal<boolean>(false);

  // Message d'erreur si code invalide
  readonly messageErreur = signal<string | null>(null);

  // Boîtes d'affichage des 4 chiffres
  readonly casesCode = computed(() => {
    const code = this.codeSaisi();
    return [
      code[0] || null,
      code[1] || null,
      code[2] || null,
      code[3] || null
    ];
  });

  // Clavier numérique
  readonly touchesClavier = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'EFFACER']
  ];

  /**
   * Appui sur une touche numérique.
   */
  appuyerTouche(touche: string): void {
    this.messageErreur.set(null);
    if (!touche) return;

    if (touche === 'EFFACER') {
      const codeActuel = this.codeSaisi();
      if (codeActuel.length > 0) {
        this.codeSaisi.set(codeActuel.slice(0, -1));
      }
      return;
    }

    if (this.codeSaisi().length < 4) {
      this.codeSaisi.set(this.codeSaisi() + touche);
    }
  }

  /**
   * Valide la livraison avec le code saisi et redirige vers l'écran de fin de livraison (Image 1).
   */
  confirmerLivraison(): void {
    if (this.codeSaisi().length < 4) {
      this.messageErreur.set('Veuillez saisir les 4 chiffres du code de sécurité.');
      return;
    }

    // Validation et passage à l'écran de récapitulatif final
    this.serviceLivreur.terminerCourse();
    this.routeur.navigate(['/livreur/fin-livraison']);
  }

  /**
   * Retourne au trajet client.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur/trajet-client']);
  }
}
