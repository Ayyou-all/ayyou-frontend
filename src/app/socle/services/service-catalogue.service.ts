/**
 * Service gérant le catalogue, les publications du fil d'accueil et les restaurants partenaires.
 * Conforme aux données visibles sur les maquettes AYYOU.
 */

import { Injectable, computed, signal } from '@angular/core';
import { PublicationFil } from '../modeles/fil-actualite.modele';
import { Plat } from '../modeles/plat.modele';
import { CategorieRestaurant, Restaurant } from '../modeles/restaurant.modele';

@Injectable({
  providedIn: 'root'
})
export class ServiceCatalogueService {
  // Liste des catégories
  readonly categories = signal<CategorieRestaurant[]>([
    {
      identifiant: 'cat-plats',
      nom: 'Plats',
      icone: 'fa-solid fa-utensils',
      couleurFond: 'bg-rose-50',
      couleurTexte: 'text-[#E51824]'
    },
    {
      identifiant: 'cat-burgers',
      nom: 'Burgers',
      icone: 'fa-solid fa-burger',
      couleurFond: 'bg-rose-50',
      couleurTexte: 'text-[#E51824]'
    },
    {
      identifiant: 'cat-poulet',
      nom: 'Poulet',
      icone: 'fa-solid fa-drumstick-bite',
      couleurFond: 'bg-rose-50',
      couleurTexte: 'text-[#E51824]'
    },
    {
      identifiant: 'cat-poisson',
      nom: 'Poisson',
      icone: 'fa-solid fa-fish',
      couleurFond: 'bg-rose-50',
      couleurTexte: 'text-[#E51824]'
    },
    {
      identifiant: 'cat-desserts',
      nom: 'Desserts',
      icone: 'fa-solid fa-ice-cream',
      couleurFond: 'bg-rose-50',
      couleurTexte: 'text-[#E51824]'
    },
    {
      identifiant: 'cat-boissons',
      nom: 'Boissons',
      icone: 'fa-solid fa-bottle-water',
      couleurFond: 'bg-rose-50',
      couleurTexte: 'text-[#E51824]'
    }
  ]);

