import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Plat } from '../../socle/modeles/plat.modele';
import { CategorieRestaurant, Restaurant } from '../../socle/modeles/restaurant.modele';
import { ServiceCatalogueService } from '../../socle/services/service-catalogue.service';
import { AnalyseRechercheVocale, ServiceIaService } from '../../socle/services/service-ia.service';

/** Minuscules, sans accents ni ponctuation (même règle que le service IA). */
function normaliser(texte: string): string {
  return (texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Vrai si un des termes apparaît en début de mot dans le texte (« pastel » trouve « Pastels »). */
function contientUnTerme(texte: string, termes: string[]): boolean {
  const cible = ` ${normaliser(texte)}`;
  return termes.some((terme) => cible.includes(` ${terme}`));
}

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './catalogue.component.html'
})
export class CatalogueComponent {
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  private readonly serviceIa = inject(ServiceIaService);
  readonly routeur = inject(Router);

  // Recherche textuelle
  readonly texteRecherche = signal<string>('');

  // Catégorie filtrée sélectionnée
  readonly categorieSelectionnee = signal<string | null>(null);

  // Filtres compris par l'IA après une recherche vocale (remplacent la recherche textuelle)
  readonly filtresVocaux = signal<AnalyseRechercheVocale | null>(null);

  // Liste filtrée des restaurants
  readonly listeRestaurantsFiltree = computed(() => {
    const recherche = this.texteRecherche().trim().toLowerCase();
    const cat = this.categorieSelectionnee();
    const vocal = this.filtresVocaux();

    const restaurants = this.serviceCatalogue.restaurants().filter((resto) => {
      const correspondRecherche = vocal
        ? this.correspondAuxFiltresVocaux(resto, vocal)
        : !recherche ||
          resto.nom.toLowerCase().includes(recherche) ||
          resto.specialite.toLowerCase().includes(recherche) ||
          resto.quartierVille.toLowerCase().includes(recherche);

      const correspondCategorie =
        !cat ||
        resto.specialite.toLowerCase().includes(cat.toLowerCase()) ||
        (resto.plats && resto.plats.some((p) => (p.categorie || '').toLowerCase().includes(cat.toLowerCase())));

      return correspondRecherche && correspondCategorie;
    });

    // « Pas cher » : les restaurants dont le plat demandé est le moins cher d'abord
    if (vocal?.tri === 'PRIX') {
      return [...restaurants].sort((a, b) => this.prixMinimum(a, vocal) - this.prixMinimum(b, vocal));
    }
    return restaurants;
  });

  // Plats réels disponibles à la carte
  readonly platsPopulaires = computed<Plat[]>(() => {
    const depuisRestos = this.serviceCatalogue.restaurants().flatMap((r) => r.plats ?? []);
    if (depuisRestos.length > 0) return depuisRestos.slice(0, 12);
    return this.serviceCatalogue.plats().slice(0, 12);
  });

  /**
   * Sélectionne ou désélectionne une catégorie.
   */
  filtrerParCategorie(nomCategorie: string): void {
    if (this.categorieSelectionnee() === nomCategorie) {
      this.categorieSelectionnee.set(null);
    } else {
      this.categorieSelectionnee.set(nomCategorie);
    }
  }

  /**
   * Ouvre la fiche de profil d'un restaurant (navigue directement vers son profil).
   */
  ouvrirRestaurant(identifiantRestaurant: string): void {
    this.routeur.navigate(['/restaurant', identifiantRestaurant]);
  }

  /** Saisie au clavier : la recherche écrite remplace la recherche vocale. */
  modifierTexteRecherche(texte: string): void {
    this.filtresVocaux.set(null);
    this.messageVocal.set(null);
    this.texteRecherche.set(texte);
  }

  reinitialiserFiltres(): void {
    this.texteRecherche.set('');
    this.categorieSelectionnee.set(null);
    this.filtresVocaux.set(null);
    this.messageVocal.set(null);
  }

