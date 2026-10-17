/**
 * Modèle de données pour les paniers d'achat clients AYYOU.
 * Supporte le panier multi-restaurants et les détails par restaurant.
 *
 * Les frais de livraison n'apparaissent pas ici : ils dépendent de l'adresse de livraison
 * et sont calculés par le serveur au moment de commander (voir EstimationCommande).
 */

import { Plat } from './plat.modele';

export type MethodePaiement = 'WAVE' | 'ORANGE_MONEY';

export interface LignePanier {
  idLigne?: number; // identifiant de la ligne côté serveur (absent pour un visiteur non connecté)
  plat: Plat;
  quantite: number;
  instructionsSpeciales?: string;
}

export interface PanierRestaurant {
  identifiantRestaurant: string;
  nomRestaurant: string;
  adresseLogoRestaurant: string;
  delaiLivraison: string; // Délai annoncé par le restaurant, ex : "25-35 min"
  lignes: LignePanier[];
  noteRestaurant?: string;
  methodePaiement: MethodePaiement;
  sousTotalFcfa: number;
  estCommandable: boolean;
  avertissements: string[];
}

/** Montants exacts calculés par le serveur pour une position de livraison donnée. */
export interface EstimationCommande {
  sousTotalFcfa: number;
  fraisLivraisonFcfa: number;
  totalFcfa: number;
}
