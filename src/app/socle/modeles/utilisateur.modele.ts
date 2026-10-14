/**
 * Modèles du domaine Utilisateur et Authentification de la plateforme AYYOU.
 * Tous les termes métier sont strictement rédigés en français.
 */

export type RoleUtilisateur = 'CLIENT' | 'RESTAURANT' | 'LIVREUR' | 'ADMINISTRATEUR';

export interface OptionRole {
  valeur: RoleUtilisateur;
  intitule: string;
  description: string;
  icone: string;
  couleurAccent: string;
}

export interface Utilisateur {
  identifiant: string;
  nom: string;
  prenom: string;
  courriel: string;
  telephone: string;
  role: RoleUtilisateur;
  adressePhoto?: string;
  nomEtablissement?: string;
  typeVehicule?: 'MOTO' | 'VELO' | 'VOITURE' | 'SCOOTER';
  adresse?: string;
  estActif: boolean;
  dateCreation: string;
}

export interface IdentifiantsConnexion {
  courriel: string;
  motDePasse: string;
  seSouvenirDeMoi: boolean;
}

export interface FormulaireInscription {
  nom: string;
  prenom: string;
  courriel: string;
  telephone: string;
  motDePasse: string;
  confirmationMotDePasse: string;
  role: RoleUtilisateur;
  nomEtablissement?: string;
  typeVehicule?: 'MOTO' | 'VELO' | 'VOITURE' | 'SCOOTER';
  adresse?: string;
  conditionsAcceptees: boolean;
  documentJustificatif?: File | null;
  documentType?: string;
  logo?: File | null;
  couverture?: File | null;
  permisRecto?: File | null;
  permisVerso?: File | null;
}

export interface ReponseAuthentification {
  jetonAcces: string;
  jetonRafraichissement: string;
  utilisateur: Utilisateur;
}

/**
 * Contrats externes DTO (ex. Django REST Framework / API externe).
 * Conservés en snake_case pour respecter le format externe avant adaptation.
 */
export interface UtilisateurReponseApi {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: string;
  avatar_url?: string;
  establishment_name?: string;
  vehicle_type?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

export interface ConnexionReponseApi {
  access_token: string;
  refresh_token: string;
  user: UtilisateurReponseApi;
}