  // ---------------------------------------------------------------------------
  // Recherche vocale intelligente
  // ---------------------------------------------------------------------------
  // Reconnaissance de la parole : Chrome, Edge et Safari uniquement
  private readonly ReconnaissanceVocale =
    typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  readonly ecouteEnCours = signal<boolean>(false);
  readonly analyseEnCours = signal<boolean>(false);
  readonly messageVocal = signal<string | null>(null);

  private mediaRecorderCatalogue: MediaRecorder | null = null;
  private morceauxAudioCatalogue: Blob[] = [];

  /** Écoute la phrase du client avec Whisper, puis l'IA la transforme en filtres de recherche. */
  lancerRechercheVocale(): void {
    if (this.ecouteEnCours() || this.analyseEnCours()) {
      this.arreterRechercheVocale();
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      this.messageVocal.set(null);
      navigator.mediaDevices.getUserMedia({ audio: true }).then((flux) => {
        this.morceauxAudioCatalogue = [];
        this.mediaRecorderCatalogue = new MediaRecorder(flux);

        this.mediaRecorderCatalogue.ondataavailable = (evenement) => {
          if (evenement.data && evenement.data.size > 0) {
            this.morceauxAudioCatalogue.push(evenement.data);
          }
        };

        this.mediaRecorderCatalogue.onstop = () => {
          flux.getTracks().forEach((track) => track.stop());
          const blob = new Blob(this.morceauxAudioCatalogue, { type: 'audio/webm' });
          this.analyseEnCours.set(true);
          this.serviceIa.transcrireAudio(blob).subscribe({
            next: (res) => {
              if (res.succes && res.texte) {
                this.analyserPhrase(res.texte);
              } else {
                this.analyseEnCours.set(false);
                this.messageVocal.set(res.message || "Je n'ai pas bien compris votre note vocale. Réessayez !");
              }
            },
            error: () => {
              this.analyseEnCours.set(false);
              this.messageVocal.set("La transcription vocale Whisper a rencontré une difficulté. Réessayez !");
            }
          });
        };

        this.mediaRecorderCatalogue.start();
        this.ecouteEnCours.set(true);

        // Arrêt automatique après 6 secondes d'écoute max si l'utilisateur n'appuie pas sur stop
        setTimeout(() => {
          if (this.ecouteEnCours()) {
            this.arreterRechercheVocale();
          }
        }, 6000);
      }).catch((err) => {
        console.warn("MediaRecorder indisponible, tentative Web Speech API...", err);
        this.lancerRechercheVocaleNavigateur();
      });
      return;
    }

    this.lancerRechercheVocaleNavigateur();
  }

  arreterRechercheVocale(): void {
    if (this.mediaRecorderCatalogue && this.mediaRecorderCatalogue.state !== 'inactive') {
      this.mediaRecorderCatalogue.stop();
      this.ecouteEnCours.set(false);
    }
  }

  private lancerRechercheVocaleNavigateur(): void {
    if (!this.ReconnaissanceVocale) {
      this.messageVocal.set(
        "Votre navigateur ne permet pas la recherche vocale. Utilisez Chrome ou tapez votre recherche."
      );
      return;
    }
    const reconnaissance = new this.ReconnaissanceVocale();
    reconnaissance.lang = 'fr-FR';
    reconnaissance.interimResults = false;
    reconnaissance.onresult = (evenement: any) => this.analyserPhrase(evenement.results[0][0].transcript);
    reconnaissance.onend = () => this.ecouteEnCours.set(false);
    reconnaissance.onerror = (evenement: any) => {
      this.ecouteEnCours.set(false);
      if (evenement?.error === 'not-allowed' || evenement?.error === 'service-not-allowed') {
        this.messageVocal.set("L'accès au micro est refusé. Autorisez le micro dans votre navigateur pour parler.");
      } else if (evenement?.error === 'no-speech') {
        this.messageVocal.set("Je n'ai rien entendu. Appuyez sur le micro et dites par exemple « un yassa pas cher ».");
      } else if (evenement?.error !== 'aborted') {
        this.messageVocal.set("La reconnaissance vocale n'a pas fonctionné. Réessayez ou tapez votre recherche.");
      }
    };
    this.messageVocal.set(null);
    this.ecouteEnCours.set(true);
    reconnaissance.start();
  }

