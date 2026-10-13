import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { PublicationFil } from '../../../socle/modeles/fil-actualite.modele';
import { Plat } from '../../../socle/modeles/plat.modele';

export type VueStudioActive = 'MES_VIDEOS' | 'PUBLICATION';

export interface VideoPublieeItem {
  id: string;
  titrePlat: string;
  detailsPlat: string;
  imageAffiche: string;
  videoUrl: string;
  nombreJeaime: string;
  nombreVues: string;
  datePublication: string;
}

export interface PlatStudioOption {
  identifiant: string;
  nom: string;
  prixFcfa: number;
  categorie: string;
  adresseImage: string;
  description: string;
  estDisponible: boolean;
}

@Component({
  selector: 'app-gerant-ayyou-studio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-ayyou-studio.component.html'
})
export class GerantAyyouStudioComponent {
  private readonly serviceCatalogue = inject(ServiceCatalogueService);
  private readonly routeur = inject(Router);

  @ViewChild('videoApercu') videoApercuRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('inputFichierVideo') inputFichierVideoRef?: ElementRef<HTMLInputElement>;

  // Vue active : 'MES_VIDEOS' (Image 2) ou 'PUBLICATION' (Image 3)
  readonly vueActive = signal<VueStudioActive>('MES_VIDEOS');

  // Recherche
  readonly rechercheTexte = signal<string>('');

  // État de lecture de la vidéo aperçu dans la vue publication
  readonly estEnLecture = signal<boolean>(false);

  // Vidéo en cours de visionnage dans le lecteur modal
  readonly videoEnLectureModal = signal<VideoPublieeItem | null>(null);

  // ID de la vidéo dont le menu options (⋮) est ouvert
  readonly menuOptionsOuvertId = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  surEchap(): void {
    this.videoEnLectureModal.set(null);
    this.menuOptionsOuvertId.set(null);
  }

  // Vidéo source active pour la publication
  readonly urlVideoActive = signal<string>(
    'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-42795-large.mp4'
  );

  // Image d'affiche (Thiéboudienne rouge)
  readonly urlAfficheActive = signal<string>('/images/plat-accueil.jpg');

  // Description de la publication (max 100 caractères, Image 3)
  readonly texteDescription = signal<string>(
    'Véritable Ceebu Jën rouge au mérou blanc frais, légumes mijotés du terroir dakarois.'
  );

  // Liste des vidéos publiées (conforme à l'Image 2)
  readonly listeVideosPubliees = signal<VideoPublieeItem[]>([
    {
      id: 'vid-thieb',
      titrePlat: 'Thiéboudienne Rouge',
      detailsPlat: '4 500 FCFA • Best-seller',
      imageAffiche: '/images/plat-accueil.jpg',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-42795-large.mp4',
      nombreJeaime: '1420',
      nombreVues: '4.2k',
      datePublication: 'Publié il y a 2 jours'
    },
    {
      id: 'vid-yassa',
      titrePlat: 'Yassa Poulet',
      detailsPlat: '3 800 FCFA • Citron & Oignons',
      imageAffiche: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-a-dish-in-a-kitchen-42798-large.mp4',
      nombreJeaime: '890',
      nombreVues: '2.8k',
      datePublication: 'Publié il y a 5 jours'
    },
    {
      id: 'vid-pastels',
      titrePlat: 'Pastels au Poisson',
      detailsPlat: '2 000 FCFA • Entrée croustillante',
      imageAffiche: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-42795-large.mp4',
      nombreJeaime: '2 140',
      nombreVues: '6.4k',
      datePublication: 'Publié il y a 1 sem'
    },
    {
      id: 'vid-bissap',
      titrePlat: 'Bissap Maison',
      detailsPlat: '1 000 FCFA • Infusion florale',
      imageAffiche: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-42795-large.mp4',
      nombreJeaime: '670',
      nombreVues: '1.9k',
      datePublication: 'Publié il y a 2 sem'
    }
  ]);

