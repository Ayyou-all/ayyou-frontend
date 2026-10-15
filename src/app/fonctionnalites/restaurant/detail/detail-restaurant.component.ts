import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PublicationFil } from '../../../socle/modeles/fil-actualite.modele';
import { Plat } from '../../../socle/modeles/plat.modele';
import { Restaurant } from '../../../socle/modeles/restaurant.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

@Component({
  selector: 'app-detail-restaurant',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail-restaurant.component.html'
})
export class DetailRestaurantComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly servicePanier = inject(ServicePanierService);
  readonly serviceAuthentification = inject(ServiceAuthentification);

  // Restaurant chargé directement par id
  readonly restaurantDirect = signal<Restaurant | null>(null);
  readonly chargementEnCours = signal<boolean>(false);

  // État d'abonnement et de like du restaurant
  readonly estAbonne = signal<boolean>(false);
  readonly estAime = signal<boolean>(false);
  readonly nombreAbonnes = signal<number>(0);
  readonly nombreLikes = signal<number>(0);
  readonly nombreLikesVideos = signal<number>(0);

  // Vidéos publiées par ce restaurant
  readonly videosRestaurant = signal<PublicationFil[]>([]);
  readonly chargementVideosEnCours = signal<boolean>(false);

  // Lecteur vidéo plein écran style TikTok
  readonly lecteurTikTokOuvert = signal<boolean>(false);
  readonly indexVideoCourante = signal<number>(0);
  readonly videoCourante = computed<PublicationFil | null>(() => {
    const vids = this.videosRestaurant();
    const idx = this.indexVideoCourante();
    return vids[idx] ?? null;
  });
  readonly estEnLecture = signal<boolean>(true);
  readonly estEnSourdine = signal<boolean>(false);

  private touchStartY = 0;
  private touchStartTime = 0;
  private dernierChangementMolette = 0;

  // Onglet interne actif : 'MENU' ou 'VIDEOS'
  readonly ongletActif = signal<'MENU' | 'VIDEOS'>('MENU');

  // Restaurant courant
  readonly restaurant = computed<Restaurant | null>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return this.serviceCatalogue.restaurants()[0] ?? null;
    return (
      this.restaurantDirect() ??
      this.serviceCatalogue.trouverRestaurantParId(id) ??
      this.serviceCatalogue.restaurants().find((r) => r.identifiant === id) ??
      this.serviceCatalogue.restaurants()[0] ??
      null
    );
  });

  // Plats du restaurant
  readonly listePlats = computed<Plat[]>(() => {
    const r = this.restaurant();
    if (!r) return [];
    if (r.plats && r.plats.length > 0) return r.plats;
    return this.serviceCatalogue.plats().filter((p) => p.identifiantRestaurant === r.identifiant);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.chargementEnCours.set(true);
      this.http.get<any>(`${environment.apiUrl}/etablissements/${id}/`).subscribe({
        next: (resto) => {
          if (resto) {
            const adapte = this.serviceCatalogue.adapterRestaurant(resto);
            this.restaurantDirect.set(adapte);
            this.estAbonne.set(Boolean(adapte.estAbonne));
            this.estAime.set(Boolean(adapte.estAime));
            this.nombreAbonnes.set(Number(adapte.nombreAbonnes || 0));
            this.nombreLikes.set(Number(adapte.nombreLikes || 0));
            this.nombreLikesVideos.set(Number(adapte.nombreLikesVideos || 0));
          }
          this.chargementEnCours.set(false);
        },
        error: () => {
          this.chargementEnCours.set(false);
        }
      });

      // Charger les vidéos réelles publiées par ce restaurant
      this.chargementVideosEnCours.set(true);
      this.serviceCatalogue.chargerVideosRestaurant(id).subscribe({
        next: (videos) => {
          this.videosRestaurant.set(videos);
          this.chargementVideosEnCours.set(false);
        },
        error: () => {
          this.chargementVideosEnCours.set(false);
        }
      });
    }
  }

  // Message temporaire
  readonly notificationPanier = signal<string | null>(null);

  /**
   * Ouvre le lecteur vidéo immersif style TikTok pour une vidéo donnée.
   */
  ouvrirLecteurTikTok(index: number): void {
    this.indexVideoCourante.set(index);
    this.estEnLecture.set(true);
    this.lecteurTikTokOuvert.set(true);
  }

  /**
   * Ferme le lecteur vidéo TikTok.
   */
  fermerLecteurTikTok(): void {
    this.lecteurTikTokOuvert.set(false);
  }

  /**
   * Passe à la vidéo suivante.
   */
  videoSuivante(): void {
    const total = this.videosRestaurant().length;
    if (total <= 1) return;
    this.indexVideoCourante.update((idx) => (idx + 1) % total);
    this.estEnLecture.set(true);
  }

  /**
   * Revient à la vidéo précédente.
   */
  videoPrecedente(): void {
    const total = this.videosRestaurant().length;
    if (total <= 1) return;
    this.indexVideoCourante.update((idx) => (idx - 1 + total) % total);
    this.estEnLecture.set(true);
  }

  /**
   * Bascule lecture / pause sur la vidéo en cours.
   */
  basculerLecture(el?: HTMLVideoElement): void {
    const video = el || (typeof document !== 'undefined' ? document.querySelector<HTMLVideoElement>('#lecteur-modal-tiktok video') : null);
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
        this.estEnLecture.set(true);
      } else {
        video.pause();
        this.estEnLecture.set(false);
      }
    } else {
      this.estEnLecture.update((v) => !v);
    }
  }

  /**
   * Bascule le son (muet / activé).
   */
  basculerSon(): void {
    this.estEnSourdine.update((v) => !v);
  }

  /**
   * Début de toucher (swipe tactile).
   */
  gererDebutToucher(evenement: TouchEvent): void {
    this.touchStartY = evenement.touches[0].clientY;
    this.touchStartTime = Date.now();
  }

  /**
   * Fin de toucher (swipe tactile).
   */
  gererFinToucher(evenement: TouchEvent): void {
    const touchEndY = evenement.changedTouches[0].clientY;
    const differenceY = touchEndY - this.touchStartY;
    const duree = Date.now() - this.touchStartTime;
    if (duree < 600 && Math.abs(differenceY) > 40) {
      if (differenceY < 0) {
        this.videoSuivante();
      } else {
        this.videoPrecedente();
      }
    }
  }

  /**
   * Molette souris pour défiler les vidéos comme sur TikTok Desktop.
   */
  gererMolette(evenement: WheelEvent): void {
    const maintenant = Date.now();
    if (maintenant - this.dernierChangementMolette < 350) return;
    if (Math.abs(evenement.deltaY) > 20) {
      this.dernierChangementMolette = maintenant;
      if (evenement.deltaY > 0) {
        this.videoSuivante();
      } else {
        this.videoPrecedente();
      }
    }
  }

  /**
   * Raccourcis clavier (Flèches, Espace, Échap).
   */
  @HostListener('window:keydown', ['$event'])
  gererToucheClavier(evenement: KeyboardEvent): void {
    if (!this.lecteurTikTokOuvert()) return;
    if (evenement.key === 'Escape') {
      this.fermerLecteurTikTok();
    } else if (evenement.key === 'ArrowDown' || evenement.key === 'PageDown') {
      evenement.preventDefault();
      this.videoSuivante();
    } else if (evenement.key === 'ArrowUp' || evenement.key === 'PageUp') {
      evenement.preventDefault();
      this.videoPrecedente();
    } else if (evenement.key === ' ' && evenement.target === document.body) {
      evenement.preventDefault();
      this.basculerLecture();
    }
  }

  /**
   * Bascule l'abonnement à ce restaurant via l'API.
   */
  basculerAbonnement(): void {
    const resto = this.restaurant();
    if (!resto) return;
    const nomResto = resto.nom;

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'ABONNEMENT',
        () => this.basculerAbonnement(),
        {
          titre: `S'abonner à ${nomResto}`,
          description: `Connectez-vous pour vous abonner à ${nomResto} et être informé de sa carte et de ses promotions.`
        }
      );
      return;
    }

    this.serviceCatalogue.basculerAbonnementRestaurant(resto.identifiant).subscribe({
      next: (res) => {
        const abonne = res?.estAbonne ?? !this.estAbonne();
        this.estAbonne.set(abonne);
        if (res?.nombreAbonnes !== undefined) {
          this.nombreAbonnes.set(res.nombreAbonnes);
        }
        this.notificationPanier.set(abonne ? `Abonné à ${nomResto} !` : `Désabonné de ${nomResto}`);
        setTimeout(() => this.notificationPanier.set(null), 2500);
      },
      error: () => {
        this.notificationPanier.set('Action impossible. Veuillez vous reconnecter.');
        setTimeout(() => this.notificationPanier.set(null), 2500);
      }
    });
  }

  /**
   * Bascule la mention J'aime du restaurant via l'API.
   */
  basculerLikeRestaurant(): void {
    const resto = this.restaurant();
    if (!resto) return;
    const nomResto = resto.nom;

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'LIKE',
        () => this.basculerLikeRestaurant(),
        {
          titre: `Aimer ${nomResto}`,
          description: `Connectez-vous pour aimer ${nomResto} et soutenir vos restaurateurs favoris.`
        }
      );
      return;
    }

    this.serviceCatalogue.basculerLikeRestaurant(resto.identifiant).subscribe({
      next: (res) => {
        const aime = res?.estAime ?? !this.estAime();
        this.estAime.set(aime);
        if (res?.nombreLikes !== undefined) {
          this.nombreLikes.set(res.nombreLikes);
        }
        this.notificationPanier.set(aime ? `Vous aimez ${nomResto} ! ❤️` : `Mention j'aime retirée`);
        setTimeout(() => this.notificationPanier.set(null), 2500);
      },
      error: () => {
        this.notificationPanier.set('Action impossible. Veuillez vous reconnecter.');
        setTimeout(() => this.notificationPanier.set(null), 2500);
      }
    });
  }

  /**
   * Bascule le J'aime sur une vidéo spécifique de ce restaurant.
   */
  basculerLikeVideo(video: PublicationFil, event?: Event): void {
    if (event) event.stopPropagation();

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification('LIKE', () => this.basculerLikeVideo(video));
      return;
    }

    this.serviceCatalogue.basculerJaimePublication(video.identifiant);
    this.videosRestaurant.update((vids) =>
      vids.map((v) =>
        v.identifiant === video.identifiant
          ? {
              ...v,
              estAime: !v.estAime,
              nombreJeaime: String(Math.max(0, Number(v.nombreJeaime || 0) + (v.estAime ? -1 : 1)))
            }
          : v
      )
    );
  }

  /**
   * Ajoute un plat au panier.
   * En mode visiteur, exige la connexion au préalable.
   */
  ajouterAuPanier(plat: Plat): void {
    if (plat.statut === 'INDISPONIBLE') {
      return;
    }

    const resto = this.restaurant();
    const nomResto = resto?.nom || plat.nomRestaurant || 'ce restaurant';

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'COMMANDE',
        () => this.ajouterAuPanier(plat),
        {
          titre: `Commander ${plat.nom}`,
          description: `Connectez-vous pour ajouter ce plat à votre panier et commander chez ${nomResto}.`
        }
      );
      return;
    }

    this.servicePanier.ajouterPlat(plat, 1);
  }

  /**
   * Retourne à la page précédente.
   */
  retourner(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.routeur.navigate(['/catalogue']);
    }
  }

  /**
   * Partager la page du restaurant.
   * En mode visiteur, exige la connexion au préalable.
   */
  partager(): void {
    const resto = this.restaurant();
    const nomResto = resto?.nom || 'ce restaurant';
    const descResto = resto?.description || '';

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'PARTAGE',
        () => this.partager(),
        {
          titre: `Partager ${nomResto}`,
          description: `Connectez-vous pour partager ce restaurant avec vos proches et amis.`
        }
      );
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: nomResto,
        text: descResto,
        url: window.location.href
      }).catch(() => {});
    } else {
      this.notificationPanier.set('Lien copié dans le presse-papier !');
      setTimeout(() => this.notificationPanier.set(null), 2000);
    }
  }
}
