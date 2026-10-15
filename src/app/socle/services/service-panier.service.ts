/**
 * Service réactif de gestion des paniers multi-restaurants AYYOU.
 * Permet de gérer les commandes séparées par établissement conformément aux maquettes.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { MethodePaiement, PanierRestaurant } from '../modeles/panier.modele';
import { Plat } from '../modeles/plat.modele';
import { ServiceCatalogueService } from './service-catalogue.service';

@Injectable({
  providedIn: 'root'
})
export class ServicePanierService {
  private readonly serviceCatalogue = inject(ServiceCatalogueService, { optional: true });

  // Liste réactive des paniers par restaurant (démarre vide sans données mockées)
  readonly listePaniersRestaurants = signal<PanierRestaurant[]>([]);

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
      // Création du panier pour ce restaurant avec ses vraies informations
      const resto = this.serviceCatalogue?.trouverRestaurant(plat.identifiantRestaurant);
      panierResto = {
        identifiantRestaurant: plat.identifiantRestaurant,
        nomRestaurant: resto?.nom || plat.nomRestaurant || 'Restaurant',
        adresseLogoRestaurant: resto?.adresseLogo || '',
        delaiLivraison: resto?.delaiLivraisonMinutes ? `${resto.delaiLivraisonMinutes} min` : '20-30 min',
        adresseLivraison: '',
        methodePaiement: 'WAVE',
        lignes: [],
        sousTotalFcfa: 0,
        fraisLivraisonFcfa: resto?.fraisLivraisonFcfa ?? 1000,
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

  supprimerPanier(identifiantRestaurant: string): void {
    this.viderPanierRestaurant(identifiantRestaurant);
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
