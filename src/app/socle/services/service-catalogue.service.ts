/**
 * Service gérant le catalogue, les publications du fil d'accueil et les restaurants partenaires.
 * Consomme exclusivement l'API Django REST Framework sans aucune donnée mockée.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, expand, forkJoin, map, reduce, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicationFil } from '../modeles/fil-actualite.modele';
import { Plat } from '../modeles/plat.modele';
import { CategorieRestaurant, Restaurant } from '../modeles/restaurant.modele';

@Injectable({
  providedIn: 'root'
})
export class ServiceCatalogueService {
  private readonly http = inject(HttpClient);

  // État réactif du catalogue alimenté par l'API réelle
  readonly categories = signal<CategorieRestaurant[]>([]);
  readonly restaurants = signal<Restaurant[]>([]);
  readonly plats = signal<Plat[]>([]);
  readonly publicationsFil = signal<PublicationFil[]>([]);

  // États de chargement et d'erreur
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);

  // Plat actuellement sélectionné pour l'affichage de la fiche produit modale
  readonly platSelectionnePourDetail = signal<Plat | null>(null);

  constructor() {
    this.chargerTout();
  }

  /**
   * Charge l'ensemble des données du catalogue depuis l'API Django REST Framework.
   */
  chargerTout(): void {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);

    forkJoin({
      categories: this.chargerCategories(),
      restaurants: this.chargerRestaurants(),
      plats: this.chargerPlats(),
      publications: this.chargerPublicationsFil()
    }).subscribe({
      next: (donnees) => {
        const platsGlobal = donnees.plats;
        const restosComplets = donnees.restaurants.map((r) => {
          if (r.plats && r.plats.length > 0) return r;
          const platsDuResto = platsGlobal.filter((p) => p.identifiantRestaurant === r.identifiant);
          return { ...r, plats: platsDuResto };
        });

        this.categories.set(donnees.categories);
        this.restaurants.set(restosComplets);
        this.plats.set(platsGlobal);
        this.publicationsFil.set(donnees.publications);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.messageErreur.set('Impossible de charger le catalogue. Veuillez vérifier votre connexion au serveur.');
      }
    });
  }

  /**
   * Récupère la liste des catégories officielles depuis Django.
   */
  chargerCategories(): Observable<CategorieRestaurant[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/categories/`).pipe(
      map((reponse) => {
        const liste = Array.isArray(reponse) ? reponse : ((reponse as any)?.results || []);
        return liste.map((cat: any) => ({
          identifiant: String(cat.id || cat.slug || cat.identifiant),
          nom: cat.nom,
          icone: cat.icone || 'fa-solid fa-utensils',
          couleurFond: cat.couleur_fond || cat.couleurFond || 'bg-rose-50',
          couleurTexte: cat.couleur_texte || cat.couleurTexte || 'text-[#E51824]'
        }));
      })
    );
  }

  /**
   * Lit TOUTES les pages d'une liste paginée de l'API ({ results, next }) en suivant `next`.
   * Limite de sécurité : `pagesMax` pages (20 éléments par page côté serveur).
   * Une erreur est transmise à l'appelant (elle n'est plus remplacée par une liste vide).
   */
  private chargerToutesLesPages(url: string, pagesMax: number = 25): Observable<any[]> {
    let pagesLues = 0;
    return this.http.get<any>(url).pipe(
      expand((reponse) => {
        pagesLues += 1;
        return reponse?.next && pagesLues < pagesMax ? this.http.get<any>(reponse.next) : EMPTY;
      }),
      map((reponse) => (Array.isArray(reponse) ? reponse : reponse?.results || [])),
      reduce((tous: any[], page: any[]) => [...tous, ...page], [])
    );
  }

  /**
   * Récupère les restaurants partenaires et leurs plats associés depuis Django.
   */
  chargerRestaurants(): Observable<Restaurant[]> {
    return this.chargerToutesLesPages(`${environment.apiUrl}/etablissements/`).pipe(
      map((liste) => liste.map((resto: any) => this.adapterRestaurant(resto)))
    );
  }

  /**
   * Récupère tous les plats réels actifs depuis Django.
   */
  chargerPlats(): Observable<Plat[]> {
    return this.chargerToutesLesPages(`${environment.apiUrl}/plats/`).pipe(map((liste) => liste.map((p: any) => this.adapterPlat(p))));
  }

  /**
   * Récupère le fil d'actualité des vidéos immersives (Reels culinaires) depuis Django.
   */
  chargerPublicationsFil(): Observable<PublicationFil[]> {
    // Le fil est limité aux 5 premières pages (100 vidéos) : seules les métadonnées sont chargées.
    return this.chargerToutesLesPages(`${environment.apiUrl}/publications/fil/`, 5).pipe(
      map((liste) => liste.map((pub: any) => this.adapterPublication(pub))),
      tap((pubs) => this.publicationsFil.set(pubs))
    );
  }

  /**
   * Récupère les vidéos publiées par un restaurant spécifique.
   */
  chargerVideosRestaurant(idRestaurant: string | number): Observable<PublicationFil[]> {
    return this.chargerToutesLesPages(`${environment.apiUrl}/publications/fil/?etablissement=${idRestaurant}`, 5).pipe(
      map((liste) => liste.map((pub: any) => this.adapterPublication(pub)))
    );
  }

  adapterPublication(pub: any): PublicationFil {
    return {
      identifiant: String(pub.identifiant || pub.id),
      identifiantRestaurant: String(pub.identifiantRestaurant || pub.etablissement?.id || pub.etablissement_id || ''),
      nomRestaurant: pub.nomRestaurant || pub.etablissement?.nom || '',
      nomUtilisateurRestaurant: pub.nomUtilisateurRestaurant || (pub.etablissement?.nom_utilisateur ? `@${pub.etablissement.nom_utilisateur}` : ''),
      adresseLogoRestaurant: pub.adresseLogoRestaurant || pub.etablissement?.adresse_logo || pub.etablissement?.logo || '',
      estAbonne: pub.estAbonne ?? pub.est_abonne ?? false,
      plat: this.adapterPlat(pub.plat, pub.etablissement),
      descriptionAccroche: pub.descriptionAccroche || pub.description || pub.titre || '',
      adresseMedia: pub.adresseMedia || pub.image_miniature || pub.fichier_media || '',
      adresseVideo: pub.adresseVideo || (pub.type_media === 'VIDEO' ? pub.fichier_media : '') || '',
      typeMedia: pub.typeMedia || pub.type_media || 'VIDEO',
      nombreJeaime: String(pub.nombreJeaime ?? '0'),
      nombreVues: Number(pub.nombreVues ?? 0),
      estAime: pub.estAime ?? pub.est_aime ?? false,
      nombrePartages: Number(pub.nombrePartages ?? pub.nombre_partages ?? 0)
    };
  }

  /**
   * Adapte l'objet Etablissement Django vers le modèle Restaurant frontend.
   */
  adapterRestaurant(resto: any): Restaurant {
    return {
      identifiant: String(resto.id),
      nom: resto.nom,
      nomUtilisateur: resto.nom_utilisateur ? `@${resto.nom_utilisateur}` : `@resto_${resto.id}`,
      description: resto.description || '',
      specialite: resto.specialite || '',
      adresse: resto.adresse || '',
      quartierVille: resto.quartier_ville || '',
      heureFermeture: resto.heure_fermeture ? String(resto.heure_fermeture).slice(0, 5) : '',
      // Vrai seulement si le restaurant prend des commandes MAINTENANT (validé + ouvert + dans ses horaires)
      estOuvert: Boolean(resto.accepte_commandes),
      adresseLogo: resto.adresse_logo || resto.logo || '',
      adresseCouverture: resto.adresse_couverture || resto.couverture || '',
      delaiLivraisonTexte: resto.delai_livraison_texte || '',
      fraisLivraisonFcfa: Number(resto.frais_livraison_fcfa ?? 0),
      estAbonne: Boolean(resto.est_abonne),
      estAime: Boolean(resto.est_aime),
      nombreAbonnes: Number(resto.nombre_abonnes || 0),
      nombreLikes: Number(resto.nombre_likes || 0),
      nombreLikesVideos: Number(resto.nombre_likes_videos || resto.nombreLikesVideos || 0),
      plats: (resto.plats || []).map((p: any) => this.adapterPlat(p, resto))
    };
  }

  /**
   * Adapte l'objet Plat Django vers le modèle Plat frontend sans mocks.
   */
  adapterPlat(p: any, resto?: any): Plat {
    if (!p) {
      return {
        identifiant: '',
        identifiantRestaurant: resto ? String(resto.id) : '',
        nomRestaurant: resto ? resto.nom : '',
        nom: '',
        description: '',
        prixFcfa: 0,
        adresseImage: '',
        categorie: 'Plats',
        statut: 'DISPONIBLE'
      };
    }
    return {
      identifiant: String(p.id || p.identifiant || ''),
      identifiantRestaurant: String(p.identifiant_etablissement || p.etablissement?.id || resto?.id || p.identifiantRestaurant || ''),
      nomRestaurant: p.nom_etablissement || p.etablissement?.nom || resto?.nom || p.nomRestaurant || '',
      nom: p.nom || '',
      description: p.description || '',
      prixFcfa: Number(p.prix_fcfa || p.prixFcfa || p.prix || 0),
      adresseImage: p.adresse_image || p.adresseImage || p.image || '',
      categorie: p.categorie?.nom || p.categorie || 'Plats',
      statut: (p.est_disponible ?? (p.statut === 'DISPONIBLE')) ? 'DISPONIBLE' : 'INDISPONIBLE',
      tempsPreparationMinutes: p.temps_preparation_minutes ?? undefined,
      nombreCommandes: p.nombre_commandes || p.nombreCommandes || 0
    };
  }

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

  trouverRestaurant(identifiant: string): Restaurant | undefined {
    return this.trouverRestaurantParId(identifiant);
  }

  /**
   * Bascule l'état d'abonnement à un restaurant via l'API Django.
   */
  basculerAbonnementPublication(identifiantPublication: string): void {
    const pub = this.publicationsFil().find((p) => p.identifiant === identifiantPublication);
    if (!pub || !pub.identifiantRestaurant) {
      return;
    }

    this.basculerAbonnementRestaurant(pub.identifiantRestaurant).subscribe({
      next: (reponse) => {
        const estAbonne = reponse?.estAbonne ?? !pub.estAbonne;
        this.publicationsFil.update((pubs) =>
          pubs.map((p) =>
            p.identifiantRestaurant === pub.identifiantRestaurant
              ? { ...p, estAbonne }
              : p
          )
        );
      },
      error: () => this.messageErreur.set("Impossible de modifier l'abonnement. Vérifiez votre connexion.")
    });
  }

  /**
   * Bascule l'abonnement à un établissement partenaire.
   */
  basculerAbonnementRestaurant(idRestaurant: string | number): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/abonnements/${idRestaurant}/basculer/`, {}).pipe(
      tap((reponse) => {
        const estAbonne = reponse?.estAbonne ?? true;
        const nombreAbonnes = reponse?.nombreAbonnes;
        this.restaurants.update((restos) =>
          restos.map((r) =>
            r.identifiant === String(idRestaurant)
              ? { ...r, estAbonne, ...(nombreAbonnes !== undefined ? { nombreAbonnes } : {}) }
              : r
          )
        );
      })
    );
  }

  /**
   * Bascule la mention "J'aime" d'un établissement partenaire.
   */
  basculerLikeRestaurant(idRestaurant: string | number): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/abonnements/${idRestaurant}/aimer/`, {}).pipe(
      tap((reponse) => {
        const estAime = reponse?.estAime ?? true;
        const nombreLikes = reponse?.nombreLikes;
        this.restaurants.update((restos) =>
          restos.map((r) =>
            r.identifiant === String(idRestaurant)
              ? { ...r, estAime, ...(nombreLikes !== undefined ? { nombreLikes } : {}) }
              : r
          )
        );
      })
    );
  }

  /** Met à jour une publication du fil avec les valeurs renvoyées par le serveur. */
  private mettreAJourPublication(identifiant: string, changements: Partial<PublicationFil>): void {
    this.publicationsFil.update((pubs) => pubs.map((p) => (p.identifiant === identifiant ? { ...p, ...changements } : p)));
  }

  /**
   * J'aime / je n'aime plus : le compteur affiché est celui renvoyé par le serveur
   * (un seul like par personne, contrôlé en base).
   */
  basculerJaimePublication(identifiantPublication: string): Observable<{ estAime: boolean; nombreJeaime: string }> {
    return this.http.post<any>(`${environment.apiUrl}/publications/${identifiantPublication}/like/`, {}).pipe(
      map((reponse) => ({ estAime: Boolean(reponse.estAime), nombreJeaime: String(reponse.nombreJeaime) })),
      tap((resultat) => this.mettreAJourPublication(identifiantPublication, resultat))
    );
  }

  /** Enregistre une vue (le serveur ne compte qu'une vue par personne toutes les 6 heures). */
  enregistrerVue(identifiantPublication: string): void {
    this.http.post<any>(`${environment.apiUrl}/publications/${identifiantPublication}/vue/`, {}).subscribe({
      next: (reponse) => this.mettreAJourPublication(identifiantPublication, { nombreVues: Number(reponse.nombreVues) }),
      error: () => {
        // Une vue non enregistrée n'empêche pas de regarder la vidéo : pas de message à l'utilisateur.
      }
    });
  }

  /** Enregistre un partage réellement effectué (après le partage ou la copie du lien). */
  enregistrerPartage(identifiantPublication: string): void {
    this.http.post<any>(`${environment.apiUrl}/publications/${identifiantPublication}/partage/`, {}).subscribe({
      next: (reponse) => this.mettreAJourPublication(identifiantPublication, { nombrePartages: Number(reponse.nombrePartages) }),
      error: () => {
        // Le partage a eu lieu ; seul le compteur n'a pas pu être mis à jour.
      }
    });
  }

  /**
   * Publie une nouvelle vidéo depuis Ayyou Studio (Gérant restaurant) via l'API Django.
   */
  publierVideoFil(publication: PublicationFil): void {
    this.publicationsFil.update((liste) => [publication, ...liste]);
  }
}
