import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
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
  private readonly http = inject(HttpClient);
  private readonly serviceCatalogue = inject(ServiceCatalogueService);
  private readonly routeur = inject(Router);

  @ViewChild('videoApercu') videoApercuRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('inputFichierVideo') inputFichierVideoRef?: ElementRef<HTMLInputElement>;

  // Vue active : 'MES_VIDEOS' (Image 2) ou 'PUBLICATION' (Image 3)
  readonly vueActive = signal<VueStudioActive>('MES_VIDEOS');

  // Recherche
  readonly rechercheTexte = signal<string>('');
  readonly chargementEnCours = signal<boolean>(false);

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
  readonly urlVideoActive = signal<string>('');
  readonly fichierVideoChoisi = signal<File | null>(null);
  readonly nomFichierVideo = signal<string>('');

  // Image d'affiche (poster de couverture)
  readonly urlAfficheActive = signal<string>('');

  // Description de la publication (max 100 caractères)
  readonly texteDescription = signal<string>('');

  // Liste des vidéos publiées réelles du restaurant
  readonly listeVideosPubliees = signal<VideoPublieeItem[]>([]);

  // Liste des plats réels de l'établissement disponibles pour l'association
  readonly cataloguePlats = signal<PlatStudioOption[]>([]);

  // Plat sélectionné actuellement pour la vidéo
  readonly platSelectionneId = signal<string>('');

  // Enregistrement caméra réel
  private fluxCamera: MediaStream | null = null;
  private enregistreurMedia: MediaRecorder | null = null;
  private morceauxEnregistrement: Blob[] = [];
  private intervalEnregistrement: any = null;

  constructor() {
    this.chargerStudio();
  }

  chargerStudio(): void {
    this.chargementEnCours.set(true);

    // 1. Chargement des vidéos réelles depuis Django
    this.http.get<VideoPublieeItem[]>(`${environment.apiUrl}/publications/studio/`).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (videos) => {
        this.listeVideosPubliees.set(videos);
        this.chargementEnCours.set(false);
      },
      error: () => this.chargementEnCours.set(false)
    });

    // 2. Chargement des plats réels de l'établissement
    this.http.get<any[]>(`${environment.apiUrl}/catalogue/mes-plats/`).pipe(
      map((plats) =>
        plats.map((p) => ({
          identifiant: String(p.id),
          nom: p.nom,
          prixFcfa: Number(p.prix_fcfa),
          categorie: p.section_menu || 'PLATS_PRINCIPAUX',
          adresseImage: p.adresse_image || '/images/plat-accueil.jpg',
          description: p.description || '',
          estDisponible: Boolean(p.est_disponible)
        }))
      ),
      catchError(() => of([]))
    ).subscribe({
      next: (plats) => {
        this.cataloguePlats.set(plats);
        if (plats.length > 0 && !this.platSelectionneId()) {
          this.platSelectionneId.set(plats[0].identifiant);
          this.platEstDisponible.set(plats[0].estDisponible);
          if (plats[0].adresseImage) {
            this.urlAfficheActive.set(plats[0].adresseImage);
          }
        }
      }
    });
  }

  readonly platSelectionne = computed<PlatStudioOption | null>(() => {
    return (
      this.cataloguePlats().find((p) => p.identifiant === this.platSelectionneId()) ??
      this.cataloguePlats()[0] ??
      null
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
  readonly tempsEnregistrement = signal<number>(0);

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
   * Supprime une vidéo publiée de la liste et de la base Django.
   */
  supprimerVideo(video: VideoPublieeItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.menuOptionsOuvertId.set(null);
    this.http.delete(`${environment.apiUrl}/publications/studio/${video.id}/`).subscribe({
      next: () => {
        this.listeVideosPubliees.update((liste) => liste.filter((v) => v.id !== video.id));
        this.afficherNotification(`La vidéo "${video.titrePlat}" a été supprimée.`);
      },
      error: () => {
        this.afficherNotification(`Erreur lors de la suppression de la vidéo.`);
      }
    });
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
      this.fichierVideoChoisi.set(fichier);
      this.nomFichierVideo.set(fichier.name);
      const urlBlob = URL.createObjectURL(fichier);
      this.urlVideoActive.set(urlBlob);
      this.afficherNotification(`Vidéo "${fichier.name}" importée avec succès !`);

      setTimeout(() => {
        const video = this.videoApercuRef?.nativeElement;
        if (video) {
          video.srcObject = null;
          video.src = urlBlob;
          video.currentTime = 0;
          video.play().then(() => this.estEnLecture.set(true)).catch(() => {});
        }
      }, 300);
    }
  }

  /**
   * Déclenche l'enregistrement vidéo réel avec la caméra de l'appareil ("Filmer").
   */
  async declencherFilmer(): Promise<void> {
    if (this.estEnEnregistrement()) {
      if (this.enregistreurMedia && this.enregistreurMedia.state !== 'inactive') {
        this.enregistreurMedia.stop();
      }
      if (this.intervalEnregistrement) {
        clearInterval(this.intervalEnregistrement);
      }
      this.estEnEnregistrement.set(false);
      this.afficherNotification('Enregistrement terminé et prêt pour la publication !');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true
        });
        this.fluxCamera = stream;
        this.morceauxEnregistrement = [];

        const mimeOptions = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? { mimeType: 'video/webm;codecs=vp9' }
          : MediaRecorder.isTypeSupported('video/mp4')
          ? { mimeType: 'video/mp4' }
          : undefined;

        const recorder = new MediaRecorder(stream, mimeOptions);
        this.enregistreurMedia = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.morceauxEnregistrement.push(e.data);
          }
        };

        recorder.onstop = () => {
          const typeMime = recorder.mimeType || 'video/mp4';
          const ext = typeMime.includes('webm') ? 'webm' : 'mp4';
          const blob = new Blob(this.morceauxEnregistrement, { type: typeMime });
          const fichier = new File([blob], `capture_ayyou_${Date.now()}.${ext}`, { type: typeMime });
          this.fichierVideoChoisi.set(fichier);
          this.nomFichierVideo.set(fichier.name);
          const urlBlob = URL.createObjectURL(blob);
          this.urlVideoActive.set(urlBlob);

          if (this.fluxCamera) {
            this.fluxCamera.getTracks().forEach((t) => t.stop());
            this.fluxCamera = null;
          }

          setTimeout(() => {
            const video = this.videoApercuRef?.nativeElement;
            if (video) {
              video.srcObject = null;
              video.src = urlBlob;
              video.currentTime = 0;
              video.play().then(() => this.estEnLecture.set(true)).catch(() => {});
            }
          }, 300);
        };

        const videoElem = this.videoApercuRef?.nativeElement;
        if (videoElem) {
          videoElem.src = '';
          videoElem.srcObject = stream;
          videoElem.play().catch(() => {});
        }

        recorder.start(1000);
        this.estEnEnregistrement.set(true);
        this.tempsEnregistrement.set(0);
        this.afficherNotification('🔴 Enregistrement caméra en direct activé...');

        this.intervalEnregistrement = setInterval(() => {
          this.tempsEnregistrement.update((t) => {
            if (t >= 300) {
              this.declencherFilmer();
              return 300;
            }
            return t + 1;
          });
        }, 1000);
      } else {
        this.declencherImportVideo();
      }
    } catch (err) {
      console.warn("Accès caméra non disponible, bascule vers sélection fichier:", err);
      this.declencherImportVideo();
    }
  }

  /**
   * Publie la vidéo en direct dans le feed vidéo client et l'ajoute aux vidéos publiées via l'API Django.
   */
  publierMaintenant(): void {
    const platCourant = this.platSelectionne();
    if (!platCourant) {
      this.afficherNotification("⚠️ Veuillez ajouter ou sélectionner un plat avant de publier.");
      return;
    }

    const fichier = this.fichierVideoChoisi();
    if (!fichier) {
      this.afficherNotification("⚠️ Veuillez choisir ou filmer une vidéo avant de publier.");
      return;
    }

    const platIdNum = Number(platCourant.identifiant);
    const formData = new FormData();
    formData.append('titre', platCourant.nom);
    formData.append('description', this.texteDescription().trim() || `Découvrez notre plat « ${platCourant.nom} » sur AYYOU !`);
    formData.append('type_media', 'VIDEO');
    if (!isNaN(platIdNum) && platIdNum > 0) {
      formData.append('plat_id', String(platIdNum));
    }
    formData.append('fichier_media', fichier);

    this.chargementEnCours.set(true);
    this.http.post<any>(`${environment.apiUrl}/publications/studio/`, formData).subscribe({
      next: (nouvellePub) => {
        this.chargementEnCours.set(false);
        this.chargerStudio();
        this.modalePublicationReussie.set(true);
        this.fichierVideoChoisi.set(null);
        this.urlVideoActive.set('');
        this.nomFichierVideo.set('');
        this.texteDescription.set('');
      },
      error: (err) => {
        this.chargementEnCours.set(false);
        const errDetail = err.error?.fichier_media?.[0] || err.error?.plat_id?.[0] || err.error?.detail || err.message || "Erreur lors de la publication de la vidéo.";
        this.afficherNotification(`⚠️ ${errDetail}`);
      }
    });
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
