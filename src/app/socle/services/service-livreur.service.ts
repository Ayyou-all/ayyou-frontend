/**
 * Service gérant l'état et le flux de travail du livreur AYYOU.
 * Consomme l'API Django REST Framework sans données mockées statiques.
 * Réception en temps réel des commandes clients avec alerte sonore.
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
import { ServiceAuthentification } from './service-authentification.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceLivreurService {
  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);

  // Profil réel du livreur connecté (initialisé sans fausses données)
  readonly profilLivreur = signal<LivreurProfil>({
    nomComplet: '',
    adressePhoto: '',
    vehicule: '',
    estDisponible: true,
    gainsDuJourFcfa: 0,
    nombreLivraisonsJour: 0,
    typeVehicule: 'MOTO',
    nomVehicule: '',
    immatriculation: '',
    zonePrincipale: ''
  });

  // Gains réels de la semaine issus de la base de données
  readonly gainsSemaine = signal({
    montantTotalFcfa: 0,
    pourcentageEvolution: 0,
    livraisonsSemaine: 0,
    heuresEnLigne: '0h'
  });

  // Activité hebdomadaire réelle pour le graphique
  readonly activiteHebdomadaire = signal<ActiviteJourLivreur[]>([
    { jour: 'Lun', montantFcfa: 0, hauteurPourcentage: 6 },
    { jour: 'Mar', montantFcfa: 0, hauteurPourcentage: 6 },
    { jour: 'Mer', montantFcfa: 0, hauteurPourcentage: 6 },
    { jour: 'Jeu', montantFcfa: 0, hauteurPourcentage: 6 },
    { jour: 'Ven', montantFcfa: 0, hauteurPourcentage: 6 },
    { jour: 'Sam', montantFcfa: 0, hauteurPourcentage: 6 },
    { jour: 'Dim', montantFcfa: 0, hauteurPourcentage: 6 }
  ]);

  // Détails quotidiens réels
  readonly detailsQuotidiens = signal<DetailGainJournalier[]>([]);

  // Proposition de course en attente de réponse (temps réel)
  readonly propositionActive = signal<PropositionLivraison | null>(null);

  // Course en cours acceptée
  readonly courseEnCours = signal<PropositionLivraison | null>(null);

  // Étape actuelle dans la livraison acceptée
  readonly etapeCourse = signal<EtapeCourseLivreur>('VERS_RESTAURANT');

  // Compte à rebours de la proposition en secondes
  readonly secondesRestantes = signal<number>(30);

  private intervalleCompteARebours?: any;
  private intervalleEcouteTempsReel?: any;

  constructor() {
    this.initialiserDonneesLivreur();
    this.demarrerEcouteTempsReel();
  }

  /**
   * Initialise les données et charge la mission active si existante.
   */
  initialiserDonneesLivreur(): void {
    const user = this.serviceAuth.utilisateurConnecte();
    if (user && user.role === 'LIVREUR') {
      const nomCompletCalcule = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.courriel || '';
      this.profilLivreur.update((p) => ({
        ...p,
        nomComplet: nomCompletCalcule || p.nomComplet,
        prenom: user.prenom || p.prenom || '',
        nom: user.nom || p.nom || '',
        courriel: user.courriel || p.courriel || '',
        telephone: user.telephone || p.telephone || '',
        adresse: user.adresse || p.adresse || '',
        adressePhoto: user.adressePhoto || p.adressePhoto || '',
        typeVehicule: user.typeVehicule || p.typeVehicule || 'MOTO',
        nomVehicule: user.nomVehicule || p.nomVehicule || '',
        immatriculation: user.immatriculation || p.immatriculation || '',
        zonePrincipale: user.zonePrincipale || p.zonePrincipale || ''
      }));
    }
    this.chargerProfilLivreur();
    this.chargerMissionEnCours();
    this.verifierNouvellesPropositions();
  }

  /**
   * Récupère le profil réel du livreur et ses gains depuis Django REST Framework (retourne l'Observable).
   */
  recupererProfilLivreur(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/livraisons/profil/`).pipe(
      tap((data) => {
        if (data) {
          const nomCompletCalcule =
            data.nomComplet ||
            data.nom_complet ||
            `${data.prenom || ''} ${data.nom || ''}`.trim() ||
            this.profilLivreur().nomComplet;

          this.profilLivreur.update((p) => ({
            ...p,
            nomComplet: nomCompletCalcule,
            prenom: data.prenom ?? p.prenom ?? '',
            nom: data.nom ?? p.nom ?? '',
            courriel: data.courriel ?? p.courriel ?? '',
            telephone: data.telephone ?? p.telephone ?? '',
            adresse: data.adresse ?? p.adresse ?? '',
            adressePhoto: data.adressePhoto || data.adresse_photo || p.adressePhoto,
            vehicule: data.nomVehicule || data.nom_vehicule || (data.typeVehicule || data.type_vehicule ? `${data.typeVehicule || data.type_vehicule}` : p.vehicule),
            typeVehicule: data.typeVehicule || data.type_vehicule || p.typeVehicule || 'MOTO',
            nomVehicule: data.nomVehicule ?? data.nom_vehicule ?? p.nomVehicule ?? '',
            immatriculation: data.immatriculation ?? p.immatriculation ?? '',
            zonePrincipale: data.zonePrincipale ?? data.zone_principale ?? p.zonePrincipale ?? '',
            statutValidation: data.statutValidation || data.statut_validation || p.statutValidation || '',
            estDisponible: data.estDisponible ?? data.est_disponible ?? (data.disponibilite === 'EN_LIGNE'),
            gainsDuJourFcfa: Number(data.gains_du_jour_fcfa ?? 0),
            nombreLivraisonsJour: Number(data.nombre_livraisons_jour ?? 0)
          }));

          if (data.gains_semaine) {
            this.gainsSemaine.set({
              montantTotalFcfa: Number(data.gains_semaine.montantTotalFcfa ?? 0),
              pourcentageEvolution: Number(data.gains_semaine.pourcentageEvolution ?? 0),
              livraisonsSemaine: Number(data.gains_semaine.livraisonsSemaine ?? 0),
              heuresEnLigne: String(data.gains_semaine.heuresEnLigne ?? '0h')
            });
          }

          if (data.activite_hebdomadaire && Array.isArray(data.activite_hebdomadaire)) {
            this.activiteHebdomadaire.set(data.activite_hebdomadaire);
          }

          if (data.details_quotidiens && Array.isArray(data.details_quotidiens)) {
            this.detailsQuotidiens.set(data.details_quotidiens);
          }
        }
      })
    );
  }

  /**
   * Charge le profil réel du livreur et ses gains depuis Django REST Framework.
   */
  chargerProfilLivreur(): void {
    this.recupererProfilLivreur().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  /**
   * Met à jour les informations du profil livreur (véhicule, immatriculation, zone, etc.).
   */
  mettreAJourProfilLivreur(donnees: FormData | any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/livraisons/profil/`, donnees).pipe(
      tap((data) => {
        if (data) {
          this.chargerProfilLivreur();
        }
      })
    );
  }

  /**
   * Écoute en continu les commandes passées par les clients (polling toutes les 3 secondes).
   */
  demarrerEcouteTempsReel(): void {
    this.arreterEcouteTempsReel();
    this.intervalleEcouteTempsReel = setInterval(() => {
      if (this.profilLivreur().estDisponible && !this.courseEnCours() && !this.propositionActive()) {
        this.verifierNouvellesPropositions();
      }
    }, 3000);
  }

  arreterEcouteTempsReel(): void {
    if (this.intervalleEcouteTempsReel) {
      clearInterval(this.intervalleEcouteTempsReel);
      this.intervalleEcouteTempsReel = undefined;
    }
  }

  /**
   * Joue une alerte sonore (double carillon harmonieux) dès qu'une nouvelle commande client arrive.
   */
  jouerAlerteSonore(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const maintenant = ctx.currentTime;

      // Note 1 (880 Hz - La 5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, maintenant);
      gain1.gain.setValueAtTime(0.2, maintenant);
      gain1.gain.exponentialRampToValueAtTime(0.001, maintenant + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(maintenant);
      osc1.stop(maintenant + 0.28);

      // Note 2 (1320 Hz - Mi 6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, maintenant + 0.16);
      gain2.gain.setValueAtTime(0.25, maintenant + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, maintenant + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(maintenant + 0.16);
      osc2.stop(maintenant + 0.55);
    } catch {
      // Navigateur en mode silencieux
    }
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
        next: () => {
          if (nouveauStatut) {
            this.demarrerEcouteTempsReel();
            this.verifierNouvellesPropositions();
          } else {
            this.arreterEcouteTempsReel();
          }
        },
        error: () => {}
      });
  }

  /**
   * Vérifie si des courses sont disponibles pour le livreur et affiche la modale en temps réel.
   */
  verifierNouvellesPropositions(): void {
    if (!this.profilLivreur().estDisponible || this.courseEnCours() || this.propositionActive()) {
      return;
    }

    this.http.get<any[]>(`${environment.apiUrl}/livraisons/propositions/`).subscribe({
      next: (propositions) => {
        if (propositions && propositions.length > 0) {
          const premiere = propositions[0];
          const tempsRestant = Number(
            premiere.tempsRestantSec ?? premiere.temps_restant_secondes ?? 30
          );
          this.secondesRestantes.set(tempsRestant);

          this.propositionActive.set({
            identifiantCommande: String(
              premiere.identifiantCommande ??
                premiere.commande_id ??
                premiere.id ??
                premiere.reference ??
                ''
            ),
            restaurantNom:
              premiere.restaurantNom ??
              premiere.restaurant_nom ??
              premiere.etablissement_nom ??
              'Restaurant Partenaire',
            restaurantAdresse:
              premiere.restaurantAdresse ??
              premiere.restaurant_adresse ??
              'Dakar',
            restaurantTelephone:
              premiere.restaurantTelephone ??
              premiere.restaurant_telephone ??
              '',
            comptoirRetrait: 'Comptoir de retrait AYYOU',
            clientNom:
              premiere.clientNom ?? premiere.client_nom ?? 'Client',
            clientTelephone:
              premiere.clientTelephone ??
              premiere.client_telephone ??
              '',
            clientAdresse:
              premiere.clientAdresse ??
              premiere.client_adresse ??
              'Adresse client',
            clientInstructions:
              premiere.clientInstructions ??
              premiere.instructions_client ??
              premiere.instructions ??
              '',
            distanceKm: Number(
              premiere.distanceKm ?? premiere.distance_km ?? 2.5
            ),
            gainFcfa: Number(
              premiere.gainFcfa ?? premiere.gain_livreur_fcfa ?? 1000
            ),
            tempsRestantSec: tempsRestant,
            tempsTrajetMin: Number(
              premiere.tempsTrajetMin ?? premiere.temps_trajet_minutes ?? 10
            ),
            codeValidation: '',
            restaurantLatitude: Number(premiere.restaurantLatitude ?? premiere.restaurant_latitude ?? 14.6710),
            restaurantLongitude: Number(premiere.restaurantLongitude ?? premiere.restaurant_longitude ?? -17.4320),
            clientLatitude: Number(premiere.clientLatitude ?? premiere.client_latitude ?? 14.6850),
            clientLongitude: Number(premiere.clientLongitude ?? premiere.client_longitude ?? -17.4520),
            articles: (premiere.articles || []).map((art: any) => ({
              id: art.id ? Number(art.id) : undefined,
              nom: art.nom ?? art.nom_plat ?? 'Article',
              quantite: Number(art.quantite || 1),
              format: art.format || 'Standard',
              instructions: art.instructions || '',
              estVerifie: false
            })),
            photoCommande:
              premiere.photoCommande ||
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
          });

          this.jouerAlerteSonore();
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
            identifiantCommande: String(l.commande_id || l.commande_reference || l.reference || l.id || ''),
            restaurantNom: l.restaurant_nom || '',
            restaurantAdresse: l.restaurant_adresse || '',
            restaurantTelephone: l.restaurant_telephone || '',
            comptoirRetrait: 'Comptoir de retrait AYYOU',
            clientNom: l.client_nom || '',
            clientTelephone: l.client_telephone || '',
            clientAdresse: l.client_adresse || '',
            clientInstructions: l.instructions_client || l.client_instructions || '',
            distanceKm: Number(l.distance_km || 2.5),
            gainFcfa: Number(l.gain_livreur_fcfa || 1000),
            tempsRestantSec: 0,
            tempsTrajetMin: 10,
            codeValidation: '',
            restaurantLatitude: Number(l.restaurant_latitude || 14.6710),
            restaurantLongitude: Number(l.restaurant_longitude || -17.4320),
            clientLatitude: Number(l.client_latitude || 14.6850),
            clientLongitude: Number(l.client_longitude || -17.4520),
            articles: (l.articles || []).map((art: any) => ({
              id: art.id ? Number(art.id) : undefined,
              nom: art.nom_plat || art.nom || 'Article',
              quantite: Number(art.quantite || 1),
              format: art.format || 'Standard',
              instructions: art.instructions || '',
              estVerifie: art.est_verifie || false
            })),
            photoCommande: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
          });

          // Étape de livraison
          if (l.etape === 'VERS_RESTAURANT') this.etapeCourse.set('VERS_RESTAURANT');
          else if (l.etape === 'VERIFICATION_ARTICLES' || l.etape === 'AU_RESTAURANT')
            this.etapeCourse.set('ARRIVE_RESTAURANT');
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

  accepterProposition(surSucces?: () => void, surErreur?: (message: string) => void): void {
    this.accepterCourse(surSucces, surErreur);
  }

  refuserProposition(): void {
    this.refuserCourse();
  }

  /**
   * Accepte la proposition de course via l'API Django.
   */
  accepterCourse(surSucces?: () => void, surErreur?: (message: string) => void): void {
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
            if (surSucces) {
              surSucces();
            }
          },
          error: (err) => {
            this.propositionActive.set(null);
            const message =
              err.error?.detail ||
              err.error?.message ||
              "Cette mission n'est plus disponible ou a été acceptée par un autre coursier.";
            if (surErreur) {
              surErreur(message);
            }
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
    const ligneIdReelle = article.id ?? (indexArticle + 1);

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
        ligne_id: ligneIdReelle,
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
   * Valide le code PIN à 4 chiffres fourni par le client auprès de Django.
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

  validerCode(codeSaisi: string, identifiantCommande?: string): ResultatValidationCode {
    if (this.etapeCourse() === 'LIVRE' || !this.courseEnCours()) {
      return {
        valide: false,
        message: 'Cette livraison a déjà été validée et clôturée.'
      };
    }

    if (codeSaisi.length !== 4) {
      return {
        valide: false,
        message: 'Veuillez saisir un code à 4 chiffres.'
      };
    }

    if (!/^\d{4}$/.test(codeSaisi)) {
      return {
        valide: false,
        message: 'Le code de confirmation doit comporter uniquement des chiffres.'
      };
    }

    const course = this.courseEnCours();
    if (course && course.codeValidation && course.codeValidation === codeSaisi) {
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

      return { valide: true, message: 'Code validé avec succès.' };
    }

    return {
      valide: false,
      message: 'Code de sécurité incorrect. Demandez le code PIN au client.'
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
    this.chargerProfilLivreur();
  }

  recommencerMission(): void {
    this.etapeCourse.set('VERS_RESTAURANT');
    this.courseEnCours.set(null);
  }
}
