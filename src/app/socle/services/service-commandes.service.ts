/**
 * Service de gestion des commandes et du suivi GPS des livreurs AYYOU.
 * Conforme aux données des maquettes.
 */

import { Injectable, computed, signal } from '@angular/core';
import { CommandeClient } from '../modeles/commande.modele';

@Injectable({
  providedIn: 'root'
})
export class ServiceCommandesService {
  // Liste des commandes du client pré-remplie conformément à l'Image 3
  readonly listeCommandes = signal<CommandeClient[]>([
    {
      identifiant: 'ORD-99238',
      nomRestaurant: 'Le Régal Sénégalais',
      adresseImageRestaurant: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      dateHeureTexte: "Aujourd'hui, 13:45",
      statut: 'EN_LIVRAISON',
      montantTotalFcfa: 8500,
      codeLivraison: [4, 8, 2, 5],
      etapeSuivi: 'EN_ROUTE',
      heureArriveeEstimee: '13:45',
      messageProximite: 'LE LIVREUR EST PROCHE',
      estEnCours: true,
      livreur: {
        nom: 'Moussa Diop',
        vehicule: 'Yamaha TMAX',
        adressePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        numeroTelephone: '+221 77 821 44 90',
        latitude: 14.6928,
        longitude: -17.4467
      },
      articles: [
        {
          nomPlat: 'Thieboudienne Royale',
          quantite: 1,
          prixTotalFcfa: 4500
        },
        {
          nomPlat: 'Bissap Glacé (50cl)',
          quantite: 2,
          prixTotalFcfa: 2000
        }
      ]
    },
    {
      identifiant: 'ORD-98104',
      nomRestaurant: 'Burger King Plateau',
      adresseImageRestaurant: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      dateHeureTexte: "Aujourd'hui, 13:10",
      statut: 'PREPARATION',
      delaiOuRemarque: '15-20 min',
      montantTotalFcfa: 4200,
      codeLivraison: [1, 9, 7, 3],
      etapeSuivi: 'PREPARATION',
      heureArriveeEstimee: '13:30',
      estEnCours: true,
      articles: [
        {
          nomPlat: 'Menu Whopper Double Cheese',
          quantite: 1,
          prixTotalFcfa: 4200
        }
      ]
    },
    {
      identifiant: 'ORD-87412',
      nomRestaurant: "La Pizza d'Oro",
      adresseImageRestaurant: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
      dateHeureTexte: 'Hier, 20:15',
      statut: 'LIVRE',
      montantTotalFcfa: 12000,
      codeLivraison: [7, 3, 4, 1],
      etapeSuivi: 'LIVREE',
      heureArriveeEstimee: '20:45',
      estEnCours: false,
      articles: [
        {
          nomPlat: 'Pizza Margherita Di Bufala',
          quantite: 2,
          prixTotalFcfa: 12000
        }
      ]
    },
    {
      identifiant: 'ORD-76290',
      nomRestaurant: 'Sushi Zen Dakar',
      adresseImageRestaurant: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
      dateHeureTexte: '12 Mai, 12:30',
      statut: 'REFUSE',
      delaiOuRemarque: 'Rupture de stock',
      montantTotalFcfa: 5500,
      codeLivraison: [0, 0, 0, 0],
      etapeSuivi: 'ACCEPTEE',
      heureArriveeEstimee: '12:30',
      estEnCours: false,
      articles: [
        {
          nomPlat: 'Plateau Maki & Sashimi Saumon (18 pcs)',
          quantite: 1,
          prixTotalFcfa: 5500
        }
      ]
    },
    {
      identifiant: 'ORD-65123',
      nomRestaurant: 'Poulet Braisé Express',
      adresseImageRestaurant: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400',
      dateHeureTexte: '10 Mai, 19:45',
      statut: 'PRET',
      delaiOuRemarque: 'Attente livreur',
      montantTotalFcfa: 3800,
      codeLivraison: [5, 2, 8, 9],
      etapeSuivi: 'PREPARATION',
      heureArriveeEstimee: '20:15',
      estEnCours: false,
      articles: [
        {
          nomPlat: 'Demi-poulet braisé avec alloco',
          quantite: 1,
          prixTotalFcfa: 3800
        }
      ]
    }
  ]);

  // Commandes actuellement en cours
  readonly commandesEnCours = computed(() => {
    return this.listeCommandes().filter((c) => c.estEnCours);
  });

  // Commandes passées / historique
  readonly commandesHistorique = computed(() => {
    return this.listeCommandes().filter((c) => !c.estEnCours);
  });

  // Progression de la géolocalisation GPS du livreur sur le trajet (0 à 100 %)
  readonly progressionGpsLivreur = signal<number>(68);

  // Modal / écran de confirmation de livraison réussie (Image 2)
  readonly livraisonValidee = signal<boolean>(false);

  /**
   * Récupère une commande par son identifiant.
   */
  trouverCommandeParId(identifiant: string): CommandeClient | undefined {
    return this.listeCommandes().find((c) => c.identifiant === identifiant);
  }

  /**
   * Simule la validation et livraison de la commande en cours.
   */
  validerLivraison(identifiant: string): void {
    this.listeCommandes.update((cmds) =>
      cmds.map((c) => {
        if (c.identifiant === identifiant) {
          return {
            ...c,
            statut: 'LIVRE',
            etapeSuivi: 'LIVREE',
            estEnCours: false
          };
        }
        return c;
      })
    );
    this.livraisonValidee.set(true);
  }

  /**
   * Ferme l'écran de livraison validée.
   */
  fermerValidationLivraison(): void {
    this.livraisonValidee.set(false);
  }
}
