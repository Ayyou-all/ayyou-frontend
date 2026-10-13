import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommandeClient } from '../../socle/modeles/commande.modele';
import { ServiceAuthentification } from '../../socle/services/service-authentification.service';
import { ServiceCommandesService } from '../../socle/services/service-commandes.service';

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './commandes.component.html'
})
export class CommandesComponent {
  readonly serviceCommandes = inject(ServiceCommandesService);
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly routeur = inject(Router);

  connexionRapideClient(): void {
    this.serviceAuthentification.connexionRapideClientVisiteur().subscribe();
  }

  // Onglet actif : 'EN_COURS' ou 'HISTORIQUE' (conforme à l'Image 3)
  readonly ongletActif = signal<'EN_COURS' | 'HISTORIQUE'>('EN_COURS');

  // Commandes récentes pour la sous-section RÉCENTS de l'Image 3
  readonly commandesRecentes = computed(() => {
    return this.serviceCommandes.listeCommandes().filter((c) => !c.estEnCours);
  });

  /**
   * Ouvre la page de suivi GPS de la commande (Image 1).
   */
  suivreCommande(identifiantCommande: string): void {
    this.routeur.navigate(['/commandes/suivi', identifiantCommande]);
  }

  /**
   * Ré-commande un repas passé.
   */
  recommander(commande: CommandeClient): void {
    this.routeur.navigate(['/catalogue']);
  }
}
