import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
export class CommandesComponent implements OnInit {
  readonly serviceCommandes = inject(ServiceCommandesService);
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly routeur = inject(Router);

  // Onglet actif : 'EN_COURS' ou 'HISTORIQUE' (conforme à l'Image 3)
  readonly ongletActif = signal<'EN_COURS' | 'HISTORIQUE'>('EN_COURS');

  // Identifiant de la commande en cours d'initialisation de paiement
  readonly chargementPaiementId = signal<string | null>(null);

  // Commandes récentes pour la sous-section RÉCENTS de l'Image 3
  readonly commandesRecentes = computed(() => {
    return this.serviceCommandes.listeCommandes().filter((c) => !c.estEnCours);
  });

  ngOnInit(): void {
    if (this.serviceAuthentification.estAuthentifie()) {
      this.serviceCommandes.chargerCommandes();
    }
  }

  /**
   * Ouvre la page de suivi GPS de la commande (Image 1).
   */
  suivreCommande(identifiantCommande: string): void {
    this.routeur.navigate(['/commandes/suivi', identifiantCommande]);
  }

  /**
   * Permet au client de finaliser son paiement PayTech (Wave / Orange Money).
   */
  payerCommande(commande: CommandeClient): void {
    const id = commande.idNumerique || commande.identifiant;
    if (!id) return;
    this.chargementPaiementId.set(commande.identifiant);

    this.serviceCommandes.initierPaiementPayTech(id).subscribe({
      next: (tentative: any) => {
        this.chargementPaiementId.set(null);
        if (tentative && tentative.url_redirection) {
          window.location.href = tentative.url_redirection;
        } else {
          this.suivreCommande(commande.identifiant);
        }
      },
      error: () => {
        this.chargementPaiementId.set(null);
        this.suivreCommande(commande.identifiant);
      }
    });
  }

  /**
   * Ré-commande un repas passé.
   */
  recommander(commande: CommandeClient): void {
    this.routeur.navigate(['/catalogue']);
  }
}
