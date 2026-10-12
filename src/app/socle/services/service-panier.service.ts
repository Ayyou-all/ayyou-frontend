/**
 * Service réactif de gestion des paniers multi-restaurants AYYOU.
 * Permet de gérer les commandes séparées par établissement conformément aux maquettes.
 */

import { Injectable, computed, signal } from '@angular/core';
import { MethodePaiement, PanierRestaurant } from '../modeles/panier.modele';
import { Plat } from '../modeles/plat.modele';

@Injectable({
  providedIn: 'root'
})
export class ServicePanierService {
  // Liste des paniers par restaurant (pré-remplie conformément aux maquettes : Chez Fatou, Chez Aissatou, Le Grill)
  readonly listePaniersRestaurants = signal<PanierRestaurant[]>([
    {
      identifiantRestaurant: 'resto-chez-fatou',
      nomRestaurant: 'Chez Fatou',
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      delaiLivraison: '25-35 min',
      adresseLivraison: 'Plateau, Avenue Hassan II',
      methodePaiement: 'WAVE',
      noteRestaurant: '',
      lignes: [
        {
          plat: {
            identifiant: 'plat-thieb-fatou',
            identifiantRestaurant: 'resto-chez-fatou',
            nomRestaurant: 'Chez Fatou',
            nom: 'Thieboudienne Royal',
            description: 'Riz rouge, Mérou frais, légumes du jour et sauce gombo onctueuse.',
            prixFcfa: 3500,
            adresseImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            categorie: 'Plats',
            statut: 'DISPONIBLE'
          },
          quantite: 1
        },
        {
          plat: {
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
          quantite: 2
        }
      ],
      sousTotalFcfa: 5500,
      fraisLivraisonFcfa: 1000,
      totalFcfa: 6500
    },
    {
      identifiantRestaurant: 'resto-chez-aissatou',
      nomRestaurant: 'Chez Aissatou',
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
      delaiLivraison: '25-35 min',
      adresseLivraison: 'Keur Massar, Rond point 6',
      methodePaiement: 'WAVE',
      noteRestaurant: '',
      lignes: [
        {
          plat: {
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
          quantite: 1
        },
        {
          plat: {
            identifiant: 'plat-bissap-aissatou',
            identifiantRestaurant: 'resto-chez-aissatou',
            nomRestaurant: 'Chez Aissatou',
            nom: 'Bissap Frais',
            description: '50cl, fleur d’hibiscus du Sénégal.',
            prixFcfa: 1000,
            adresseImage: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
            categorie: 'Boissons',
            statut: 'DISPONIBLE'
          },
          quantite: 4
        }
      ],
      sousTotalFcfa: 7500,
      fraisLivraisonFcfa: 1000,
      totalFcfa: 8500
    },
    {
      identifiantRestaurant: 'resto-le-grill',
      nomRestaurant: 'Le Grill',
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      delaiLivraison: '30-40 min',
      adresseLivraison: 'Almadies, Corniche Ouest',
      methodePaiement: 'ORANGE_MONEY',
      noteRestaurant: '',
      lignes: [
        {
          plat: {
            identifiant: 'plat-grill-brochettes',
            identifiantRestaurant: 'resto-le-grill',
            nomRestaurant: 'Le Grill',
            nom: 'Brochettes de bœuf dibiterie',
            description: 'Assaisonnées aux oignons pimentés et moutarde.',
            prixFcfa: 4000,
            adresseImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
            categorie: 'Plats',
            statut: 'DISPONIBLE'
          },
          quantite: 1
        }
      ],
      sousTotalFcfa: 4000,
      fraisLivraisonFcfa: 1000,
      totalFcfa: 5000
    }
  ]);

  // Nombre de paniers actifs (ex: 3 pour "Mes paniers 3")
  readonly nombrePaniersActifs = computed(() => {
    return this.listePaniersRestaurants().filter((p) => p.lignes.length > 0).length;
  });

  // Total de tous les articles à travers tous les paniers
  readonly nombreTotalArticles = computed(() => {
    return this.listePaniersRestaurants().reduce((acc, p) => {
      return acc + p.lignes.reduce((sub, l) => sub + l.quantite, 0);
    }, 0);
  });

  // Somme totale financière de tous les paniers
  readonly totalFcfa = computed(() => {
    return this.listePaniersRestaurants().reduce((acc, p) => acc + p.totalFcfa, 0);
  });

  readonly panierEstVide = computed(() => this.nombrePaniersActifs() === 0);

  /**
   * Trouve le panier d'un restaurant spécifique.
   */
  trouverPanierRestaurant(identifiantRestaurant: string): PanierRestaurant | undefined {
    return this.listePaniersRestaurants().find((p) => p.identifiantRestaurant === identifiantRestaurant);
  }

  /**
   * Ajoute un plat au panier d'un restaurant (ou crée le panier du restaurant s'il n'existe pas encore).
   */
  ajouterPlat(plat: Plat, quantite: number = 1, instructionsSpeciales?: string): void {
    if (plat.statut === 'INDISPONIBLE') {
      return;
    }

    const paniers = [...this.listePaniersRestaurants()];
    let panierResto = paniers.find((p) => p.identifiantRestaurant === plat.identifiantRestaurant);

    if (!panierResto) {
      // Création du panier pour ce nouveau restaurant
      panierResto = {
        identifiantRestaurant: plat.identifiantRestaurant,
        nomRestaurant: plat.nomRestaurant,
        adresseLogoRestaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
        delaiLivraison: '25-35 min',
        adresseLivraison: 'Plateau, Avenue Hassan II',
        methodePaiement: 'WAVE',
        lignes: [],
        sousTotalFcfa: 0,
        fraisLivraisonFcfa: 1000,
        totalFcfa: 0
      };
      paniers.unshift(panierResto);
    }

    const indexLigne = panierResto.lignes.findIndex((l) => l.plat.identifiant === plat.identifiant);
    if (indexLigne >= 0) {
      panierResto.lignes[indexLigne] = {
        ...panierResto.lignes[indexLigne],
        quantite: panierResto.lignes[indexLigne].quantite + quantite,
        instructionsSpeciales: instructionsSpeciales ?? panierResto.lignes[indexLigne].instructionsSpeciales
      };
    } else {
      panierResto.lignes.push({
        plat,
        quantite,
        instructionsSpeciales
      });
    }

    this.recalculerTotauxPanier(panierResto);
    this.listePaniersRestaurants.set([...paniers]);
  }

  /**
   * Modifie la quantité d'un article dans le panier d'un restaurant.
   */
  modifierQuantiteArticle(identifiantRestaurant: string, identifiantPlat: string, delta: number): void {
    const paniers = [...this.listePaniersRestaurants()];
    const panier = paniers.find((p) => p.identifiantRestaurant === identifiantRestaurant);
    if (!panier) return;

    const indexLigne = panier.lignes.findIndex((l) => l.plat.identifiant === identifiantPlat);
    if (indexLigne >= 0) {
      const nouvelleQuantite = panier.lignes[indexLigne].quantite + delta;
      if (nouvelleQuantite > 0) {
        panier.lignes[indexLigne].quantite = nouvelleQuantite;
      } else {
        panier.lignes.splice(indexLigne, 1);
      }
      this.recalculerTotauxPanier(panier);
      this.listePaniersRestaurants.set([...paniers]);
    }
  }

  /**
   * Supprime un article spécifique.
   */
  supprimerArticle(identifiantRestaurant: string, identifiantPlat: string): void {
    const paniers = [...this.listePaniersRestaurants()];
    const panier = paniers.find((p) => p.identifiantRestaurant === identifiantRestaurant);
    if (!panier) return;

    panier.lignes = panier.lignes.filter((l) => l.plat.identifiant !== identifiantPlat);
    this.recalculerTotauxPanier(panier);
    this.listePaniersRestaurants.set([...paniers]);
  }

  /**
   * Vide l'ensemble des articles d'un restaurant spécifique.
   */
  viderPanierRestaurant(identifiantRestaurant: string): void {
    const paniers = this.listePaniersRestaurants().filter((p) => p.identifiantRestaurant !== identifiantRestaurant);
    this.listePaniersRestaurants.set(paniers);
  }

  /**
   * Vide tous les paniers.
   */
  viderTousLesPaniers(): void {
    this.listePaniersRestaurants.set([]);
  }

  /**
   * Modifie la méthode de paiement sélectionnée pour un restaurant (Wave ou Orange Money).
   */
  definirMethodePaiement(identifiantRestaurant: string, methode: MethodePaiement): void {
    const paniers = [...this.listePaniersRestaurants()];
    const panier = paniers.find((p) => p.identifiantRestaurant === identifiantRestaurant);
    if (panier) {
      panier.methodePaiement = methode;
      this.listePaniersRestaurants.set(paniers);
    }
  }

  /**
   * Enregistre la note / consigne au restaurant.
   */
  definirNoteRestaurant(identifiantRestaurant: string, note: string): void {
    const paniers = [...this.listePaniersRestaurants()];
    const panier = paniers.find((p) => p.identifiantRestaurant === identifiantRestaurant);
    if (panier) {
      panier.noteRestaurant = note;
      this.listePaniersRestaurants.set(paniers);
    }
  }

  /**
   * Recalcule le sous-total et le total d'un panier de restaurant.
   */
  private recalculerTotauxPanier(panier: PanierRestaurant): void {
    panier.sousTotalFcfa = panier.lignes.reduce((acc, l) => acc + l.plat.prixFcfa * l.quantite, 0);
    panier.fraisLivraisonFcfa = panier.sousTotalFcfa > 0 ? 1000 : 0;
    panier.totalFcfa = panier.sousTotalFcfa + panier.fraisLivraisonFcfa;
  }
}
