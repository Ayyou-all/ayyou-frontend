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
  noteMoyenne: number;
  nombreAvis: number;
  adresseLogo: string;
  adresseCouverture: string;
  delaiLivraisonMinutes?: number;
  fraisLivraisonFcfa?: number;
  estAbonne?: boolean;
  estAime?: boolean;
  nombreAbonnes?: number;
  nombreLikes?: number;
  nombreLikesVideos?: number;
  plats?: Plat[];
}