  // Liste des restaurants partenaires
  readonly restaurants = signal<Restaurant[]>([
    {
      identifiant: 'resto-chez-habitant',
      nom: "Chez L'Habitant",
      nomUtilisateur: '@chezlhabitant',
      description: 'Cuisine authentique sénégalaise préparée avec passion et tradition.',
      specialite: 'Cuisine authentique sénégalaise • Plateau, Dakar',
      adresse: 'Rue Carnot, Plateau',
      quartierVille: 'Keur Massar',
      heureFermeture: '23h 30',
      estOuvert: true,
      noteMoyenne: 4.8,
      nombreAvis: 342,
      adresseLogo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      adresseCouverture: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
      plats: [
        {
          identifiant: 'plat-thieb-royal',
          identifiantRestaurant: 'resto-chez-habitant',
          nomRestaurant: "Chez L'Habitant",
          nom: 'Thieboudienne Royal',
          description: 'Riz rouge traditionnel au poisson, servi avec légumes frais et sauce gombo.',
          prixFcfa: 3500,
          adresseImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        },
        {
          identifiant: 'plat-yassa-poulet',
          identifiantRestaurant: 'resto-chez-habitant',
          nomRestaurant: "Chez L'Habitant",
          nom: 'Yassa au Poulet',
          description: 'Poulet mariné au citron et oignons caramélisés, servi avec riz blanc.',
          prixFcfa: 3000,
          adresseImage: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        },
        {
          identifiant: 'plat-mafe-boeuf',
          identifiantRestaurant: 'resto-chez-habitant',
          nomRestaurant: "Chez L'Habitant",
          nom: 'Mafe au Bœuf',
          description: "Ragoût de bœuf à la pâte d'arachide et légumes, onctueux et savoureux.",
          prixFcfa: 2800,
          adresseImage: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
          categorie: 'Plats',
          statut: 'INDISPONIBLE'
        },
        {
          identifiant: 'plat-pastels',
          identifiantRestaurant: 'resto-chez-habitant',
          nomRestaurant: "Chez L'Habitant",
          nom: 'Pastels (6 pcs)',
          description: 'Petits chaussons au thon servis avec une sauce tomate épicée.',
          prixFcfa: 1500,
          adresseImage: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        }
      ]
    },
    {
      identifiant: 'resto-aissatou-foot',
      nom: 'Aissatou Foot',
      nomUtilisateur: '@aissatoufood',
      description: 'Saveurs africaines et petits plats mijotés au cœur de Keur Massar.',
      specialite: 'Saveurs locales & Plats du jour',
      adresse: 'Route de Keur Massar',
      quartierVille: 'Keur Masssar',
      heureFermeture: '22h 00',
      estOuvert: true,
      noteMoyenne: 4.6,
      nombreAvis: 198,
      adresseLogo: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
      adresseCouverture: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      plats: [
        {
          identifiant: 'plat-aissatou-salade',
          identifiantRestaurant: 'resto-aissatou-foot',
          nomRestaurant: 'Aissatou Foot',
          nom: 'Salade Gourmande Patate & Fromage',
          description: 'Bol équilibré avec patates douces rôties, graines torréfiées et fromage frais.',
          prixFcfa: 3500,
          adresseImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        }
      ]
    },
    {
      identifiant: 'resto-chez-loutcha',
      nom: 'Chez Loutcha',
      nomUtilisateur: '@chezloutcha',
      description: 'Une institution de la gastronomie dakaroise depuis plus de 30 ans.',
      specialite: 'Thiéboudienne authentique & spécialités ouest-africaines',
      adresse: 'Rue Raffenel, Dakar Plateau',
      quartierVille: 'Dakar Plateau',
      heureFermeture: '23h 00',
      estOuvert: true,
      noteMoyenne: 4.9,
      nombreAvis: 820,
      adresseLogo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      adresseCouverture: '/images/plat-accueil.jpg',
      plats: [
        {
          identifiant: 'plat-thieb-penda',
          identifiantRestaurant: 'resto-chez-loutcha',
          nomRestaurant: 'Chez Loutcha',
          nom: 'Thiéboudienne Penda Mbaye',
          description: 'Le vrai goût du Sénégal livré chez vous.',
          prixFcfa: 4500,
          adresseImage: '/images/plat-accueil.jpg',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        }
      ]
    },
    {
      identifiant: 'resto-chez-fatou',
      nom: 'Chez Fatou',
      nomUtilisateur: '@chezfatou',
      description: 'Restaurant et lounge en bord de mer aux Almadies. Cuisine sénégalaise et fruits de mer frais.',
      specialite: 'Poissons braisés, Thieboudienne Royal & Cocktails locaux',
      adresse: 'Route des Almadies, Dakar',
      quartierVille: 'Almadies, Dakar',
      heureFermeture: '00h 00',
      estOuvert: true,
      noteMoyenne: 4.9,
      nombreAvis: 1250,
      adresseLogo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      adresseCouverture: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
      plats: [
        {
          identifiant: 'plat-thieb-royal',
          identifiantRestaurant: 'resto-chez-fatou',
          nomRestaurant: 'Chez Fatou',
          nom: 'Thieboudienne Royal',
          description:
            'Le plat national par excellence. Riz rouge parfumé cuit dans un bouillon de poisson et légumes, accompagné de mérou frais, manioc, carotte, chou et sa sauce gombo onctueuse.',
          prixFcfa: 3500,
          adresseImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        },
        {
          identifiant: 'plat-bissap-fatou',
          identifiantRestaurant: 'resto-chez-fatou',
          nomRestaurant: 'Chez Fatou',
          nom: 'Bissap Frais Maison',
          description: '50cl, Sans sucre ajouté, menthe fraîche infusée.',
          prixFcfa: 1000,
          adresseImage: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
          categorie: 'Boissons',
          statut: 'DISPONIBLE'
        },
        {
          identifiant: 'plat-pastels-fatou',
          identifiantRestaurant: 'resto-chez-fatou',
          nomRestaurant: 'Chez Fatou',
          nom: 'Pastels Dorés au Thon (8 pcs)',
          description: 'Beignets croustillants servis chauds avec sauce tomate pimentée maison.',
          prixFcfa: 2000,
          adresseImage: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        }
      ]
    },
    {
      identifiant: 'resto-chez-aissatou',
      nom: 'Chez Aissatou',
      nomUtilisateur: '@chezaissatou',
      description: 'Cuisine traditionnelle sénégalaise préparée au feu de bois.',
      specialite: 'Plats sénégalais & Jus locaux',
      adresse: 'Rond-point 6, Keur Massar',
      quartierVille: 'Keur Massar',
      heureFermeture: '22h 30',
      estOuvert: true,
      noteMoyenne: 4.7,
      nombreAvis: 310,
      adresseLogo: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
      adresseCouverture: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200',
      plats: [
        {
          identifiant: 'plat-aissatou-salade',
          identifiantRestaurant: 'resto-chez-aissatou',
          nomRestaurant: 'Chez Aissatou',
          nom: 'Bowl Gourmand Keur Massar',
          description: 'Patates douces rôties, graines torréfiées et fromage frais.',
          prixFcfa: 3500,
          adresseImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
          categorie: 'Plats',
          statut: 'DISPONIBLE'
        },
        {
          identifiant: 'plat-bissap-aissatou',
          identifiantRestaurant: 'resto-chez-aissatou',
          nomRestaurant: 'Chez Aissatou',
          nom: 'Bissap Frais',
          description: '50cl, fleur d’hibiscus du Sénégal.',
          prixFcfa: 1000,
          adresseImage: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
          categorie: 'Boissons',
          statut: 'DISPONIBLE'
        }
      ]
    }
  ]);

