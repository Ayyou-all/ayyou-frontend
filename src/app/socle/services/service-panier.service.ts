/**
 * Service du panier multi-restaurants AYYOU.
 *
 * Source de vérité : l'API Django /api/panier/ (le panier survit au rafraîchissement,
 * à la fermeture du navigateur et à la reconnexion).
 *
 * Un visiteur non connecté peut remplir un panier temporaire en mémoire ;
 * dès qu'il se connecte en tant que client, ce panier est envoyé au serveur.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { concatMap, from } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MethodePaiement, PanierRestaurant } from '../modeles/panier.modele';
import { Plat } from '../modeles/plat.modele';
import { ServiceAuthentification } from './service-authentification.service';
import { ServiceCatalogueService } from './service-catalogue.service';

@Injectable({
  providedIn: 'root'
})
export class ServicePanierService {
  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);
  private readonly serviceCatalogue = inject(ServiceCatalogueService);
  private readonly urlPanier = `${environment.apiUrl}/panier/`;

  // Paniers regroupés par restaurant
  readonly listePaniersRestaurants = signal<PanierRestaurant[]>([]);
  readonly messageErreur = signal<string | null>(null);

  // Choix d'affichage propres à l'appareil (mode de paiement, note au restaurant)
  private readonly preferences = new Map<string, { methodePaiement: MethodePaiement; noteRestaurant?: string }>();

  readonly nombrePaniersActifs = computed(() => this.listePaniersRestaurants().filter((p) => p.lignes.length > 0).length);

  readonly nombreTotalArticles = computed(() =>
    this.listePaniersRestaurants().reduce((total, p) => total + p.lignes.reduce((s, l) => s + l.quantite, 0), 0)
  );

  // Montant des articles (hors frais de livraison, calculés au moment de commander)
  readonly totalFcfa = computed(() => this.listePaniersRestaurants().reduce((total, p) => total + p.sousTotalFcfa, 0));

  readonly panierEstVide = computed(() => this.nombrePaniersActifs() === 0);

  constructor() {
    // À la connexion d'un client : envoyer le panier temporaire au serveur puis charger le panier réel.
    effect(() => {
      const role = this.serviceAuth.utilisateurConnecte()?.role;
      untracked(() => {
        if (role === 'CLIENT') {
          this.synchroniserPanierTemporaire();
        } else if (role) {
          this.listePaniersRestaurants.set([]); // restaurant, livreur, admin : pas de panier
        }
      });
    });
  }

  private estClientConnecte(): boolean {
    return this.serviceAuth.utilisateurConnecte()?.role === 'CLIENT';
  }

  trouverPanierRestaurant(identifiantRestaurant: string): PanierRestaurant | undefined {
    return this.listePaniersRestaurants().find((p) => p.identifiantRestaurant === identifiantRestaurant);
  }

  // ---------------------------------------------------------------------------
  // Lecture du panier serveur
  // ---------------------------------------------------------------------------

  chargerPanier(): void {
    this.http.get<any>(this.urlPanier).subscribe({
      next: (reponse) => this.appliquerReponseServeur(reponse),
      error: () => this.messageErreur.set('Impossible de charger votre panier. Vérifiez votre connexion.')
    });
  }

  /** Convertit la réponse de l'API en paniers affichables. */
  private appliquerReponseServeur(reponse: any): void {
    this.messageErreur.set(null);
    const paniers: PanierRestaurant[] = (reponse.paniers_par_etablissement || []).map((groupe: any) => {
      const identifiant = String(groupe.identifiant_etablissement);
      const preference = this.preferences.get(identifiant);
      return {
        identifiantRestaurant: identifiant,
        nomRestaurant: groupe.nom_etablissement,
        adresseLogoRestaurant: groupe.adresse_logo_etablissement || '',
        delaiLivraison: groupe.delai_livraison || '',
        lignes: (groupe.lignes || []).map((ligne: any) => ({
          idLigne: ligne.id,
          plat: this.serviceCatalogue.adapterPlat(ligne.plat),
          quantite: ligne.quantite,
          instructionsSpeciales: ligne.instructions_speciales || ''
        })),
        methodePaiement: preference?.methodePaiement || 'WAVE',
        noteRestaurant: preference?.noteRestaurant,
        sousTotalFcfa: groupe.sous_total_fcfa,
        estCommandable: groupe.est_commandable,
        avertissements: groupe.avertissements || []
      };
    });
    this.listePaniersRestaurants.set(paniers);
  }

  private afficherErreur(erreur: any, messageParDefaut: string): void {
    this.messageErreur.set(erreur?.error?.message || messageParDefaut);
  }

  // ---------------------------------------------------------------------------
  // Modifications
  // ---------------------------------------------------------------------------

  ajouterPlat(plat: Plat, quantite: number = 1, instructionsSpeciales?: string): void {
    if (plat.statut === 'INDISPONIBLE') return;

    if (!this.estClientConnecte()) {
      this.ajouterAuPanierTemporaire(plat, quantite, instructionsSpeciales);
      return;
    }
    this.http
      .post<any>(`${this.urlPanier}lignes/`, {
        plat_id: Number(plat.identifiant),
        quantite,
        instructions_speciales: instructionsSpeciales || ''
      })
      .subscribe({
        next: (reponse) => this.appliquerReponseServeur(reponse),
        error: (erreur) => this.afficherErreur(erreur, "Impossible d'ajouter ce plat au panier.")
      });
  }

  modifierQuantiteArticle(identifiantRestaurant: string, identifiantPlat: string, delta: number): void {
    const ligne = this.trouverPanierRestaurant(identifiantRestaurant)?.lignes.find((l) => l.plat.identifiant === identifiantPlat);
    if (!ligne) return;
    const nouvelleQuantite = ligne.quantite + delta;
    if (nouvelleQuantite <= 0) {
      this.supprimerArticle(identifiantRestaurant, identifiantPlat);
      return;
    }

    if (!this.estClientConnecte() || !ligne.idLigne) {
      this.modifierPanierTemporaire(identifiantRestaurant, (lignes) =>
        lignes.map((l) => (l.plat.identifiant === identifiantPlat ? { ...l, quantite: nouvelleQuantite } : l))
      );
      return;
    }
    this.http.patch<any>(`${this.urlPanier}lignes/${ligne.idLigne}/`, { quantite: nouvelleQuantite }).subscribe({
      next: (reponse) => this.appliquerReponseServeur(reponse),
      error: (erreur) => this.afficherErreur(erreur, 'Impossible de modifier la quantité.')
    });
  }

  supprimerArticle(identifiantRestaurant: string, identifiantPlat: string): void {
    const ligne = this.trouverPanierRestaurant(identifiantRestaurant)?.lignes.find((l) => l.plat.identifiant === identifiantPlat);
    if (!ligne) return;

    if (!this.estClientConnecte() || !ligne.idLigne) {
      this.modifierPanierTemporaire(identifiantRestaurant, (lignes) => lignes.filter((l) => l.plat.identifiant !== identifiantPlat));
      return;
    }
    this.http.delete<any>(`${this.urlPanier}lignes/${ligne.idLigne}/`).subscribe({
      next: (reponse) => this.appliquerReponseServeur(reponse),
      error: (erreur) => this.afficherErreur(erreur, "Impossible de retirer l'article.")
    });
  }

  viderPanierRestaurant(identifiantRestaurant: string): void {
    if (!this.estClientConnecte()) {
      this.listePaniersRestaurants.update((paniers) => paniers.filter((p) => p.identifiantRestaurant !== identifiantRestaurant));
      return;
    }
    this.http.delete<any>(this.urlPanier, { params: { etablissement: identifiantRestaurant } }).subscribe({
      next: (reponse) => this.appliquerReponseServeur(reponse),
      error: (erreur) => this.afficherErreur(erreur, 'Impossible de vider ce panier.')
    });
  }

  /**
   * Après création d'une commande : le serveur a déjà vidé ce panier,
   * on recharge simplement l'état réel.
   */
  supprimerPanier(identifiantRestaurant: string): void {
    if (this.estClientConnecte()) {
      this.chargerPanier();
    } else {
      this.viderPanierRestaurant(identifiantRestaurant);
    }
  }

  viderTousLesPaniers(): void {
    if (!this.estClientConnecte()) {
      this.listePaniersRestaurants.set([]);
      return;
    }
    this.http.delete<any>(this.urlPanier).subscribe({
      next: (reponse) => this.appliquerReponseServeur(reponse),
      error: (erreur) => this.afficherErreur(erreur, 'Impossible de vider le panier.')
    });
  }

  definirMethodePaiement(identifiantRestaurant: string, methode: MethodePaiement): void {
    this.enregistrerPreference(identifiantRestaurant, { methodePaiement: methode });
  }

  definirNoteRestaurant(identifiantRestaurant: string, note: string): void {
    this.enregistrerPreference(identifiantRestaurant, { noteRestaurant: note });
  }

  private enregistrerPreference(
    identifiantRestaurant: string,
    changement: { methodePaiement?: MethodePaiement; noteRestaurant?: string }
  ): void {
    const actuelle = this.preferences.get(identifiantRestaurant) || { methodePaiement: 'WAVE' as MethodePaiement };
    this.preferences.set(identifiantRestaurant, { ...actuelle, ...changement });
    this.listePaniersRestaurants.update((paniers) =>
      paniers.map((p) => (p.identifiantRestaurant === identifiantRestaurant ? { ...p, ...changement } : p))
    );
  }

  // ---------------------------------------------------------------------------
  // Panier temporaire d'un visiteur non connecté
  // ---------------------------------------------------------------------------

  private ajouterAuPanierTemporaire(plat: Plat, quantite: number, instructions?: string): void {
    const existant = this.trouverPanierRestaurant(plat.identifiantRestaurant);
    if (!existant) {
      const restaurant = this.serviceCatalogue.trouverRestaurant(plat.identifiantRestaurant);
      this.listePaniersRestaurants.update((paniers) => [
        {
          identifiantRestaurant: plat.identifiantRestaurant,
          nomRestaurant: restaurant?.nom || plat.nomRestaurant,
          adresseLogoRestaurant: restaurant?.adresseLogo || '',
          delaiLivraison: restaurant?.delaiLivraisonTexte || '',
          lignes: [{ plat, quantite, instructionsSpeciales: instructions }],
          methodePaiement: 'WAVE',
          sousTotalFcfa: plat.prixFcfa * quantite,
          estCommandable: restaurant?.estOuvert ?? true,
          avertissements: []
        },
        ...paniers
      ]);
      return;
    }
    const dejaPresent = existant.lignes.some((l) => l.plat.identifiant === plat.identifiant);
    this.modifierPanierTemporaire(plat.identifiantRestaurant, (lignes) =>
      dejaPresent
        ? lignes.map((l) => (l.plat.identifiant === plat.identifiant ? { ...l, quantite: l.quantite + quantite } : l))
        : [...lignes, { plat, quantite, instructionsSpeciales: instructions }]
    );
  }

  /** Applique une modification aux lignes d'un panier temporaire et recalcule son sous-total. */
  private modifierPanierTemporaire(
    identifiantRestaurant: string,
    modifier: (lignes: PanierRestaurant['lignes']) => PanierRestaurant['lignes']
  ): void {
    this.listePaniersRestaurants.update((paniers) =>
      paniers
        .map((p) => {
          if (p.identifiantRestaurant !== identifiantRestaurant) return p;
          const lignes = modifier(p.lignes);
          return { ...p, lignes, sousTotalFcfa: lignes.reduce((s, l) => s + l.plat.prixFcfa * l.quantite, 0) };
        })
        .filter((p) => p.lignes.length > 0)
    );
  }

  /** Envoie au serveur les articles ajoutés avant connexion, puis charge le panier réel. */
  private synchroniserPanierTemporaire(): void {
    const lignesTemporaires = this.listePaniersRestaurants().flatMap((p) => p.lignes.filter((l) => !l.idLigne));
    if (lignesTemporaires.length === 0) {
      this.chargerPanier();
      return;
    }
    from(lignesTemporaires)
      .pipe(
        concatMap((ligne) =>
          this.http.post<any>(`${this.urlPanier}lignes/`, {
            plat_id: Number(ligne.plat.identifiant),
            quantite: ligne.quantite,
            instructions_speciales: ligne.instructionsSpeciales || ''
          })
        )
      )
      .subscribe({
        complete: () => this.chargerPanier(),
        error: () => {
          this.messageErreur.set("Certains articles n'ont pas pu être ajoutés à votre panier (plat indisponible ?).");
          this.chargerPanier();
        }
      });
  }
}