  private analyserPhrase(phrase: string): void {
    const texte = phrase.trim();
    if (!texte) return;
    this.texteRecherche.set(texte);
    this.analyseEnCours.set(true);
    this.serviceIa.analyserRechercheVocale(texte).subscribe({
      next: (analyse) => {
        this.analyseEnCours.set(false);
        this.filtresVocaux.set(analyse);
      },
      error: () => {
        // Sans réponse du serveur, la phrase reste une recherche écrite classique.
        this.analyseEnCours.set(false);
        this.messageVocal.set("La recherche intelligente est indisponible : recherche simple sur votre phrase.");
      }
    });
  }

  /** Libellés des filtres compris, affichés sous la barre de recherche. */
  readonly etiquettesVocales = computed<string[]>(() => {
    const vocal = this.filtresVocaux();
    if (!vocal) return [];
    const etiquettes = [...vocal.specialites, ...vocal.mots_libres];
    if (vocal.quartier) etiquettes.push(`📍 ${vocal.quartier}`);
    if (vocal.budget_max_fcfa) etiquettes.push(`≤ ${vocal.budget_max_fcfa.toLocaleString('fr-FR')} FCFA`);
    if (vocal.tri === 'PRIX') etiquettes.push('Pas cher');
    if (vocal.ouvert_seulement) etiquettes.push('Ouvert maintenant');
    return etiquettes;
  });

  private termesVocaux(vocal: AnalyseRechercheVocale): string[] {
    return [...vocal.termes_recherche, ...vocal.mots_libres].map(normaliser).filter(Boolean);
  }

  /** Plats du restaurant qui répondent à la demande (plat demandé et budget). */
  private platsCorrespondants(resto: Restaurant, vocal: AnalyseRechercheVocale, restoCorrespond: boolean): Plat[] {
    const termes = this.termesVocaux(vocal);
    return (resto.plats ?? []).filter((plat) => {
      const platCorrespond =
        restoCorrespond || termes.length === 0 || contientUnTerme(`${plat.nom} ${plat.description} ${plat.categorie}`, termes);
      const dansLeBudget = !vocal.budget_max_fcfa || plat.prixFcfa <= vocal.budget_max_fcfa;
      return platCorrespond && dansLeBudget;
    });
  }

  private restaurantCorrespondAuTexte(resto: Restaurant, vocal: AnalyseRechercheVocale): boolean {
    const termes = this.termesVocaux(vocal);
    return termes.length > 0 && contientUnTerme(`${resto.nom} ${resto.nomUtilisateur} ${resto.specialite} ${resto.description}`, termes);
  }

  private correspondAuxFiltresVocaux(resto: Restaurant, vocal: AnalyseRechercheVocale): boolean {
    if (vocal.ouvert_seulement && !resto.estOuvert) return false;
    if (vocal.quartier && !contientUnTerme(`${resto.quartierVille} ${resto.adresse}`, [normaliser(vocal.quartier)])) {
      return false;
    }
    const termes = this.termesVocaux(vocal);
    const restoCorrespond = this.restaurantCorrespondAuTexte(resto, vocal);
    // Ni plat demandé ni budget : quartier / ouverture suffisent
    if (termes.length === 0 && !vocal.budget_max_fcfa) return true;
    return this.platsCorrespondants(resto, vocal, restoCorrespond).length > 0 || (restoCorrespond && !vocal.budget_max_fcfa);
  }

  private prixMinimum(resto: Restaurant, vocal: AnalyseRechercheVocale): number {
    const plats = this.platsCorrespondants(resto, vocal, this.restaurantCorrespondAuTexte(resto, vocal));
    return plats.length ? Math.min(...plats.map((p) => p.prixFcfa)) : Number.POSITIVE_INFINITY;
  }

  /**
   * Ouvre la fiche détaillée d'un plat (Image 1).
   */
  ouvrirDetailPlat(plat: Plat): void {
    this.serviceCatalogue.ouvrirDetailPlat(plat);
  }
}
