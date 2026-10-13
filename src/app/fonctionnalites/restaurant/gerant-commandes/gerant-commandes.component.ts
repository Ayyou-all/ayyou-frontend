import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
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

  /**
   * Accepte une nouvelle commande : bascule directement en préparation (sans étape de détails).
   */
  accepterCommande(numero: string): void {
    this.serviceRestaurant.accepterCommande(numero);
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
   * Remet le colis au livreur : la commande passe en cours d'acheminement vers le client.
   */
  remettreAuLivreur(numero: string): void {
    this.serviceRestaurant.remettreAuLivreur(numero);
    this.notificationSucces.set(
      `Commande ${numero} remise au livreur : livraison en cours vers le client.`
    );
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Simule l'arrivée d'une nouvelle commande avec le carillon sonore.
   */
  simulerArriveeCommande(): void {
    const idAlea = `#${Math.floor(1250 + Math.random() * 50)}`;
    this.serviceRestaurant.ajouterNotification({
      id: `notif-${Date.now()}`,
      titre: `Nouvelle commande ${idAlea}`,
      message: 'Client en ligne • 1x Thiéboudienne • 3 500 FCFA',
      texteVocal: `Nouvelle commande numéro ${idAlea.replace('#', '')}. Un Thiéboudienne en livraison.`,
      heure: "À l'instant",
      lue: false,
      type: 'COMMANDE_NOUVELLE',
      numeroCommande: idAlea
    });
    this.jouerSonNouvelleCommande();
    this.notificationSucces.set(`🔔 Nouvelle commande ${idAlea} reçue en cuisine !`);
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
