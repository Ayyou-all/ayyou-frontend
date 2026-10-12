import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommandeClient } from '../../../socle/modeles/commande.modele';

@Component({
  selector: 'app-validation-livraison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './validation-livraison.component.html'
})
export class ValidationLivraisonComponent {
  readonly routeur = inject(Router);

  @Input() commande?: CommandeClient;
  @Output() fermer = new EventEmitter<void>();

  /**
   * Redirige vers le catalogue pour commander à nouveau.
   */
  commanderANouveau(): void {
    this.fermer.emit();
    this.routeur.navigate(['/catalogue']);
  }

  /**
   * Ouvre la liste des commandes ou le reçu.
   */
  consulterRecu(): void {
    this.fermer.emit();
    this.routeur.navigate(['/commandes']);
  }
}
