/**
 * Modèle de données pour les plats et articles de restaurant de la plateforme AYYOU.
 * Strictement en français conformément aux règles du projet.
 */

export type StatutDisponibilitePlat = 'DISPONIBLE' | 'INDISPONIBLE';

export interface Plat {
  identifiant: string;
  identifiantRestaurant: string;
  nomRestaurant: string;
  nom: string;
  description: string;
  prixFcfa: number;
  adresseImage: string;
  categorie: string;
  statut: StatutDisponibilitePlat;
  tempsPreparationMinutes?: number;
  nombreCommandes?: number;
}
