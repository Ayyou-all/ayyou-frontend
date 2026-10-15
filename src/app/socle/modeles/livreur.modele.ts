/**
 * Modèle de données pour l'espace livreur AYYOU.
 * Conforme aux maquettes : accueil livreur, proposition de livraison et navigation GPS en direct.
 */

export type EtapeCourseLivreur =
  | 'VERS_RESTAURANT'
  | 'ARRIVE_RESTAURANT'
  | 'VERS_CLIENT'
  | 'ARRIVE_CLIENT'
  | 'VALIDATION_CODE'
  | 'LIVRE';

export interface ArticleVerification {
  nom: string;
  quantite: number;
  format?: string; // Ex: "Classique", "50cl", "Portion"
  instructions?: string; // Ex: "Extra piment, Format familial", "Bien frais"
  estVerifie: boolean;
}

export interface PropositionLivraison {
  identifiantCommande: string; // Ex: "4521"
  restaurantNom: string; // Ex: "Le Teranga"
  restaurantAdresse: string; // Ex: "Plateau, Dakar"
  restaurantTelephone: string; // Ex: "+221 33 821 00 11"
  comptoirRetrait: string; // Ex: "Allée A - Section 2"
  clientNom: string; // Ex: "Amadou Sow" ou "Moussa Diop"
  clientTelephone: string; // Ex: "+221 77 821 44 90"
  clientAdresse: string; // Ex: "Almadies, Villa 45"
  clientInstructions: string; // Ex: "Sonner à l'entrée, 2ème étage à droite."
  distanceKm: number; // Ex: 3.2
  gainFcfa: number; // Ex: 1500
  tempsRestantSec: number; // Ex: 22
  tempsTrajetMin: number; // Ex: 6
  codeValidation: string; // Ex: "8245"
  articles: ArticleVerification[];
  photoCommande?: string;
}

export interface LivreurProfil {
  nomComplet: string;
  adressePhoto: string;
  vehicule: string;
  estDisponible: boolean;
  gainsDuJourFcfa: number;
  nombreLivraisonsJour: number;
  prenom?: string;
  nom?: string;
  courriel?: string;
  telephone?: string;
  adresse?: string;
  typeVehicule?: string;
  nomVehicule?: string;
  immatriculation?: string;
  zonePrincipale?: string;
  statutValidation?: string;
}

export interface ActiviteJourLivreur {
  jour: string; // Ex: 'Lun', 'Mar'
  montantFcfa: number; // Ex: 11000
  hauteurPourcentage: number; // Ex: 68
}

export interface DetailGainJournalier {
  titreDate: string; // Ex: "Aujourd'hui", "Hier", "Samedi, 20 Mai"
  nombreLivraisons: number; // Ex: 8
  montantFcfa: number; // Ex: 12500
  icone: string; // Ex: "fa-solid fa-calendar-check"
  couleurFond: string; // Ex: "bg-amber-50 text-red-600"
}

export interface ResultatValidationCode {
  valide: boolean;
  message: string;
}


