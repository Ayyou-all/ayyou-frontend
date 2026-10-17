import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PublicationFil } from '../../socle/modeles/fil-actualite.modele';
import { Plat } from '../../socle/modeles/plat.modele';
import { ServiceAuthentification } from '../../socle/services/service-authentification.service';
import { ServiceCatalogueService } from '../../socle/services/service-catalogue.service';
import { ServicePanierService } from '../../socle/services/service-panier.service';
import { DetailProduitComponent } from '../catalogue/detail-produit/detail-produit.component';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule, RouterModule, DetailProduitComponent],
  templateUrl: './accueil.component.html'
})
export class AccueilComponent implements OnInit {
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly servicePanier = inject(ServicePanierService);
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly routeur = inject(Router);

  ngOnInit(): void {
    // Actualisation automatique du fil d'actualité pour récupérer les nouveaux Reels
    this.serviceCatalogue.chargerPublicationsFil().subscribe({
      error: () => this.serviceCatalogue.messageErreur.set('Impossible de charger les vidéos. Vérifiez votre connexion.')
    });
  }

  // Plat actuellement en consultation via le modal (Image 1)
  readonly platEnConsultation = signal<Plat | null>(null);

  // Index de la publication actuellement affichée
  readonly indexPublicationActuelle = signal<number>(0);

  // État du son et de la lecture vidéo
  readonly estEnSourdine = signal<boolean>(true);
  readonly estEnLecture = signal<boolean>(true);

  // Direction de l'animation lors du changement de vidéo
  readonly directionAnimation = signal<'HAUT' | 'BAS' | null>(null);

  // Message temporaire de notification
  readonly notificationAjoutPanier = signal<string | null>(null);

  // Coordonnée Y de départ pour la détection du geste de swipe tactile
  private touchStartY = 0;
  private touchStartTime = 0;
  private dernierChangementMolette = 0;

  @ViewChild('elementVideo') elementVideoRef?: ElementRef<HTMLVideoElement>;

  // Publication courante
  readonly publicationCourante = computed<PublicationFil | null>(() => {
    const publications = this.serviceCatalogue.publicationsFil();
    if (!publications || publications.length === 0) return null;
    const index = this.indexPublicationActuelle();
    return publications[index] ?? publications[0] ?? null;
  });

  readonly totalPublications = computed(() => this.serviceCatalogue.publicationsFil().length);

  /**
   * Passe à la vidéo suivante (swipe vers le haut).
   */
  publicationSuivante(): void {
    this.directionAnimation.set('HAUT');
    if (this.indexPublicationActuelle() < this.totalPublications() - 1) {
      this.indexPublicationActuelle.update((idx) => idx + 1);
    } else {
      this.indexPublicationActuelle.set(0);
    }
    this.reinitialiserVideo();
  }

  /**
   * Revient à la vidéo précédente (swipe vers le bas).
   */
  publicationPrecedente(): void {
    this.directionAnimation.set('BAS');
    if (this.indexPublicationActuelle() > 0) {
      this.indexPublicationActuelle.update((idx) => idx - 1);
    } else {
      this.indexPublicationActuelle.set(this.totalPublications() - 1);
    }
    this.reinitialiserVideo();
  }

  /**
   * Gestion du swipe tactile : début du contact.
   */
  gererDebutToucher(evenement: TouchEvent): void {
    this.touchStartY = evenement.touches[0].clientY;
    this.touchStartTime = Date.now();
  }

  /**
   * Gestion du swipe tactile : fin du contact et détection du sens.
   */
  gererFinToucher(evenement: TouchEvent): void {
    const touchEndY = evenement.changedTouches[0].clientY;
    const differenceY = touchEndY - this.touchStartY;
    const duree = Date.now() - this.touchStartTime;

    // Détection d'un swipe franc (au moins 40px en moins de 600ms)
    if (duree < 600 && Math.abs(differenceY) > 40) {
      if (differenceY < 0) {
        // Glissement vers le haut -> vidéo suivante
        this.publicationSuivante();
      } else {
        // Glissement vers le bas -> vidéo précédente
        this.publicationPrecedente();
      }
    }
  }

  /**
   * Gestion du défilement à la molette sur ordinateur de bureau (desktop swipe).
   */
  gererMolette(evenement: WheelEvent): void {
    evenement.preventDefault();
    const maintenant = Date.now();
    // Évite les déclenchements trop rapides (anti-rebond de 350ms)
    if (maintenant - this.dernierChangementMolette < 350) {
      return;
    }

    if (Math.abs(evenement.deltaY) > 20) {
      this.dernierChangementMolette = maintenant;
      if (evenement.deltaY > 0) {
        // Molette vers le bas -> vidéo suivante
        this.publicationSuivante();
      } else {
        // Molette vers le haut -> vidéo précédente
        this.publicationPrecedente();
      }
    }
  }

