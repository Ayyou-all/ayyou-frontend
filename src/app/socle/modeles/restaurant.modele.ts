/**
 * Modèle de données pour les restaurants partenaires de la plateforme AYYOU.
 * Strictement en français.
 */

import { Plat } from './plat.modele';

export interface CategorieRestaurant {
  identifiant: string;
  nom: string;
  icone: string;
  couleurFond: string;
  couleurTexte: string;
}

export interface Restaurant {
  identifiant: string;
  nom: string;
  nomUtilisateur: string; // Ex: @chezloutcha
  description: string;
  specialite: string;
  adresse: string;
  quartierVille: string; // Ex: Keur Massar, Plateau Dakar
  heureFermeture: string; // Ex: 23h30
  estOuvert: boolean;
  adresseLogo: string;
  adresseCouverture: string;
  delaiLivraisonTexte?: string; // Délai annoncé par le restaurant, ex : "25-35 min"
  fraisLivraisonFcfa?: number;
  estAbonne?: boolean;
  estAime?: boolean;
  nombreAbonnes?: number;
  nombreLikes?: number;
  nombreLikesVideos?: number;
  plats?: Plat[];
}

/** Catégories proposées à l'inscription du restaurant (et reprises dans son profil). */
export const CATEGORIES_RESTAURANT: string[] = [
  'Cuisine sénégalaise',
  'Fast Food',
  'Grillades & Barbecue',
  'Pâtisserie & Desserts',
  'Plats traditionnels',
  'Jus locaux & Boissons'
];
