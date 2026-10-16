import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ColonneKanbanGerant,
  CommandeKanban,
  ServiceRestaurantCommandesService
} from '../../../socle/services/service-restaurant-commandes.service';

@Component({
  selector: 'app-gerant-commandes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-commandes.component.html'
})
export class GerantCommandesComponent {
  readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);

  // Onglet sélectionné sur mobile (Nouvelles, En préparation, Prêtes)
  readonly ongletMobileActif = signal<ColonneKanbanGerant>('NOUVELLES');

  // Modale de refus
  readonly commandeARefuser = signal<CommandeKanban | null>(null);
  readonly modaleRefusOuverte = signal<boolean>(false);
  readonly motifRefus = signal<string>('Rupture d’ingrédients pour ce plat');

  @HostListener('document:keydown.escape')
  surEchap(): void {
    this.modaleRefusOuverte.set(false);
  }

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  // Données des colonnes liées en temps réel au service partagé du restaurant
  readonly commandesNouvelles = computed(() => this.serviceRestaurant.commandesNouvelles());
  readonly commandesPreparation = computed(() => this.serviceRestaurant.commandesPreparation());
  readonly commandesPretes = computed(() => this.serviceRestaurant.commandesPretes());

  // Temps de préparation proposés au gérant, et choix fait pour chaque commande
  readonly delaisPossibles = [10, 15, 20, 25, 30, 45, 60];
  readonly delaiParCommande = signal<Record<string, number>>({});
  readonly actionEnCours = signal<string | null>(null);

  delaiChoisi(numero: string): number {
    return this.delaiParCommande()[numero] ?? 20;
  }

  choisirDelai(numero: string, minutes: number): void {
    this.delaiParCommande.update((delais) => ({ ...delais, [numero]: Number(minutes) }));
  }

  /** Affiche un succès seulement après la réponse du serveur, sinon l'erreur réelle. */
  private executer(numero: string, action: Observable<any>, messageSucces: string): void {
    this.actionEnCours.set(numero);
    action.subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.afficherMessage(messageSucces);
      },
      error: (erreur) => {
        this.actionEnCours.set(null);
        this.afficherMessage(erreur?.error?.message || 'Action impossible. Vérifiez votre connexion et réessayez.');
      }
    });
  }

  private afficherMessage(message: string): void {
    this.notificationSucces.set(message);
    setTimeout(() => this.notificationSucces.set(null), 3500);
  }

  accepterCommande(numero: string): void {
    const delai = this.delaiChoisi(numero);
    this.executer(numero, this.serviceRestaurant.accepterCommande(numero, delai), `Commande ${numero} acceptée (${delai} min).`);
  }

  ouvrirRefus(commande: CommandeKanban): void {
    this.commandeARefuser.set(commande);
    this.modaleRefusOuverte.set(true);
  }

  confirmerRefus(): void {
    const commande = this.commandeARefuser();
    if (!commande) return;
    this.modaleRefusOuverte.set(false);
    this.commandeARefuser.set(null);
    this.executer(
      commande.numero,
      this.serviceRestaurant.refuserCommande(commande.numero, this.motifRefus()),
      `Commande ${commande.numero} refusée : le client est remboursé.`
    );
  }

  marquerCommePrete(numero: string): void {
    this.executer(numero, this.serviceRestaurant.marquerCommePrete(numero), `Commande ${numero} prête : recherche d'un livreur.`);
  }

  remettreAuLivreur(numero: string): void {
    this.executer(numero, this.serviceRestaurant.remettreAuLivreur(numero), `Commande ${numero} remise au livreur.`);
  }

  rafraichirCommandes(): void {
    this.serviceRestaurant.chargerCommandesRestaurant(true);
  }

  /**
   * Synthèse sonore d'un carillon de cuisine de restaurant (Web Audio API sans dépendance).
   */
  jouerSonNouvelleCommande(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // Audio bloqué ou non disponible
    }
  }
}
