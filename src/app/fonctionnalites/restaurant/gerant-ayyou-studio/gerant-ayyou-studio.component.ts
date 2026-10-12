import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { PublicationFil } from '../../../socle/modeles/fil-actualite.modele';
import { Plat } from '../../../socle/modeles/plat.modele';

export type CategoriePlatStudio = 'PLATS_PRINCIPAUX' | 'BOISSONS' | 'DESSERTS' | 'ENTREES';

export interface PlatStudioOption {
  identifiant: string;
  nom: string;
  prixFcfa: number;
  categorie: CategoriePlatStudio;
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

  // État de lecture de la vidéo aperçu
  readonly estEnLecture = signal<boolean>(false);

  // Vidéo source active (vidéo sénégalaise HD par défaut)
  readonly urlVideoActive = signal<string>(
    'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-42795-large.mp4'
  );

  // Image d'affiche (Thiéboudienne rouge aux légumes du terroir dakarois)
  readonly urlAfficheActive = signal<string>(
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200'
  );

  // Catégorie sélectionnée
  readonly categorieSelectionnee = signal<CategoriePlatStudio>('PLATS_PRINCIPAUX');

  // Description de la publication (max 100 caractères)
  readonly texteDescription = signal<string>(
    'Véritable Ceebu Jën rouge au mérou blanc frais, légumes mijotés du terroir dakarois.'
  );

  // Liste des plats disponibles pour l'association
  readonly cataloguePlats = signal<PlatStudioOption[]>([
    {
      identifiant: 'plat-ceebu-jen',
      nom: 'Ceebu Jën Rouge (Thiéboudienne)',
      prixFcfa: 4500,
      categorie: 'PLATS_PRINCIPAUX',
      adresseImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
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
      identifiant: 'plat-mafe-boeuf',
      nom: 'Mafé Bœuf Onctueux',
      prixFcfa: 4200,
      categorie: 'PLATS_PRINCIPAUX',
      adresseImage: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
      description: 'Sauce d’arachide mijotée avec tendres morceaux de bœuf.',
      estDisponible: true
    },
    {
      identifiant: 'plat-bissap',
      nom: 'Bissap Maison Menthe',
      prixFcfa: 1000,
      categorie: 'BOISSONS',
      adresseImage: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400',
      description: 'Jus d’hibiscus parfumé à la menthe fraîche.',
      estDisponible: true
    },
    {
      identifiant: 'plat-bouye',
      nom: 'Bouye Onctueux au Baobab',
      prixFcfa: 1500,
      categorie: 'BOISSONS',
      adresseImage: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400',
      description: 'Fruit de baobab riche et vanillé.',
      estDisponible: true
    },
    {
      identifiant: 'plat-thiakry',
      nom: 'Thiakry Gourmand Couscous & Lait',
      prixFcfa: 1800,
      categorie: 'DESSERTS',
      adresseImage: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400',
      description: 'Couscous de mil sucré arrosé de lait caillé onctueux.',
      estDisponible: true
    }
  ]);

  // Plat sélectionné actuellement pour la vidéo (Thiéboudienne rouge par défaut)
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

  // État de simulation enregistrement caméra
  readonly estEnEnregistrement = signal<boolean>(false);
  readonly tempsEnregistrement = signal<number>(28);

  // Recherche dans la barre supérieure
  readonly rechercheTexte = signal<string>('');

  // Notification Toast
  readonly notificationMessage = signal<string | null>(null);

  // Statistiques barre inférieure (conformes à la maquette)
  readonly totalPlats = signal<number>(24);
  readonly enRupture = signal<number>(3);

  // Calcul du nombre de caractères de la description
  readonly nombreCaracteres = computed(() => this.texteDescription().length);

  /**
   * Bascule la lecture de l'aperçu vidéo.
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
    this.categorieSelectionnee.set(plat.categorie);
    this.fermerChangementPlat();
    this.afficherNotification(`Plat associé : "${plat.nom}"`);
  }

  /**
   * Bascule la disponibilité du plat sélectionné (Rupture / DISPONIBLE).
   */
  basculerDisponibilitePlat(): void {
    const nouveauStatut = !this.platEstDisponible();
    this.platEstDisponible.set(nouveauStatut);

    // Mettre à jour dans la liste
    this.cataloguePlats.update((liste) =>
      liste.map((p) =>
        p.identifiant === this.platSelectionneId() ? { ...p, estDisponible: nouveauStatut } : p
      )
    );

    const texte = nouveauStatut ? 'DISPONIBLE' : 'EN RUPTURE';
    this.afficherNotification(`Disponibilité : ${texte}`);
  }

  /**
   * Ouvre la boîte de dialogue pour importer une vidéo depuis le stockage de l'appareil.
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
   * Déclenche la simulation ou prise de vidéo caméra ("Filmer").
   */
  declencherFilmer(): void {
    if (this.estEnEnregistrement()) {
      this.estEnEnregistrement.set(false);
      this.afficherNotification('Enregistrement terminé et prêt pour la diffusion !');
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
   * Publie la vidéo en direct dans le feed vidéo du client.
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
      adresseLogoRestaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      estAbonne: false,
      plat: platComplet,
      descriptionAccroche: this.texteDescription().trim() || 'Venez déguster notre spécialité du jour !',
      adresseMedia: platCourant.adresseImage,
      adresseVideo: this.urlVideoActive(),
      typeMedia: 'VIDEO',
      nombreJeaime: '0',
      estAime: false,
      nombrePartages: 0
    };

    // Publication immédiate dans le service central du fil d'actualité client
    this.serviceCatalogue.publierVideoFil(nouvellePublication);

    this.dernierePublicationPubliee.set(nouvellePublication);
    this.modalePublicationReussie.set(true);
  }

  /**
   * Redirige directement vers le fil d'actualité vidéo client pour constater le résultat en live.
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