  // Publications du fil immersif d'accueil (vidéos style TikTok / Reels culinaires)
  readonly publicationsFil = signal<PublicationFil[]>([
    {
      identifiant: 'pub-01',
      identifiantRestaurant: 'resto-chez-loutcha',
      nomRestaurant: 'Chez Loutcha',
      nomUtilisateurRestaurant: '@chezloutcha',
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      estAbonne: false,
      plat: {
        identifiant: 'plat-thieb-penda',
        identifiantRestaurant: 'resto-chez-loutcha',
        nomRestaurant: 'Chez Loutcha',
        nom: 'Thiéboudienne Penda Mbaye',
        description: 'Le vrai goût du Sénégal livré chez vous.',
        prixFcfa: 4500,
        adresseImage: '/images/plat-accueil.jpg',
        categorie: 'Plats',
        statut: 'DISPONIBLE'
      },
      descriptionAccroche: 'Le vrai goût du Sénégal livré chez vous.',
      adresseMedia: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200',
      adresseVideo: 'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-42795-large.mp4',
      typeMedia: 'VIDEO',
      nombreJeaime: '1.2k',
      estAime: true,
      nombrePartages: 48
    },
    {
      identifiant: 'pub-02',
      identifiantRestaurant: 'resto-chez-habitant',
      nomRestaurant: "Chez L'Habitant",
      nomUtilisateurRestaurant: '@chezlhabitant',
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
      estAbonne: true,
      plat: {
        identifiant: 'plat-yassa-poulet',
        identifiantRestaurant: 'resto-chez-habitant',
        nomRestaurant: "Chez L'Habitant",
        nom: 'Yassa au Poulet Confit',
        description: 'Mariné au citron vert et oignons dorés caramélisés.',
        prixFcfa: 3000,
        adresseImage: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
        categorie: 'Poulet',
        statut: 'DISPONIBLE'
      },
      descriptionAccroche: 'Un délice citronné qui réveille vos papilles !',
      adresseMedia: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200',
      adresseVideo: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-delicious-dish-42798-large.mp4',
      typeMedia: 'VIDEO',
      nombreJeaime: '850',
      estAime: false,
      nombrePartages: 22
    },
    {
      identifiant: 'pub-03',
      identifiantRestaurant: 'resto-chez-habitant',
      nomRestaurant: "Chez L'Habitant",
      nomUtilisateurRestaurant: '@chezlhabitant',
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
      estAbonne: true,
      plat: {
        identifiant: 'plat-pastels',
        identifiantRestaurant: 'resto-chez-habitant',
        nomRestaurant: "Chez L'Habitant",
        nom: 'Pastels Dorés au Thon (6 pcs)',
        description: 'Petits chaussons croustillants servis avec sauce tomate pimentée maison.',
        prixFcfa: 1500,
        adresseImage: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400',
        categorie: 'Plats',
        statut: 'DISPONIBLE'
      },
      descriptionAccroche: 'Craquants à l’extérieur, fondants au thon à l’intérieur !',
      adresseMedia: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=1200',
      adresseVideo: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-chef-slicing-and-preparing-food-42796-large.mp4',
      typeMedia: 'VIDEO',
      nombreJeaime: '2.4k',
      estAime: true,
      nombrePartages: 63
    },
    {
      identifiant: 'pub-04',
      identifiantRestaurant: 'resto-aissatou-foot',
      nomRestaurant: 'Aissatou Foot',
      nomUtilisateurRestaurant: '@aissatoufood',
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
      estAbonne: false,
      plat: {
        identifiant: 'plat-aissatou-salade',
        identifiantRestaurant: 'resto-aissatou-foot',
        nomRestaurant: 'Aissatou Foot',
        nom: 'Bowl Gourmand Keur Massar',
        description: 'Patates douces rôties, graines torréfiées et fromage frais.',
        prixFcfa: 3500,
        adresseImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
        categorie: 'Plats',
        statut: 'DISPONIBLE'
      },
      descriptionAccroche: 'La fraîcheur absolue préparée chaque matin à Keur Massar.',
      adresseMedia: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200',
      adresseVideo: 'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-42795-large.mp4',
      typeMedia: 'VIDEO',
      nombreJeaime: '530',
      estAime: false,
      nombrePartages: 14
    }
  ]);

