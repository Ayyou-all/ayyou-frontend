import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartePlatChatbot, ServiceIaService } from '../../../socle/services/service-ia.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

@Component({
  selector: 'app-chatbot-culinaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-culinaire.component.html',
  styleUrl: './chatbot-culinaire.component.css'
})
export class ChatbotCulinaireComponent {
  @ViewChild('zoneMessages') private zoneMessages?: ElementRef<HTMLDivElement>;

  readonly serviceIa = inject(ServiceIaService);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly servicePanier = inject(ServicePanierService);
  readonly routeur = inject(Router);

  readonly messageSaisi = signal<string>('');
  readonly suggestionsRapides: string[] = [
    'J\'ai 3 500 FCFA pour midi',
    'Un bon Thieboudienne aux Almadies',
    'Un burger rapide sous 5 000 FCFA',
    'Des pastels croustillants pour le goûter'
  ];

  // Enregistrement audio (note vocale)
  readonly enregistrementEnCours = signal<boolean>(false);
  readonly transcriptionEnCours = signal<boolean>(false);
  readonly messageErreurAudio = signal<string | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private fluxAudio: MediaStream | null = null;
  private morceauxAudio: Blob[] = [];
  private debutEnregistrement: number = 0;

  constructor() {
    // Défilement automatique réactif aux nouveaux messages et au statut de réponse de l'IA
    effect(() => {
      this.serviceIa.messagesChat();
      this.serviceIa.chargementChatbot();
      const estOuvert = this.serviceIa.chatbotOuvert();

      if (estOuvert) {
        this.defilerVersDernierMessage(true);
      }
    });
  }

  /**
   * Fait défiler le conteneur scrollable des messages vers le bas.
   * Gère les réponses longues, les cartes de plats et l'indicateur de chargement.
   */
  defilerVersDernierMessage(fluide: boolean = true): void {
    const scroller = (modeFluide: boolean) => {
      const el =
        this.zoneMessages?.nativeElement ||
        (typeof document !== 'undefined'
          ? (document.getElementById('zone-messages-chatbot') as HTMLDivElement | null)
          : null);
      if (el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: modeFluide ? 'smooth' : 'auto'
        });
      }
    };

    requestAnimationFrame(() => {
      scroller(fluide);
      setTimeout(() => scroller(fluide), 80);
    });
  }

  basculerEnregistrementVocal(): void {
    if (this.enregistrementEnCours()) {
      this.arreterEnregistrementVocal();
    } else {
      this.demarrerEnregistrementVocal();
    }
  }

  demarrerEnregistrementVocal(): void {
    this.messageErreurAudio.set(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.messageErreurAudio.set("Votre navigateur ne permet pas l'enregistrement audio direct.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((flux) => {
        this.fluxAudio = flux;
        this.morceauxAudio = [];
        this.debutEnregistrement = Date.now();

        try {
          this.mediaRecorder = new MediaRecorder(flux);
        } catch (e: any) {
          this.libererMicrophone();
          this.messageErreurAudio.set("Format audio non supporté par ce navigateur.");
          return;
        }

        this.mediaRecorder.ondataavailable = (evenement) => {
          if (evenement.data && evenement.data.size > 0) {
            this.morceauxAudio.push(evenement.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          this.libererMicrophone();
          const dureeMs = Date.now() - this.debutEnregistrement;

          if (dureeMs < 700 || this.morceauxAudio.length === 0) {
            this.messageErreurAudio.set("Enregistrement trop court. Parlez quelques secondes puis réessayez.");
            return;
          }

          const blob = new Blob(this.morceauxAudio, { type: 'audio/webm' });
          this.transcrireNoteVocale(blob);
        };

        this.mediaRecorder.start();
        this.enregistrementEnCours.set(true);
      })
      .catch((err: any) => {
        this.libererMicrophone();
        this.enregistrementEnCours.set(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.messageErreurAudio.set("Permission microphone refusée. Veuillez autoriser le micro dans votre navigateur.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          this.messageErreurAudio.set("Aucun microphone détecté sur cet appareil.");
        } else {
          this.messageErreurAudio.set("Impossible d'accéder au microphone. Veuillez réessayer.");
        }
      });
  }

  arreterEnregistrementVocal(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.enregistrementEnCours.set(false);
    }
  }

  annulerEnregistrementVocal(): void {
    this.libererMicrophone();
    this.morceauxAudio = [];
    this.enregistrementEnCours.set(false);
    this.messageErreurAudio.set(null);
  }

  private libererMicrophone(): void {
    if (this.fluxAudio) {
      this.fluxAudio.getTracks().forEach((track) => track.stop());
      this.fluxAudio = null;
    }
    this.mediaRecorder = null;
  }

  private transcrireNoteVocale(blob: Blob): void {
    this.transcriptionEnCours.set(true);
    this.messageErreurAudio.set(null);

    this.serviceIa.transcrireAudio(blob).subscribe({
      next: (res) => {
        this.transcriptionEnCours.set(false);
        if (res.succes && res.texte && res.texte.trim()) {
          // Étape 3 obligatoire : afficher le texte dans le champ de saisie modifiable SANS l'envoyer directement
          this.messageSaisi.set(res.texte.trim());
        } else {
          this.messageErreurAudio.set(
            res.message || "Aucune parole claire n'a été détectée. Veuillez répéter ou saisir votre texte."
          );
        }
      },
      error: () => {
        this.transcriptionEnCours.set(false);
        this.messageErreurAudio.set("Service de transcription momentanément indisponible.");
      }
    });
  }

  envoyerMessage(): void {
    const texte = this.messageSaisi().trim();
    if (!texte || this.serviceIa.chargementChatbot()) {
      return;
    }

    this.messageSaisi.set('');
    this.serviceIa.envoyerMessage(texte).subscribe();
    this.defilerVersDernierMessage(true);
  }

  utiliserSuggestion(suggestion: string): void {
    this.messageSaisi.set(suggestion);
    this.envoyerMessage();
  }

  consulterPlat(carte: CartePlatChatbot): void {
    this.serviceCatalogue.ouvrirDetailPlat({
      identifiant: String(carte.id),
      identifiantRestaurant: String(carte.restaurant_id),
      nomRestaurant: carte.restaurant_nom,
      nom: carte.nom,
      description: carte.description,
      prixFcfa: carte.prix_fcfa,
      adresseImage: carte.image_url,
      categorie: 'Plats',
      statut: 'DISPONIBLE'
    });
    this.serviceIa.fermerChatbot();
  }

  commanderDirectement(carte: CartePlatChatbot): void {
    this.servicePanier.ajouterPlat({
      identifiant: String(carte.id),
      identifiantRestaurant: String(carte.restaurant_id),
      nomRestaurant: carte.restaurant_nom,
      nom: carte.nom,
      description: carte.description,
      prixFcfa: carte.prix_fcfa,
      adresseImage: carte.image_url,
      categorie: 'Plats',
      statut: 'DISPONIBLE'
    }, 1);

    this.serviceIa.fermerChatbot();
    this.routeur.navigate(['/panier']);
  }
}
