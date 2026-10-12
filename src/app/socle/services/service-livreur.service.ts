/**
 * Service gérant l'état et le flux de travail du livreur AYYOU.
 * Conforme aux maquettes : statut disponible, proposition de course, compte à rebours et navigation GPS.
 */

import { Injectable, signal } from '@angular/core';
import {
  ActiviteJourLivreur,
  DetailGainJournalier,
  EtapeCourseLivreur,
  LivreurProfil,
  PropositionLivraison
} from '../modeles/livreur.modele';

@Injectable({
  providedIn: 'root'
})
export class ServiceLivreurService {
  // Profil du livreur connecté (Moussa Diop)
  readonly profilLivreur = signal<LivreurProfil>({
    nomComplet: 'Moussa Diop',
    adressePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    vehicule: 'Yamaha TMAX',
    estDisponible: true,
    gainsDuJourFcfa: 12500,
    nombreLivraisonsJour: 8
  });

  // Gains de la semaine (Image 2)
  readonly gainsSemaine = signal({
    montantTotalFcfa: 85000,
    pourcentageEvolution: 12,
    livraisonsSemaine: 42,
    heuresEnLigne: '28h 15m'
  });

  // Activité hebdomadaire pour le graphique (Image 2)
  readonly activiteHebdomadaire = signal<ActiviteJourLivreur[]>([
    { jour: 'Lun', montantFcfa: 11000, hauteurPourcentage: 62 },
    { jour: 'Mar', montantFcfa: 14000, hauteurPourcentage: 80 },
    { jour: 'Mer', montantFcfa: 10000, hauteurPourcentage: 55 },
    { jour: 'Jeu', montantFcfa: 12500, hauteurPourcentage: 70 },
    { jour: 'Ven', montantFcfa: 13000, hauteurPourcentage: 74 },
    { jour: 'Sam', montantFcfa: 18000, hauteurPourcentage: 98 },
    { jour: 'Dim', montantFcfa: 5000, hauteurPourcentage: 35 }
  ]);

  // Détails quotidiens (Image 2)
  readonly detailsQuotidiens = signal<DetailGainJournalier[]>([
    {
      titreDate: "Aujourd'hui",
      nombreLivraisons: 8,
      montantFcfa: 12500,
      icone: 'fa-regular fa-calendar-check',
      couleurFond: 'bg-amber-100/70 text-red-600'
    },
    {
      titreDate: 'Hier',
      nombreLivraisons: 11,
      montantFcfa: 15000,
      icone: 'fa-solid fa-clock-rotate-left',
      couleurFond: 'bg-slate-100 text-slate-500'
    },
    {
      titreDate: 'Samedi, 20 Mai',
      nombreLivraisons: 14,
      montantFcfa: 18000,
      icone: 'fa-regular fa-calendar',
      couleurFond: 'bg-slate-100 text-slate-500'
    },
    {
      titreDate: 'Vendredi, 19 Mai',
      nombreLivraisons: 9,
      montantFcfa: 14000,
      icone: 'fa-regular fa-calendar',
      couleurFond: 'bg-slate-100 text-slate-500'
    }
  ]);

  // Proposition de course en attente de réponse (Image 2)
  readonly propositionActive = signal<PropositionLivraison | null>(null);

  // Course en cours acceptée (Images suivantes)
  readonly courseEnCours = signal<PropositionLivraison | null>({
    identifiantCommande: '4521',
    restaurantNom: 'Le Teranga',
    restaurantAdresse: 'Plateau, Dakar',
    restaurantTelephone: '+221 33 821 00 11',
    comptoirRetrait: 'Allée A - Section 2',
    clientNom: 'Amadou Sow',
    clientTelephone: '+221 77 821 44 90',
    clientAdresse: 'Almadies, Villa 45',
    clientInstructions: "Sonner à l'entrée, 2ème étage à droite.",
    distanceKm: 3.2,
    gainFcfa: 1500,
    tempsRestantSec: 22,
    tempsTrajetMin: 6,
    codeValidation: '8245',
    articles: [
      {
        nom: 'Thieboudienne',
        quantite: 2,
        format: 'Classique',
        instructions: 'Extra piment, Format familial',
        estVerifie: false
      },
      {
        nom: 'Jus de Bissap',
        quantite: 1,
        format: '50cl',
        instructions: 'Bien frais',
        estVerifie: false
      },
      {
        nom: 'Alloco',
        quantite: 1,
        format: 'Portion',
        instructions: '',
        estVerifie: false
      }
    ],
    photoCommande: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300'
  });

  // Étape actuelle dans la livraison acceptée
  readonly etapeCourse = signal<EtapeCourseLivreur>('VERS_RESTAURANT');

  // Compte à rebours de la proposition en secondes
  readonly secondesRestantes = signal<number>(22);

  private intervalleCompteARebours?: any;

  /**
   * Bascule le statut Disponible / Hors-ligne du livreur.
   */
  basculerDisponibilite(): void {
    this.profilLivreur.update((p) => ({
      ...p,
      estDisponible: !p.estDisponible
    }));
  }

