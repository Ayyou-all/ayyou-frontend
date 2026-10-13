import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

  // État de l'alerte nouvelle commande entrante (conforme à l'image envoyée, sans estimation de temps)
  readonly alerteVisible = signal<boolean>(true);
  readonly alerteCommande = signal<{
    numero: string;
    titre: string;
    sousTitre: string;
    typeLivraison: string;
  }>({
    numero: '#1246',
    titre: 'NOUVELLE COMMANDE !',
    sousTitre: "VIENT D'ARRIVER",
    typeLivraison: 'LIVRAISON RAPIDE'
  });

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  // Données des colonnes liées en temps réel au service partagé du restaurant
  readonly commandesNouvelles = computed(() => this.serviceRestaurant.commandesNouvelles());
  readonly commandesPreparation = computed(() => this.serviceRestaurant.commandesPreparation());
  readonly commandesPretes = computed(() => this.serviceRestaurant.commandesPretes());

  /**
   * Accepte une nouvelle commande : bascule directement en préparation (sans étape de détails).
   */
  accepterCommande(numero: string): void {
    this.serviceRestaurant.accepterCommande(numero);
    if (this.alerteCommande().numero === numero) {
      this.alerteVisible.set(false);
    }
    this.notificationSucces.set(`Commande ${numero} acceptée ! Préparation en cours.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale pour refuser une commande.
   */
  ouvrirRefus(commande: CommandeKanban): void {
    this.commandeARefuser.set(commande);
    this.modaleRefusOuverte.set(true);
  }

  /**
   * Confirme le refus : la commande est retirée et envoyée DIRECTEMENT dans les historiques en ANNULÉE.
   */
  confirmerRefus(): void {
    const cmd = this.commandeARefuser();
    if (!cmd) return;

    this.serviceRestaurant.refuserCommande(cmd.numero, this.motifRefus());
    if (this.alerteCommande().numero === cmd.numero) {
      this.alerteVisible.set(false);
    }

    this.notificationSucces.set(`Commande ${cmd.numero} refusée et archivée dans l'historique.`);
    this.modaleRefusOuverte.set(false);
    this.commandeARefuser.set(null);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Marque la commande comme prête : bascule directement en colonne Prêtes.
   */
  marquerCommePrete(numero: string): void {
    this.serviceRestaurant.marquerCommePrete(numero);
    this.notificationSucces.set(`Commande ${numero} prête ! Livreur notifié.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Remet le colis au livreur : la commande est terminée et part DIRECTEMENT dans l'historique en LIVRÉE.
   */
  remettreAuLivreur(numero: string): void {
    this.serviceRestaurant.remettreAuLivreurEtTerminer(numero);
    this.notificationSucces.set(`Commande ${numero} remise au livreur et archivée dans l'historique !`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Action rapide depuis le bandeau d'alerte : accepte directement la commande d'alerte.
   */
  accepterDepuisAlerte(): void {
    this.accepterCommande(this.alerteCommande().numero);
  }

  /**
   * Ferme l'alerte rouge.
   */
  fermerAlerte(): void {
    this.alerteVisible.set(false);
  }

  /**
   * Simule l'arrivée d'une nouvelle commande avec le carillon sonore.
   */
  simulerArriveeCommande(): void {
    this.alerteVisible.set(true);
    this.jouerSonNouvelleCommande();
    this.notificationSucces.set('🔔 Nouvelle commande reçue en cuisine !');
    setTimeout(() => this.notificationSucces.set(null), 3000);
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