  // Liste des plats disponibles pour l'association
  readonly cataloguePlats = signal<PlatStudioOption[]>([
    {
      identifiant: 'plat-ceebu-jen',
      nom: 'Ceebu Jën Rouge (Thiéboudienne)',
      prixFcfa: 4500,
      categorie: 'PLATS_PRINCIPAUX',
      adresseImage: '/images/plat-accueil.jpg',
      description: 'Riz au poisson à la sénégalaise, servi avec légumes frais et nététou.',
      estDisponible: true
    },
    {
      identifiant: 'plat-yassa-poulet',
      nom: 'Yassa Poulet Caramélisé',
      prixFcfa: 3800,
      categorie: 'PLATS_PRINCIPAUX',
      adresseImage: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400',
      description: 'Poulet fermier mariné au citron vert et oignons dorés.',
      estDisponible: false
    },
    {
      identifiant: 'plat-pastels',
      nom: 'Pastels au Poisson Dorés',
      prixFcfa: 2000,
      categorie: 'ENTREES',
      adresseImage: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
      description: 'Beignets croustillants farcis au poisson avec sauce tomate pimentée.',
      estDisponible: true
    },
    {
      identifiant: 'plat-bissap',
      nom: 'Bissap Maison Frais',
      prixFcfa: 1000,
      categorie: 'BOISSONS',
      adresseImage: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400',
      description: 'Infusion fraîche d’hibiscus parfumé à la menthe douce.',
      estDisponible: true
    }
  ]);

  // Plat sélectionné actuellement pour la vidéo
  readonly platSelectionneId = signal<string>('plat-ceebu-jen');

  readonly platSelectionne = computed(() => {
    return (
      this.cataloguePlats().find((p) => p.identifiant === this.platSelectionneId()) ??
      this.cataloguePlats()[0]
    );
  });

  // Disponibilité du plat sélectionné
  readonly platEstDisponible = signal<boolean>(true);

  // Modale de changement de plat
  readonly modaleChangementPlatOuverte = signal<boolean>(false);

  // Modale de confirmation de publication réussie
  readonly modalePublicationReussie = signal<boolean>(false);
  readonly dernierePublicationPubliee = signal<PublicationFil | null>(null);

  // État d'enregistrement caméra
  readonly estEnEnregistrement = signal<boolean>(false);
  readonly tempsEnregistrement = signal<number>(28);

  // Notification Toast
  readonly notificationMessage = signal<string | null>(null);

  // Calcul du nombre de caractères de la description
  readonly nombreCaracteres = computed(() => this.texteDescription().length);

  /**
   * Bascule entre la vue "Mes Vidéos Publiées" (Image 2) et "Publication Vidéo" (Image 3).
   */
  basculerVue(vue: VueStudioActive): void {
    this.vueActive.set(vue);
    this.menuOptionsOuvertId.set(null);
  }

  /**
   * Ouvre la modale pour visionner la vidéo en grand.
   */
  regarderVideo(video: VideoPublieeItem): void {
    this.menuOptionsOuvertId.set(null);
    this.videoEnLectureModal.set(video);
  }

  fermerLecteurModal(): void {
    this.videoEnLectureModal.set(null);
  }

  /**
   * Bascule le menu déroulant des trois points (⋮).
   */
  basculerMenuOptions(id: string, event: Event): void {
    event.stopPropagation();
    this.menuOptionsOuvertId.update((actuel) => (actuel === id ? null : id));
  }

  fermerMenuOptions(): void {
    this.menuOptionsOuvertId.set(null);
  }

  /**
   * Supprime une vidéo publiée de la liste.
   */
  supprimerVideo(video: VideoPublieeItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.menuOptionsOuvertId.set(null);
    this.listeVideosPubliees.update((liste) => liste.filter((v) => v.id !== video.id));
    this.afficherNotification(`La vidéo "${video.titrePlat}" a été supprimée.`);
  }