  /**
   * Plat actuellement sélectionné pour l'affichage de la fiche produit modale (Image 1).
   */
  readonly platSelectionnePourDetail = signal<Plat | null>(null);

  /**
   * Ouvre la modale de détail d'un plat.
   */
  ouvrirDetailPlat(plat: Plat): void {
    this.platSelectionnePourDetail.set(plat);
  }

  /**
   * Ferme la modale de détail du plat.
   */
  fermerDetailPlat(): void {
    this.platSelectionnePourDetail.set(null);
  }

  /**
   * Récupère un restaurant par son identifiant.
   */
  trouverRestaurantParId(identifiant: string): Restaurant | undefined {
    return this.restaurants().find((r) => r.identifiant === identifiant);
  }

  /**
   * Bascule l'état d'abonnement à un restaurant.
   */
  basculerAbonnementPublication(identifiantPublication: string): void {
    this.publicationsFil.update((pubs) =>
      pubs.map((p) => (p.identifiant === identifiantPublication ? { ...p, estAbonne: !p.estAbonne } : p))
    );
  }

  /**
   * Bascule le "J'aime" sur une publication.
   */
  basculerJaimePublication(identifiantPublication: string): void {
    this.publicationsFil.update((pubs) =>
      pubs.map((p) => (p.identifiant === identifiantPublication ? { ...p, estAime: !p.estAime } : p))
    );
  }

  /**
   * Publie une nouvelle vidéo depuis Ayyou Studio (Gérant restaurant) directement dans le fil d'actualité client.
   */
  publierVideoFil(publication: PublicationFil): void {
    this.publicationsFil.update((liste) => [publication, ...liste]);
  }
}

