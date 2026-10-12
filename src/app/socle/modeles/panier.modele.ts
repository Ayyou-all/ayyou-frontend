/**
 * Modèle de données pour les paniers d'achat clients AYYOU.
 * Supporte le panier multi-restaurants et les détails par restaurant.
 */

import { Plat } from './plat.modele';

export type MethodePaiement = 'WAVE' | 'ORANGE_MONEY';

export interface LignePanier {
  plat: Plat;
  quantite: number;
  instructionsSpeciales?: string;
}

export interface PanierRestaurant {
  identifiantRestaurant: string;
  nomRestaurant: string;
  adresseLogoRestaurant: string;
  delaiLivraison: string; // Ex: "25-35 min"
  adresseLivraison: string; // Ex: "Plateau, Avenue Hassan II"
  lignes: LignePanier[];
  noteRestaurant?: string;
  methodePaiement: MethodePaiement;
  sousTotalFcfa: number;
  fraisLivraisonFcfa: number;
  totalFcfa: number;
}

export interface PanierClient {
  paniersParRestaurant: PanierRestaurant[];
  nombreTotalArticles: number;
  totalGlobalFcfa: number;
}