  /**
   * Simule la réception d'une nouvelle proposition de livraison.
   */
  declencherNouvelleProposition(): void {
    this.secondesRestantes.set(22);
    this.propositionActive.set({
      identifiantCommande: '4521',
      restaurantNom: 'Le Teranga',
      restaurantAdresse: 'Plateau, Dakar',
      restaurantTelephone: '+221 33 821 00 11',
      comptoirRetrait: 'Allée A - Section 2',
      clientNom: 'Amadou Sow',
      clientTelephone: '+221 77 821 44 90',
      clientAdresse: 'Almadies, Villa 45',
      clientInstructions: "Sonner à l'entrée, 2ème étage à droite.",
      distanceKm: 3.2,
      gainFcfa: 1500,
      tempsRestantSec: 22,
      tempsTrajetMin: 6,
      codeValidation: '8245',
      articles: [
        {
          nom: 'Thieboudienne',
          quantite: 2,
          format: 'Classique',
          instructions: 'Extra piment, Format familial',
          estVerifie: false
        },
        {
          nom: 'Jus de Bissap',
          quantite: 1,
          format: '50cl',
          instructions: 'Bien frais',
          estVerifie: false
        },
        {
          nom: 'Alloco',
          quantite: 1,
          format: 'Portion',
          instructions: '',
          estVerifie: false
        }
      ],
      photoCommande: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300'
    });

    if (this.intervalleCompteARebours) {
      clearInterval(this.intervalleCompteARebours);
    }

    this.intervalleCompteARebours = setInterval(() => {
      if (this.secondesRestantes() > 1) {
        this.secondesRestantes.update((s) => s - 1);
      } else {
        this.refuserProposition();
      }
    }, 1000);
  }

  /**
   * Accepte la proposition de livraison et démarre la navigation GPS vers le resto.
   */
  accepterProposition(): void {
    if (this.intervalleCompteARebours) {
      clearInterval(this.intervalleCompteARebours);
    }
    const prop = this.propositionActive();
    if (prop) {
      this.courseEnCours.set(prop);
    }
    this.etapeCourse.set('VERS_RESTAURANT');
    this.propositionActive.set(null);
  }

  /**
   * Refuse la proposition de livraison et retourne en attente.
   */
  refuserProposition(): void {
    if (this.intervalleCompteARebours) {
      clearInterval(this.intervalleCompteARebours);
    }
    this.propositionActive.set(null);
  }

  /**
   * Coche ou décoche la vérification d'un article au restaurant (Image 1).
   */
  basculerArticleVerifie(index: number): void {
    const course = this.courseEnCours();
    if (!course) return;

    const nouveauxArticles = course.articles.map((art, i) =>
      i === index ? { ...art, estVerifie: !art.estVerifie } : art
    );

    this.courseEnCours.set({
      ...course,
      articles: nouveauxArticles
    });
  }

  /**
   * Coche tous les articles d'un coup.
   */
  cocherTousArticles(): void {
    const course = this.courseEnCours();
    if (!course) return;

    const nouveauxArticles = course.articles.map((art) => ({
      ...art,
      estVerifie: true
    }));

    this.courseEnCours.set({
      ...course,
      articles: nouveauxArticles
    });
  }

  /**
   * Vérifie si tous les articles sont cochés.
   */
  tousArticlesSontVerifies(): boolean {
    const course = this.courseEnCours();
    if (!course || course.articles.length === 0) return true;
    return course.articles.every((art) => art.estVerifie);
  }

  /**
   * Valide le code de confirmation saisi par le livreur (Image 3).
   */
  verifierCodeValidation(codeSaisi: string): boolean {
    const course = this.courseEnCours();
    if (!course) return false;
    // Accepte le code exact ou tout code de démo à 4 chiffres si besoin, par exemple '8245'
    return codeSaisi.length === 4;
  }

  /**
   * Avance à l'étape suivante de la course.
   */
  avancerEtapeCourse(nouvelleEtape?: EtapeCourseLivreur): void {
    if (nouvelleEtape) {
      this.etapeCourse.set(nouvelleEtape);
      return;
    }

    switch (this.etapeCourse()) {
      case 'VERS_RESTAURANT':
        this.etapeCourse.set('ARRIVE_RESTAURANT');
        break;
      case 'ARRIVE_RESTAURANT':
        this.etapeCourse.set('VERS_CLIENT');
        break;
      case 'VERS_CLIENT':
        this.etapeCourse.set('VALIDATION_CODE');
        break;
      case 'VALIDATION_CODE':
        this.terminerCourse();
        break;
    }
  }

  /**
   * Termine la course, crédite le gain et revient à l'état d'attente.
   */
  terminerCourse(): void {
    const course = this.courseEnCours();
    if (course) {
      this.profilLivreur.update((p) => ({
        ...p,
        gainsDuJourFcfa: p.gainsDuJourFcfa + course.gainFcfa,
        nombreLivraisonsJour: p.nombreLivraisonsJour + 1
      }));
    }
    this.etapeCourse.set('LIVRE');
  }
}
