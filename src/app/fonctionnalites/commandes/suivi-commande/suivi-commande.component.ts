import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommandeClient } from '../../../socle/modeles/commande.modele';
import { ServiceCommandesService } from '../../../socle/services/service-commandes.service';
import { ValidationLivraisonComponent } from '../validation-livraison/validation-livraison.component';

@Component({
  selector: 'app-suivi-commande',
  standalone: true,
  imports: [CommonModule, RouterModule, ValidationLivraisonComponent],
  templateUrl: './suivi-commande.component.html'
})
export class SuiviCommandeComponent {
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly serviceCommandes = inject(ServiceCommandesService);

  // État d'ouverture de l'accordéon des détails de la commande
  readonly detailsOuverts = signal<boolean>(true);

  // Modal de contact téléphonique du livreur
  readonly modalAppelLivreur = signal<boolean>(false);

  // Identifiant de la commande sélectionnée dans la route
  readonly identifiantCommande = computed(() => {
    return this.route.snapshot.paramMap.get('idCommande') || 'ORD-99238';
  });

  // Données de la commande courante
  readonly commande = computed<CommandeClient>(() => {
    const id = this.identifiantCommande();
    return (
      this.serviceCommandes.trouverCommandeParId(id) ??
      this.serviceCommandes.listeCommandes()[0]
    );
  });

  // Progression simulée du déplacement GPS du livreur (de 0% à 100%)
  readonly progressionGps = signal<number>(68);

  /**
   * Bascule l'affichage du volet de détails de la commande.
   */
  basculerDetails(): void {
    this.detailsOuverts.update((ouvert) => !ouvert);
  }

  /**
   * Retourne à la liste de mes commandes.
   */
  retourner(): void {
    this.routeur.navigate(['/commandes']);
  }

  /**
   * Simule la complétion de livraison et ouvre l'écran "Commande livrée !" (Image 2).
   */
  confirmerLivraison(): void {
    this.serviceCommandes.validerLivraison(this.commande().identifiant);
  }

  /**
   * Ouvre la modale d'appel du livreur.
   */
  appelerLivreur(): void {
    this.modalAppelLivreur.set(true);
  }

  /**
   * Ferme la modale d'appel.
   */
  fermerAppel(): void {
    this.modalAppelLivreur.set(false);
  }
}
