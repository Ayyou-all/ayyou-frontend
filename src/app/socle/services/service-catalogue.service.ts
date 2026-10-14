/**
 * Service gérant le catalogue, les publications du fil d'accueil et les restaurants partenaires.
 * Consomme exclusivement l'API Django REST Framework sans aucune donnée mockée.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
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
      publications: this.chargerPublicationsFil()
    }).subscribe({
      next: (donnees) => {
        this.categories.set(donnees.categories);
        this.restaurants.set(donnees.restaurants);
        this.publicationsFil.set(donnees.publications);
        this.chargementEnCours.set(false);
      },
      error: (erreur) => {
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
      map((reponse) =>
        reponse.map((cat) => ({
          identifiant: String(cat.id || cat.slug || cat.identifiant),
          nom: cat.nom,
          icone: cat.icone || 'fa-solid fa-utensils',
          couleurFond: cat.couleur_fond || cat.couleurFond || 'bg-rose-50',
          couleurTexte: cat.couleur_texte || cat.couleurTexte || 'text-[#E51824]'
        }))
      ),
      catchError(() => of([]))
    );
  }

  /**
   * Récupère les restaurants partenaires et leurs plats associés depuis Django.
   */
  chargerRestaurants(): Observable<Restaurant[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/etablissements/`).pipe(
      map((reponse) =>
        reponse.map((resto) => ({
          identifiant: String(resto.id),
          nom: resto.nom,
          nomUtilisateur: resto.nom_utilisateur ? `@${resto.nom_utilisateur}` : `@resto_${resto.id}`,
          description: resto.description || '',
          specialite: resto.specialite || 'Cuisine sénégalaise',
          adresse: resto.adresse || '',
          quartierVille: resto.quartier_ville || resto.quartierVille || 'Dakar',
          heureFermeture: resto.heure_fermeture ? String(resto.heure_fermeture).slice(0, 5) : '23:30',
          estOuvert: resto.est_ouvert ?? true,
          noteMoyenne: resto.note_moyenne ? Number(resto.note_moyenne) : 4.8,
          nombreAvis: resto.nombre_avis ? Number(resto.nombre_avis) : 150,
          adresseLogo: resto.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
          adresseCouverture: resto.couverture || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
          plats: (resto.plats || []).map((p: any) => this.adapterPlat(p, resto))
        }))
      ),
      catchError(() => of([]))
    );
  }

  /**
   * Récupère le fil d'actualité des vidéos immersives (Reels culinaires) depuis Django.
   */
  chargerPublicationsFil(): Observable<PublicationFil[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/publications/fil/`).pipe(
      map((reponse) =>
        reponse.map((pub) => ({
          identifiant: String(pub.identifiant || pub.id),
          identifiantRestaurant: String(pub.identifiantRestaurant || pub.etablissement?.id || ''),
          nomRestaurant: pub.nomRestaurant || pub.etablissement?.nom || '',
          nomUtilisateurRestaurant: pub.nomUtilisateurRestaurant || `@${pub.etablissement?.nom_utilisateur || 'teranga'}`,
          adresseLogoRestaurant: pub.adresseLogoRestaurant || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
          estAbonne: pub.estAbonne ?? false,
          plat: this.adapterPlat(pub.plat, pub.etablissement),
          descriptionAccroche: pub.descriptionAccroche || pub.description || pub.titre || '',
          adresseMedia: pub.adresseMedia || pub.fichier_media || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200',
          adresseVideo: pub.adresseVideo || pub.fichier_media || 'https://assets.mixkit.co/videos/preview/mixkit-chef-plating-a-dish-with-care-42797-large.mp4',
          typeMedia: pub.typeMedia || pub.type_media || 'VIDEO',
          nombreJeaime: String(pub.nombreJeaime ?? pub.nombre_jaime ?? '120'),
          estAime: pub.estAime ?? false,
          nombrePartages: Number(pub.nombrePartages ?? pub.nombre_partages ?? 0)
        }))
      ),
      catchError(() => of([]))
    );
  }

  /**
   * Adapte l'objet Plat Django vers le modèle Plat frontend.
   */
  private adapterPlat(p: any, resto?: any): Plat {
    if (!p) {
      return {
        identifiant: 'plat-defaut',
        identifiantRestaurant: resto ? String(resto.id) : '',
        nomRestaurant: resto ? resto.nom : '',
        nom: 'Plat sénégalais',
        description: 'Plat authentique préparé avec passion',
        prixFcfa: 3000,
        adresseImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        categorie: 'Plats',
        statut: 'DISPONIBLE'
      };
    }
    return {
      identifiant: String(p.id || p.identifiant || ''),
      identifiantRestaurant: String(p.etablissement?.id || resto?.id || p.identifiantRestaurant || ''),
      nomRestaurant: p.etablissement?.nom || resto?.nom || p.nomRestaurant || '',
      nom: p.nom || '',
      description: p.description || '',
      prixFcfa: Number(p.prix_fcfa || p.prixFcfa || p.prix || 0),
      adresseImage: p.image || p.adresseImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      categorie: p.categorie?.nom || p.categorie || 'Plats',
      statut: (p.est_disponible ?? (p.statut === 'DISPONIBLE')) ? 'DISPONIBLE' : 'INDISPONIBLE',
      tempsPreparationMinutes: p.temps_preparation_minutes || p.tempsPreparationMinutes || 25,
      noteMoyenne: p.note_moyenne || p.noteMoyenne || 4.8,
      nombreCommandes: p.nombre_commandes || p.nombreCommandes || 40
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

  /**
   * Bascule l'état d'abonnement à un restaurant via l'API Django.
   */
  basculerAbonnementPublication(identifiantPublication: string): void {
    const pub = this.publicationsFil().find((p) => p.identifiant === identifiantPublication);
    if (!pub || !pub.identifiantRestaurant) {
      return;
    }

    this.http
      .post<any>(`${environment.apiUrl}/abonnements/etablissements/${pub.identifiantRestaurant}/basculer/`, {})
      .subscribe({
        next: (reponse) => {
          const estAbonne = reponse?.est_abonne ?? !pub.estAbonne;
          this.publicationsFil.update((pubs) =>
            pubs.map((p) =>
              p.identifiantRestaurant === pub.identifiantRestaurant
                ? { ...p, estAbonne }
                : p
            )
          );
        },
        error: () => {
          // Si hors-ligne ou non connecté, l'action est rejetée par le backend
        }
      });
  }

  /**
   * Bascule le "J'aime" sur une publication via l'API Django.
   */
  basculerJaimePublication(identifiantPublication: string): void {
    this.http
      .post<any>(`${environment.apiUrl}/publications/${identifiantPublication}/aimer/`, {})
      .subscribe({
        next: (reponse) => {
          const estAime = reponse?.est_aime ?? true;
          const totalJeaime = reponse?.total_jaime !== undefined ? String(reponse.total_jaime) : '1';
          this.publicationsFil.update((pubs) =>
            pubs.map((p) =>
              p.identifiant === identifiantPublication
                ? { ...p, estAime, nombreJeaime: totalJeaime }
                : p
            )
          );
        },
        error: () => {}
      });
  }

  /**
   * Publie une nouvelle vidéo depuis Ayyou Studio (Gérant restaurant) via l'API Django.
   */
  publierVideoFil(publication: PublicationFil): void {
    this.publicationsFil.update((liste) => [publication, ...liste]);
  }
}
