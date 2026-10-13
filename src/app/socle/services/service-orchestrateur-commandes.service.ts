/**
 * Service orchestrateur de commandes partagées AYYOU.
 * Fait le pont en temps réel entre le panier client, le Kanban du restaurant gérant
 * et la feuille de route du livreur pour garantir l'unicité et la cohérence des états.
 */

import { Injectable, inject } from '@angular/core';
import { CommandeClient } from '../modeles/commande.modele';
import { PanierRestaurant } from '../modeles/panier.modele';
import { ServiceCommandesService } from './service-commandes.service';
import { ServiceLivreurService } from './service-livreur.service';
import { ServicePanierService } from './service-panier.service';
import {
  CommandeKanban,
  ServiceRestaurantCommandesService
} from './service-restaurant-commandes.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceOrchestrateurCommandesService {
  private readonly serviceCommandes = inject(ServiceCommandesService);
  private readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);
  private readonly serviceLivreur = inject(ServiceLivreurService);
  private readonly servicePanier = inject(ServicePanierService);

  /**
   * Crée et propage une nouvelle commande passée par le client depuis son panier.
   * - Insérée dans la liste des commandes client avec code de confirmation PIN unique à 4 chiffres.
   * - Insérée instantanément dans la colonne "Nouvelles" du Kanban restaurant gérant.
   * - Génère une notification sonore et visuelle pour le gérant.
   * - Met à jour la course active du livreur avec le code PIN synchronisé.
   */
  creerCommandeDepuisPanier(
    panier: PanierRestaurant,
    noteClient?: string,
    sourceVideoId?: string
  ): CommandeClient {
    const idNum = Math.floor(1000 + Math.random() * 9000);
    const idCommande = `ORD-${idNum}`;

    // Génération d'un code PIN à 4 chiffres
    const c1 = Math.floor(1 + Math.random() * 9);
    const c2 = Math.floor(Math.random() * 10);
    const c3 = Math.floor(Math.random() * 10);
    const c4 = Math.floor(Math.random() * 10);
    const codeDigits: [number, number, number, number] = [c1, c2, c3, c4];
    const codePinStr = codeDigits.join('');

    const now = new Date();
    const heureStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Entité commande client
    const nouvelleCommandeClient: CommandeClient = {
      identifiant: idCommande,
      nomRestaurant: panier.nomRestaurant,
      adresseImageRestaurant:
        panier.adresseLogoRestaurant ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      dateHeureTexte: `Aujourd'hui, ${heureStr}`,
      statut: 'PREPARATION',
      montantTotalFcfa: panier.totalFcfa,
      codeLivraison: codeDigits,
      etapeSuivi: 'PREPARATION',
      heureArriveeEstimee: `${(now.getHours() + (now.getMinutes() > 35 ? 1 : 0)).toString().padStart(2, '0')}:${((now.getMinutes() + 25) % 60).toString().padStart(2, '0')}`,
      messageProximite: 'Commande en préparation au restaurant',
      estEnCours: true,
      sourceVideoId: sourceVideoId,
      articles: panier.lignes.map((l) => ({
        nomPlat: l.plat.nom,
        quantite: l.quantite,
        prixTotalFcfa: l.plat.prixFcfa * l.quantite
      })),
      livreur: {
        nom: 'Moussa Diop',
        vehicule: 'Yamaha TMAX • Dakar',
        adressePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        numeroTelephone: '+221 77 821 44 90',
        latitude: 14.6710,
        longitude: -17.4320
      }
    };

    // Insérer dans l'historique actif du client
    this.serviceCommandes.ajouterCommande(nouvelleCommandeClient);

    // 2. Entité Kanban restaurant (colonne Nouvelles)
    const numeroRestaurant = `#${idNum}`;
    const commandeKanban: CommandeKanban = {
      numero: numeroRestaurant,
      clientNom: 'Client AYYOU (Plateau)',
      totalMontant: `${panier.totalFcfa.toLocaleString('fr-FR')} FCFA`,
      totalValeurNumerique: panier.totalFcfa,
      typeLivraison: 'LIVRAISON',
      statut: 'NOUVELLES',
      articles: panier.lignes.map((l) => ({
        nom: l.plat.nom,
        quantite: l.quantite
      })),
      remarqueClient: noteClient || undefined
    };

    this.serviceRestaurant.commandesKanban.update((liste) => [commandeKanban, ...liste]);

    // Notification gérant
    this.serviceRestaurant.ajouterNotification({
      id: `notif-${Date.now()}`,
      titre: `Nouvelle commande ${numeroRestaurant}`,
      message: `${panier.nomRestaurant} • ${panier.totalFcfa.toLocaleString('fr-FR')} FCFA • ${panier.lignes.length} article(s)`,
      texteVocal: `Nouvelle commande numéro ${idNum}. Total de ${panier.totalFcfa} francs CFA en livraison.`,
      heure: "À l'instant",
      lue: false,
      type: 'COMMANDE_NOUVELLE',
      numeroCommande: numeroRestaurant
    });

    // 3. Synchronisation de la course livreur avec code PIN concordant
    this.serviceLivreur.courseEnCours.set({
      identifiantCommande: idNum.toString(),
      restaurantNom: panier.nomRestaurant,
      restaurantAdresse: 'Plateau, Dakar',
      restaurantTelephone: '+221 33 821 00 11',
      comptoirRetrait: 'Comptoir Principal',
      clientNom: 'Client AYYOU',
      clientTelephone: '+221 77 821 44 90',
      clientAdresse: panier.adresseLivraison || 'Plateau, Dakar',
      clientInstructions: noteClient || "Sonner à l'entrée",
      distanceKm: 2.5,
      gainFcfa: 1500,
      tempsRestantSec: 25,
      tempsTrajetMin: 6,
      codeValidation: codePinStr,
      articles: panier.lignes.map((l) => ({
        nom: l.plat.nom,
        quantite: l.quantite,
        format: 'Standard',
        instructions: '',
        estVerifie: false
      })),
      photoCommande: panier.adresseLogoRestaurant
    });

    // Vider le panier
    this.servicePanier.viderPanierRestaurant(panier.identifiantRestaurant);

    return nouvelleCommandeClient;
  }
}