  /**
   * Bascule la lecture de l'aperçu vidéo en mode publication.
   */
  basculerLectureVideo(): void {
    const video = this.videoApercuRef?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        this.estEnLecture.set(true);
      }).catch(() => {});
    } else {
      video.pause();
      this.estEnLecture.set(false);
    }
  }

  /**
   * Ouvre la modale pour changer de plat associé à la vidéo.
   */
  ouvrirChangementPlat(): void {
    this.modaleChangementPlatOuverte.set(true);
  }

  fermerChangementPlat(): void {
    this.modaleChangementPlatOuverte.set(false);
  }

  /**
   * Choisit un nouveau plat pour la vidéo.
   */
  selectionnerPlat(plat: PlatStudioOption): void {
    this.platSelectionneId.set(plat.identifiant);
    this.platEstDisponible.set(plat.estDisponible);
    this.fermerChangementPlat();
    this.afficherNotification(`Plat associé : "${plat.nom}"`);
  }

  /**
   * Bascule la disponibilité du plat sélectionné (Rupture / DISPONIBLE).
   */
  basculerDisponibilitePlat(): void {
    const nouveauStatut = !this.platEstDisponible();
    this.platEstDisponible.set(nouveauStatut);

    this.cataloguePlats.update((liste) =>
      liste.map((p) =>
        p.identifiant === this.platSelectionneId() ? { ...p, estDisponible: nouveauStatut } : p
      )
    );

    const texte = nouveauStatut ? 'DISPONIBLE' : 'EN RUPTURE';
    this.afficherNotification(`Disponibilité : ${texte}`);
  }

  /**
   * Ouvre la boîte de dialogue pour importer une vidéo.
   */
  declencherImportVideo(): void {
    this.inputFichierVideoRef?.nativeElement?.click();
  }

  /**
   * Gère le fichier vidéo sélectionné par l'utilisateur.
   */
  surFichierVideoChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fichier = input.files[0];
      const urlBlob = URL.createObjectURL(fichier);
      this.urlVideoActive.set(urlBlob);
      this.afficherNotification(`Vidéo "${fichier.name}" importée avec succès !`);
      
      setTimeout(() => {
        const video = this.videoApercuRef?.nativeElement;
        if (video) {
          video.currentTime = 0;
          video.play().then(() => this.estEnLecture.set(true)).catch(() => {});
        }
      }, 300);
    }
  }

  /**
   * Déclenche la simulation d'enregistrement vidéo ("Filmer").
   */
  declencherFilmer(): void {
    if (this.estEnEnregistrement()) {
      this.estEnEnregistrement.set(false);
      this.afficherNotification('Enregistrement terminé et prêt pour la publication !');
      return;
    }

    this.estEnEnregistrement.set(true);
    this.tempsEnregistrement.set(0);
    this.afficherNotification('Enregistrement vidéo en direct activé (HD 1080p)...');

    const intervalId = setInterval(() => {
      if (!this.estEnEnregistrement()) {
        clearInterval(intervalId);
        return;
      }
      this.tempsEnregistrement.update((t) => {
        if (t >= 30) {
          clearInterval(intervalId);
          this.estEnEnregistrement.set(false);
          this.afficherNotification('Clip de 30 secondes enregistré avec succès !');
          return 30;
        }
        return t + 1;
      });
    }, 1000);
  }

  /**
   * Publie la vidéo en direct dans le feed vidéo client et l'ajoute aux vidéos publiées.
   */
  publierMaintenant(): void {
    const platCourant = this.platSelectionne();
    const platComplet: Plat = {
      identifiant: platCourant.identifiant,
      identifiantRestaurant: 'resto-le-teranga',
      nomRestaurant: 'Le Teranga',
      nom: platCourant.nom,
      description: platCourant.description,
      prixFcfa: platCourant.prixFcfa,
      adresseImage: platCourant.adresseImage,
      categorie: platCourant.categorie,
      statut: this.platEstDisponible() ? 'DISPONIBLE' : 'INDISPONIBLE'
    };

    const nouvellePublication: PublicationFil = {
      identifiant: `pub-teranga-${Date.now()}`,
      identifiantRestaurant: 'resto-le-teranga',
      nomRestaurant: 'Le Teranga',
      nomUtilisateurRestaurant: '@leteranga',
      adresseLogoRestaurant: '/images/logo-ayyou.png',
      estAbonne: false,
      plat: platComplet,
      descriptionAccroche: this.texteDescription().trim() || 'Venez déguster notre spécialité du jour !',
      adresseMedia: platCourant.adresseImage,
      adresseVideo: this.urlVideoActive(),
      typeMedia: 'VIDEO',
      nombreJeaime: '1',
      estAime: false,
      nombrePartages: 0
    };

    // Publication dans le feed client
    this.serviceCatalogue.publierVideoFil(nouvellePublication);

    // Ajout dans la liste des vidéos publiées du restaurant
    this.listeVideosPubliees.update((liste) => [
      {
        id: nouvellePublication.identifiant,
        titrePlat: platCourant.nom,
        detailsPlat: `${platCourant.prixFcfa} FCFA • Spécialité`,
        imageAffiche: platCourant.adresseImage,
        videoUrl: this.urlVideoActive(),
        nombreJeaime: '1',
        nombreVues: '1',
        datePublication: 'À l’instant'
      },
      ...liste
    ]);

    this.dernierePublicationPubliee.set(nouvellePublication);
    this.modalePublicationReussie.set(true);
  }

  /**
   * Navigue vers le feed client pour constater la vidéo.
   */
  voirDansLeFeedClient(): void {
    this.modalePublicationReussie.set(false);
    this.routeur.navigate(['/accueil']);
  }

  afficherNotification(message: string): void {
    this.notificationMessage.set(message);
    setTimeout(() => this.notificationMessage.set(null), 3500);
  }
}
