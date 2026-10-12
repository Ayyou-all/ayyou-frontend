import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PropositionLivraison } from '../../../socle/modeles/livreur.modele';

@Component({
  selector: 'app-proposition-livraison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proposition-livraison.component.html'
})
export class PropositionLivraisonComponent {
  @Input() proposition!: PropositionLivraison;
  @Input() secondesRestantes: number = 22;

  @Output() accepter = new EventEmitter<void>();
  @Output() refuser = new EventEmitter<void>();

  // Calcul du pourcentage pour le cercle SVG de décompte (sur 30 secondes)
  get pourcentageCercle(): number {
    return (this.secondesRestantes / 30) * 100;
  }
}
