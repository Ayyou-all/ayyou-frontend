/**
 * Modèle pour les publications du fil d'accueil immersif (style Reels / TikTok culinaire).
 */

import { Plat } from './plat.modele';

export interface PublicationFil {
  identifiant: string;
  identifiantRestaurant: string;
  nomRestaurant: string;
  nomUtilisateurRestaurant: string; // Ex: @chezloutcha
  adresseLogoRestaurant: string;
  estAbonne: boolean;
  plat: Plat;
  descriptionAccroche: string;
  adresseMedia: string; // Image d'affiche ou de repli
  adresseVideo?: string; // Lien vidéo MP4
  typeMedia: 'IMAGE' | 'VIDEO';
  nombreJeaime: string; // Ex: 1.2k (compteur de la base)
  estAime: boolean;
  nombrePartages: number;
  nombreVues: number;
}
