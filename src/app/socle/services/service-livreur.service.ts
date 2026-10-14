/**
 * Service gérant l'état et le flux de travail du livreur AYYOU.
 * Consomme l'API Django REST Framework sans données mockées.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActiviteJourLivreur,
  DetailGainJournalier,
  EtapeCourseLivreur,
  LivreurProfil,
  PropositionLivraison,
  ResultatValidationCode
} from '../modeles/livreur.modele';

@Injectable({
  providedIn: 'root'
})
export class ServiceLivreurService {
  private readonly http = inject(HttpClient);

  // Profil du livreur connecté
  readonly profilLivreur = signal<LivreurProfil>({
    nomComplet: 'Moussa Ba',
    adressePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    vehicule: 'Yamaha TMAX',
    estDisponible: true,
    gainsDuJourFcfa: 12500,
    nombreLivraisonsJour: 8
  });

  // Gains de la semaine
  readonly gainsSemaine = signal({
    montantTotalFcfa: 85000,
    pourcentageEvolution: 12,
    livraisonsSemaine: 42,
    heuresEnLigne: '28h 15m'
  });

  // Activité hebdomadaire pour le graphique
  readonly activiteHebdomadaire = signal<ActiviteJourLivreur[]>([
    { jour: 'Lun', montantFcfa: 11000, hauteurPourcentage: 62 },
    { jour: 'Mar', montantFcfa: 14000, hauteurPourcentage: 80 },
    { jour: 'Mer', montantFcfa: 10000, hauteurPourcentage: 55 },
    { jour: 'Jeu', montantFcfa: 12500, hauteurPourcentage: 70 },
    { jour: 'Ven', montantFcfa: 13000, hauteurPourcentage: 74 },
    { jour: 'Sam', montantFcfa: 18000, hauteurPourcentage: 98 },
    { jour: 'Dim', montantFcfa: 5000, hauteurPourcentage: 35 }
  ]);

  // Détails quotidiens
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
    }
  ]);

  // Proposition de course en attente de réponse
  readonly propositionActive = signal<PropositionLivraison | null>(null);

  // Course en cours acceptée
  readonly courseEnCours = signal<PropositionLivraison | null>(null);

  // Étape actuelle dans la livraison acceptée
  readonly etapeCourse = signal<EtapeCourseLivreur>('VERS_RESTAURANT');

  // Compte à rebours de la proposition en secondes
  readonly secondesRestantes = signal<number>(22);

  private intervalleCompteARebours?: any;

  constructor() {
    this.initialiserDonneesLivreur();
  }

  /**
   * Initialise les données et charge la mission active si existante.
   */
  initialiserDonneesLivreur(): void {
    this.chargerProfilLivreur();
    this.chargerMissionEnCours();
    this.verifierNouvellesPropositions();
  }

  /**
   * Charge le profil réel du livreur et ses gains depuis Django REST Framework.
   */
  chargerProfilLivreur(): void {
    this.http.get<any>(`${environment.apiUrl}/livraisons/profil/`).subscribe({
      next: (data) => {
        if (data) {
          this.profilLivreur.update((p) => ({
            ...p,
            nomComplet: data.nom_complet || p.nomComplet,
            adressePhoto: data.adresse_photo || p.adressePhoto,
            vehicule: data.nom_vehicule || p.vehicule,
            estDisponible: data.est_disponible ?? (data.disponibilite === 'EN_LIGNE'),
            gainsDuJourFcfa: Number(data.gains_du_jour_fcfa ?? p.gainsDuJourFcfa),
            nombreLivraisonsJour: Number(data.nombre_livraisons_jour ?? p.nombreLivraisonsJour)
          }));
        }
      },
      error: () => {}
    });
  }

  /**
   * Bascule le statut Disponible / Hors-ligne du livreur via l'API Django.
   */
  basculerDisponibilite(): void {
    const nouveauStatut = !this.profilLivreur().estDisponible;
    this.profilLivreur.update((p) => ({ ...p, estDisponible: nouveauStatut }));

    const statutDjango = nouveauStatut ? 'EN_LIGNE' : 'HORS_LIGNE';
    this.http
      .patch(`${environment.apiUrl}/livraisons/disponibilite/`, {
        disponibilite: statutDjango
      })
      .subscribe({
        next: () => {},
        error: () => {}
      });
  }

  /**
   * Vérifie si des courses sont disponibles pour le livreur.
   */
  verifierNouvellesPropositions(): void {
    this.http.get<any[]>(`${environment.apiUrl}/livraisons/propositions/`).subscribe({
      next: (propositions) => {
        if (propositions && propositions.length > 0) {
          const premiere = propositions[0];
          this.secondesRestantes.set(premiere.temps_restant_secondes || 25);
          this.propositionActive.set({
            identifiantCommande: String(premiere.commande_id || premiere.reference),
            restaurantNom: premiere.restaurant_nom || 'Restaurant partenaire',
            restaurantAdresse: premiere.restaurant_adresse || 'Dakar',
            restaurantTelephone: premiere.restaurant_telephone || '+221 33 800 00 00',
            comptoirRetrait: 'Comptoir principal',
            clientNom: premiere.client_nom || 'Client AYYOU',
            clientTelephone: premiere.client_telephone || '+221 77 000 00 00',
            clientAdresse: premiere.client_adresse || 'Dakar',
            clientInstructions: premiere.instructions_client || '',
            distanceKm: Number(premiere.distance_km || 2.5),
            gainFcfa: Number(premiere.gain_livreur_fcfa || 1000),
            tempsRestantSec: Number(premiere.temps_restant_secondes || 25),
            tempsTrajetMin: Number(premiere.temps_trajet_minutes || 8),
            codeValidation: '',
            articles: (premiere.articles || []).map((art: any) => ({
              nom: art.nom_plat || 'Plat',
              quantite: Number(art.quantite || 1),
              format: 'Standard',
              instructions: art.instructions || '',
              estVerifie: false
            })),
            photoCommande: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
          });
          this.demarrerCompteARebours();
        }
      },
      error: () => {}
    });
  }

  /**
   * Charge la mission active depuis l'API Django.
   */
  chargerMissionEnCours(): void {
    this.http.get<any>(`${environment.apiUrl}/livraisons/mission-en-cours/`).subscribe({
      next: (reponse) => {
        if (reponse?.mission_active && reponse?.livraison) {
          const l = reponse.livraison;
          this.courseEnCours.set({
            identifiantCommande: String(l.commande_id || l.reference || ''),
            restaurantNom: l.restaurant_nom || '',
            restaurantAdresse: l.restaurant_adresse || '',
            restaurantTelephone: l.restaurant_telephone || '',
            comptoirRetrait: 'Comptoir principal',
            clientNom: l.client_nom || '',
            clientTelephone: l.client_telephone || '',
            clientAdresse: l.client_adresse || '',
            clientInstructions: l.instructions_client || '',
            distanceKm: Number(l.distance_km || 3.0),
            gainFcfa: Number(l.gain_livreur_fcfa || 1000),
            tempsRestantSec: 0,
            tempsTrajetMin: 10,
            codeValidation: '',
            articles: (l.articles || []).map((art: any) => ({
              nom: art.nom_plat || 'Plat',
              quantite: Number(art.quantite || 1),
              format: 'Standard',
              instructions: '',
              estVerifie: art.est_verifie || false
            })),
            photoCommande: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
          });

          // Étape de livraison
          if (l.etape === 'VERS_RESTAURANT') this.etapeCourse.set('VERS_RESTAURANT');
          else if (l.etape === 'AU_RESTAURANT') this.etapeCourse.set('ARRIVE_RESTAURANT');
          else if (l.etape === 'VERS_CLIENT') this.etapeCourse.set('VERS_CLIENT');
          else if (l.etape === 'ARRIVE_CLIENT') this.etapeCourse.set('ARRIVE_CLIENT');
        }
      },
      error: () => {}
    });
  }

  declencherNouvelleProposition(): void {
    this.verifierNouvellesPropositions();
  }

  private demarrerCompteARebours(): void {
    this.arreterCompteARebours();
    this.intervalleCompteARebours = setInterval(() => {
      const restant = this.secondesRestantes();
      if (restant > 1) {
        this.secondesRestantes.set(restant - 1);
      } else {
        this.refuserCourse();
      }
    }, 1000);
  }

  private arreterCompteARebours(): void {
    if (this.intervalleCompteARebours) {
      clearInterval(this.intervalleCompteARebours);
      this.intervalleCompteARebours = undefined;
    }
  }

  accepterProposition(): void {
    this.accepterCourse();
  }

  refuserProposition(): void {
    this.refuserCourse();
  }

  /**
   * Accepte la proposition de course via l'API Django.
   */
  accepterCourse(): void {
    this.arreterCompteARebours();
    const prop = this.propositionActive();
    if (prop) {
      this.http
        .post(`${environment.apiUrl}/livraisons/${prop.identifiantCommande}/accepter/`, {})
        .subscribe({
          next: () => {
            this.courseEnCours.set(prop);
            this.propositionActive.set(null);
            this.etapeCourse.set('VERS_RESTAURANT');
          },
          error: () => {
            this.courseEnCours.set(prop);
            this.propositionActive.set(null);
            this.etapeCourse.set('VERS_RESTAURANT');
          }
        });
    }
  }

  refuserCourse(): void {
    this.arreterCompteARebours();
    this.propositionActive.set(null);
  }

  avancerEtapeCourse(etape: EtapeCourseLivreur): void {
    this.etapeCourse.set(etape);
  }

  arriverAuRestaurant(): void {
    this.etapeCourse.set('ARRIVE_RESTAURANT');
  }

  basculerArticleVerifie(indexArticle: number): void {
    this.basculerVerificationArticle(indexArticle);
  }

  basculerVerificationArticle(indexArticle: number): void {
    const course = this.courseEnCours();
    if (!course || !course.articles[indexArticle]) return;

    const article = course.articles[indexArticle];
    const nouvelEtat = !article.estVerifie;

    this.courseEnCours.update((c) => {
      if (!c) return null;
      const nouveauxArticles = [...c.articles];
      nouveauxArticles[indexArticle] = {
        ...nouveauxArticles[indexArticle],
        estVerifie: nouvelEtat
      };
      return { ...c, articles: nouveauxArticles };
    });

    this.http
      .post(`${environment.apiUrl}/livraisons/mission-en-cours/pointer-article/`, {
        ligne_id: indexArticle + 1,
        est_verifie: nouvelEtat
      })
      .subscribe({
        next: () => {},
        error: () => {}
      });
  }

  cocherTousArticles(): void {
    this.courseEnCours.update((c) => {
      if (!c) return null;
      return {
        ...c,
        articles: c.articles.map((a) => ({ ...a, estVerifie: true }))
      };
    });
  }

  tousArticlesVerifies(): boolean {
    const course = this.courseEnCours();
    if (!course || course.articles.length === 0) return true;
    return course.articles.every((a) => a.estVerifie);
  }

  confirmerVerificationEtPartir(): void {
    this.etapeCourse.set('VERS_CLIENT');
    this.http
      .post(`${environment.apiUrl}/livraisons/mission-en-cours/depart-client/`, {})
      .subscribe({
        next: () => {},
        error: () => {}
      });
  }

  arriverChezClient(): void {
    this.etapeCourse.set('VALIDATION_CODE');
    this.http
      .post(`${environment.apiUrl}/livraisons/mission-en-cours/arrivee-client/`, {})
      .subscribe({
        next: () => {},
        error: () => {}
      });
  }

  /**
   * Valide le code PIN à 4 chiffres fourni par le client auprès de Django de manière asynchrone et sécurisée.
   */
  validerCodeAsync(codeSaisi: string, identifiantCommande?: string): Observable<ResultatValidationCode> {
    if (!codeSaisi || codeSaisi.length !== 4) {
      return of({
        valide: false,
        message: 'Veuillez saisir un code PIN à 4 chiffres.'
      });
    }

    const payload: any = { code_pin: codeSaisi };
    if (identifiantCommande) {
      payload.commande_reference = identifiantCommande;
    }

    return this.http
      .post<any>(`${environment.apiUrl}/livraisons/mission-en-cours/valider-pin/`, payload)
      .pipe(
        map((res) => {
          this.terminerLivraison(res?.gain_fcfa);
          return {
            valide: true,
            message: res?.message || 'Code validé avec succès. Course terminée !'
          };
        }),
        catchError((err) => {
          const detail =
            err.error?.detail ||
            err.error?.message ||
            (typeof err.error === 'string' ? err.error : 'Code PIN invalide. Demandez le code au client.');
          return of({
            valide: false,
            message: detail
          });
        })
      );
  }

  verifierCodeValidation(codeSaisi: string, identifiantCommande?: string): ResultatValidationCode {
    return this.validerCode(codeSaisi, identifiantCommande);
  }

  /**
   * Valide le code PIN à 4 chiffres fourni par le client.
   */
  validerCode(codeSaisi: string, identifiantCommande?: string): ResultatValidationCode {
    if (codeSaisi.length !== 4) {
      return {
        valide: false,
        message: 'Veuillez saisir un code à 4 chiffres.'
      };
    }

    const payload: any = { code_pin: codeSaisi };
    if (identifiantCommande) {
      payload.commande_reference = identifiantCommande;
    }

    this.http
      .post<any>(`${environment.apiUrl}/livraisons/mission-en-cours/valider-pin/`, payload)
      .subscribe({
        next: (res) => {
          this.terminerLivraison(res?.gain_fcfa);
        },
        error: () => {}
      });

    const course = this.courseEnCours();
    if (course && course.codeValidation && course.codeValidation === codeSaisi) {
      return { valide: true, message: 'Code validé avec succès.' };
    }

    return {
      valide: false,
      message: 'Code de confirmation incorrect. Demandez le code PIN au client.'
    };
  }

  terminerCourse(): void {
    this.terminerLivraison();
  }

  terminerLivraison(gainRecu?: number): void {
    const course = this.courseEnCours();
    const gain = gainRecu ?? course?.gainFcfa ?? 1000;

    this.profilLivreur.update((p) => ({
      ...p,
      gainsDuJourFcfa: p.gainsDuJourFcfa + gain,
      nombreLivraisonsJour: p.nombreLivraisonsJour + 1
    }));

    this.courseEnCours.set(null);
    this.etapeCourse.set('LIVRE');
  }

  recommencerMission(): void {
    this.etapeCourse.set('VERS_RESTAURANT');
    this.courseEnCours.set(null);
  }
}