  /**
   * Gestion des touches du clavier (Flèche Haut / Bas, Espace).
   */
  @HostListener('window:keydown', ['$event'])
  gererToucheClavier(evenement: KeyboardEvent): void {
    if (evenement.key === 'ArrowDown' || evenement.key === 'PageDown') {
      evenement.preventDefault();
      this.publicationSuivante();
    } else if (evenement.key === 'ArrowUp' || evenement.key === 'PageUp') {
      evenement.preventDefault();
      this.publicationPrecedente();
    } else if (evenement.key === ' ' && evenement.target === document.body) {
      evenement.preventDefault();
      this.basculerLecture();
    }
  }

  /**
   * Bascule le son (coupé / activé).
   */
  basculerSon(): void {
    this.estEnSourdine.update((muet) => !muet);
    if (this.elementVideoRef?.nativeElement) {
      this.elementVideoRef.nativeElement.muted = this.estEnSourdine();
    }
  }

  /**
   * Bascule la lecture de la vidéo (pause / lecture).
   */
  basculerLecture(): void {
    const video = this.elementVideoRef?.nativeElement;
    if (video) {
      if (video.paused) {
        video.play();
        this.estEnLecture.set(true);
      } else {
        video.pause();
        this.estEnLecture.set(false);
      }
    } else {
      this.estEnLecture.update((lec) => !lec);
    }
  }

  /**
   * Réinitialise et relance la vidéo lors du changement de publication.
   */
  private reinitialiserVideo(): void {
    setTimeout(() => {
      const video = this.elementVideoRef?.nativeElement;
      if (video) {
        video.currentTime = 0;
        video.muted = this.estEnSourdine();
        video.play().catch(() => {
          // Autoplay avec son parfois bloqué par le navigateur
        });
        this.estEnLecture.set(true);
      }
      this.directionAnimation.set(null);
    }, 50);
  }

  /**
   * Bascule le J'aime sur la publication active.
   * En mode visiteur, exige la connexion au préalable.
   */
  basculerJaime(): void {
    const pub = this.publicationCourante();
    if (!pub) {
      return;
    }

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'LIKE',
        () => this.serviceCatalogue.basculerJaimePublication(pub.identifiant),
        {
          titre: `Aimez ${pub.plat.nom}`,
          description: `Connectez-vous pour liker ce plat de ${pub.plat.nomRestaurant} et l'ajouter à vos favoris.`
        }
      );
      return;
    }

    this.serviceCatalogue.basculerJaimePublication(pub.identifiant);
  }

  /**
   * Bascule l'abonnement au restaurant.
   * En mode visiteur, exige la connexion au préalable.
   */
  basculerAbonnement(): void {
    const pub = this.publicationCourante();
    if (!pub) {
      return;
    }

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'ABONNEMENT',
        () => this.serviceCatalogue.basculerAbonnementPublication(pub.identifiant),
        {
          titre: `S'abonner à ${pub.plat.nomRestaurant}`,
          description: `Connectez-vous pour vous abonner à ${pub.plat.nomRestaurant} et recevoir ses nouvelles vidéos gourmandes.`
        }
      );
      return;
    }

    this.serviceCatalogue.basculerAbonnementPublication(pub.identifiant);
  }

  /**
   * Ouvre la fiche de détail du plat (Modal conforme à l'Image 1).
   */
  ouvrirDetailPlat(plat: Plat): void {
    this.serviceCatalogue.ouvrirDetailPlat(plat);
  }

  /**
   * Ajoute le plat affiché au panier ou ouvre sa fiche détaillée.
   * En mode visiteur, exige la connexion pour pouvoir commander.
   */
  commanderPlatActuel(plat: Plat): void {
    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'COMMANDE',
        () => this.ouvrirDetailPlat(plat),
        {
          titre: `Commander ${plat.nom}`,
          description: `Connectez-vous pour commander ${plat.nom} de ${plat.nomRestaurant} et être livré rapidement à Dakar.`
        }
      );
      return;
    }

    this.ouvrirDetailPlat(plat);
  }

  /**
   * Ouvre la page de détail du restaurant.
   */
  voirRestaurant(identifiantRestaurant: string): void {
    this.routeur.navigate(['/restaurant', identifiantRestaurant]);
  }

  /**
   * Partager le plat.
   * En mode visiteur, exige la connexion au préalable.
   */
  partagerPlat(): void {
    const pub = this.publicationCourante();
    if (!pub) {
      return;
    }

    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'PARTAGE',
        () => this.procederAuPartagePlat(),
        {
          titre: `Partager ${pub.plat.nom}`,
          description: `Connectez-vous pour recommander et partager ce plat de ${pub.plat.nomRestaurant} avec vos proches.`
        }
      );
      return;
    }

    this.procederAuPartagePlat();
  }

  /**
   * Exécution réelle du partage du plat.
   */
  private procederAuPartagePlat(): void {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: this.publicationCourante()?.plat.nom,
        text: this.publicationCourante()?.descriptionAccroche,
        url: window.location.href
      }).catch(() => {});
    } else {
      this.notificationAjoutPanier.set('Lien copié dans le presse-papier !');
      setTimeout(() => this.notificationAjoutPanier.set(null), 2000);
    }
  }
}
