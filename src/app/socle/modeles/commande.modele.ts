/**
 * Modèle de données pour les commandes et le suivi de livraison AYYOU.
 * Conforme aux maquettes : liste des commandes, suivi GPS Dakar et confirmation de livraison.
 */

export type StatutCommande =
  | 'EN_LIVRAISON'
  | 'PREPARATION'
  | 'LIVRE'
  | 'REFUSE'
  | 'PRET';

export type EtapeSuiviLivraison =
  | 'ACCEPTEE'
  | 'PREPARATION'
  | 'EN_ROUTE'
  | 'LIVREE';

export interface ArticleCommande {
  nomPlat: string;
  quantite: number;
  prixTotalFcfa: number;
}

export interface LivreurCommande {
  nom: string;
  vehicule: string; // Ex: "Yamaha TMAX"
  adressePhoto: string;
  numeroTelephone: string;
  latitude: number;
  longitude: number;
}

export interface CommandeClient {
  identifiant: string; // Ex: "ORD-99238"
  nomRestaurant: string;
  adresseImageRestaurant: string;
  dateHeureTexte: string; // Ex: "Aujourd'hui, 13:45"
  statut: StatutCommande;
  delaiOuRemarque?: string; // Ex: "15-20 min", "Rupture de stock", "Attente livreur"
  montantTotalFcfa: number;
  codeLivraison: [number, number, number, number]; // Ex: [4, 8, 2, 5]
  livreur?: LivreurCommande;
  etapeSuivi: EtapeSuiviLivraison;
  heureArriveeEstimee: string; // Ex: "13:45"
  messageProximite?: string; // Ex: "LE LIVREUR EST PROCHE"
  articles: ArticleCommande[];
  estEnCours: boolean;
  sourceVideoId?: string; // Attribution commerciale pour le studio vidéo
  statutBrut?: string;
  statutLibelle?: string;
  adresseLivraison?: string;
  latitudeLivraison?: number;
  longitudeLivraison?: number;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
}
