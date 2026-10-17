/**
 * Service de l'espace livreur AYYOU.
 *
 * Règles :
 * - Le serveur décide de tout (courses proposées, gagnant d'une course, étapes, PIN) :
 *   l'écran ne change d'étape qu'APRÈS la confirmation du serveur.
 * - La position GPS réelle du téléphone est envoyée régulièrement tant que le livreur
 *   est en ligne ou en course (le dispatch et le suivi client en dépendent).
 * - Aucune valeur n'est inventée : une donnée absente est affichée comme absente.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActiviteJourLivreur, DetailGainJournalier, EtapeCourseLivreur, LivreurProfil, PropositionLivraison } from '../modeles/livreur.modele';
import { ServiceAuthentification } from './service-authentification.service';

/** Durée (secondes) pendant laquelle une proposition reste affichée avant d'être considérée comme refusée. */
const DUREE_PROPOSITION_SECONDES = 30;
/** Intervalle minimum entre deux envois de position GPS au serveur. */
const INTERVALLE_ENVOI_GPS_MS = 10000;

/** Raisons d'échec acceptées par le serveur (applications/livraisons/models.py → MotifEchecLivraison). */
export const MOTIFS_ECHEC_LIVRAISON = [
  { valeur: 'CLIENT_ABSENT', libelle: 'Client absent' },
  { valeur: 'CLIENT_INJOIGNABLE', libelle: 'Client injoignable' },
  { valeur: 'ADRESSE_INCORRECTE', libelle: 'Adresse incorrecte' },
  { valeur: 'PROBLEME_VEHICULE', libelle: 'Problème de véhicule' },
  { valeur: 'PROBLEME_RESTAURANT', libelle: 'Problème avec le restaurant' }
];

@Injectable({
  providedIn: 'root'
})
export class ServiceLivreurService {
  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);
  private readonly urlLivraisons = `${environment.apiUrl}/livraisons/`;

  readonly profilLivreur = signal<LivreurProfil>({
    nomComplet: '',
    adressePhoto: '',
    vehicule: '',
    estDisponible: false,
    gainsDuJourFcfa: 0,
    nombreLivraisonsJour: 0,
    typeVehicule: '',
    nomVehicule: '',
    immatriculation: '',
    zonePrincipale: ''
  });

  readonly gainsSemaine = signal({ montantTotalFcfa: 0, pourcentageEvolution: 0, livraisonsSemaine: 0, heuresEnLigne: '' });
  readonly activiteHebdomadaire = signal<ActiviteJourLivreur[]>([]);
  readonly detailsQuotidiens = signal<DetailGainJournalier[]>([]);

  // Course proposée (en attente de réponse) et course acceptée
  readonly propositionActive = signal<PropositionLivraison | null>(null);
  readonly courseEnCours = signal<PropositionLivraison | null>(null);
  readonly etapeCourse = signal<EtapeCourseLivreur>('VERS_RESTAURANT');
  readonly secondesRestantes = signal<number>(DUREE_PROPOSITION_SECONDES);
  readonly messageErreur = signal<string | null>(null);
  readonly estEnLigne = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // GPS réel du téléphone
  readonly positionGpsActuelle = signal<{ latitude: number; longitude: number } | null>(null);
  readonly statutTransmissionGps = signal<'ACTIF' | 'EN_PAUSE' | 'ERREUR' | 'INACTIF'>('INACTIF');
  readonly messageErreurGps = signal<string | null>(null);
  readonly dateDernierePositionGps = signal<Date | null>(null);

  private intervalleCompteARebours?: any;
  private intervalleEcoute?: any;
  private identifiantSuiviGps: number | null = null;
  private dernierEnvoiGps = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.estEnLigne.set(true);
        if (this.estLivreurConnecte()) this.chargerMissionEnCours();
      });
      window.addEventListener('offline', () => this.estEnLigne.set(false));
    }
    if (this.estLivreurConnecte()) {
      this.initialiserDonneesLivreur();
      this.demarrerEcouteTempsReel();
    }
  }

  private estLivreurConnecte(): boolean {
    return this.serviceAuth.utilisateurConnecte()?.role === 'LIVREUR';
  }

  private messageServeur(erreur: any, parDefaut: string): string {
    if (erreur?.status === 0) return 'Connexion perdue. Vérifiez votre réseau puis réessayez.';
    return erreur?.error?.message || erreur?.error?.detail || parDefaut;
  }

  initialiserDonneesLivreur(): void {
    this.chargerProfilLivreur();
    this.chargerMissionEnCours();
  }

  // ---------------------------------------------------------------------------
  // Profil et gains
  // ---------------------------------------------------------------------------

  recupererProfilLivreur(): Observable<any> {
    return this.http.get<any>(`${this.urlLivraisons}profil/`).pipe(
      tap((data) => {
        this.profilLivreur.update((p) => ({
          ...p,
          nomComplet: data.nom_complet || '',
          prenom: data.prenom || '',
          nom: data.nom || '',
          courriel: data.courriel || '',
          telephone: data.telephone || '',
          adresse: data.adresse || '',
          adressePhoto: data.adresse_photo || '',
          vehicule: data.nom_vehicule || data.type_vehicule || '',
          typeVehicule: data.type_vehicule || '',
          nomVehicule: data.nom_vehicule || '',
          immatriculation: data.immatriculation || '',
          zonePrincipale: data.zone_principale || '',
          statutValidation: data.statut_validation || '',
          estDisponible: data.disponibilite === 'EN_LIGNE' || data.disponibilite === 'OCCUPE',
          gainsDuJourFcfa: Number(data.gains_du_jour_fcfa ?? 0),
          nombreLivraisonsJour: Number(data.nombre_livraisons_jour ?? 0)
        }));
        if (data.gains_semaine) this.gainsSemaine.set(data.gains_semaine);
        if (Array.isArray(data.activite_hebdomadaire)) this.activiteHebdomadaire.set(data.activite_hebdomadaire);
        if (Array.isArray(data.details_quotidiens)) this.detailsQuotidiens.set(data.details_quotidiens);
        if (this.profilLivreur().estDisponible) this.demarrerSuiviGps();
      })
    );
  }

  chargerProfilLivreur(): void {
    this.recupererProfilLivreur().subscribe({
      error: (erreur) => this.messageErreur.set(this.messageServeur(erreur, 'Impossible de charger votre profil.'))
    });
  }

  mettreAJourProfilLivreur(donnees: FormData | any): Observable<any> {
    return this.http.patch<any>(`${this.urlLivraisons}profil/`, donnees).pipe(tap(() => this.chargerProfilLivreur()));
  }

  /** Interrupteur En ligne / Hors ligne : l'écran change seulement si le serveur accepte. */
  basculerDisponibilite(): void {
    const nouvelleValeur = this.profilLivreur().estDisponible ? 'HORS_LIGNE' : 'EN_LIGNE';
    this.http.patch<any>(`${this.urlLivraisons}disponibilite/`, { disponibilite: nouvelleValeur }).subscribe({
      next: () => {
        const enLigne = nouvelleValeur === 'EN_LIGNE';
        this.profilLivreur.update((p) => ({ ...p, estDisponible: enLigne }));
        this.messageErreur.set(null);
        if (enLigne) {
          this.demarrerSuiviGps();
          this.verifierNouvellesPropositions();
        } else if (!this.courseEnCours()) {
          this.arreterSuiviGps();
        }
      },
      error: (erreur) => this.messageErreur.set(this.messageServeur(erreur, 'Impossible de changer votre disponibilité.'))
    });
  }

  // ---------------------------------------------------------------------------
  // GPS réel
  // ---------------------------------------------------------------------------

  /** Suit la position du téléphone et l'envoie au serveur (au plus toutes les 10 secondes). */
  demarrerSuiviGps(): void {
    if (this.identifiantSuiviGps !== null) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.statutTransmissionGps.set('ERREUR');
      this.messageErreurGps.set("Ce téléphone ne permet pas la géolocalisation : impossible de recevoir des courses.");
      return;
    }
    this.statutTransmissionGps.set('ACTIF');
    this.messageErreurGps.set(null);
    this.identifiantSuiviGps = navigator.geolocation.watchPosition(
      (position) => this.surNouvellePosition(position.coords.latitude, position.coords.longitude),
      (erreur) => {
        this.statutTransmissionGps.set('ERREUR');
        this.messageErreurGps.set(
          erreur.code === erreur.PERMISSION_DENIED
            ? 'Autorisez la localisation pour recevoir des courses et être suivi par le client.'
            : 'Position GPS introuvable. Activez la localisation de votre téléphone.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }

  arreterSuiviGps(): void {
    if (this.identifiantSuiviGps !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.identifiantSuiviGps);
    }
    this.identifiantSuiviGps = null;
    this.statutTransmissionGps.set('INACTIF');
  }

  private surNouvellePosition(latitude: number, longitude: number): void {
    this.positionGpsActuelle.set({ latitude, longitude });
    this.dateDernierePositionGps.set(new Date());
    const maintenant = Date.now();
    if (maintenant - this.dernierEnvoiGps < INTERVALLE_ENVOI_GPS_MS) return;
    this.dernierEnvoiGps = maintenant;

    this.http.patch(`${this.urlLivraisons}position-gps/`, { latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) }).subscribe({
      next: () => this.statutTransmissionGps.set('ACTIF'),
      error: () => this.statutTransmissionGps.set('EN_PAUSE') // nouvel essai à la prochaine position
    });
  }

  // ---------------------------------------------------------------------------
  // Propositions de course
  // ---------------------------------------------------------------------------

  /** Interroge le serveur régulièrement (voir phase 9 : temps réel). */
  demarrerEcouteTempsReel(): void {
    this.arreterEcouteTempsReel();
    this.intervalleEcoute = setInterval(() => {
      if (this.profilLivreur().estDisponible && !this.courseEnCours() && !this.propositionActive()) {
        this.verifierNouvellesPropositions();
      }
    }, 5000);
  }

  arreterEcouteTempsReel(): void {
    if (this.intervalleEcoute) clearInterval(this.intervalleEcoute);
    this.intervalleEcoute = undefined;
  }

  verifierNouvellesPropositions(): void {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.estEnLigne.set(false);
      return;
    }
    if (!this.profilLivreur().estDisponible || this.courseEnCours() || this.propositionActive()) return;

    this.http.get<any[]>(`${this.urlLivraisons}propositions/`).subscribe({
      next: (propositions) => {
        this.estEnLigne.set(true);
        if (propositions.length === 0) return;
        this.propositionActive.set(this.adapterProposition(propositions[0]));
        this.secondesRestantes.set(DUREE_PROPOSITION_SECONDES);
        this.jouerAlerteSonore();
        this.demarrerCompteARebours();
      },
      error: (erreur) => {
        if (erreur?.status === 0) this.estEnLigne.set(false);
        if (erreur?.status === 401 || erreur?.status === 403) this.arreterEcouteTempsReel();
      }
    });
  }

  /** Proposition telle que renvoyée par le serveur : pas de données du client avant acceptation. */
  private adapterProposition(p: any): PropositionLivraison {
    return {
      identifiantCommande: String(p.commande_id),
      restaurantNom: p.restaurant_nom || '',
      restaurantAdresse: p.restaurant_adresse || '',
      restaurantTelephone: p.restaurant_telephone || '',
      comptoirRetrait: '',
      clientNom: '',
      clientTelephone: '',
      clientAdresse: '',
      distanceKm: p.distance_km ?? null,
      gainFcfa: Number(p.gain_livreur_fcfa ?? 0),
      tempsRestantSec: DUREE_PROPOSITION_SECONDES,
      tempsTrajetMin: 0,
      restaurantLatitude: p.restaurant_latitude ?? undefined,
      restaurantLongitude: p.restaurant_longitude ?? undefined,
      articles: (p.articles || []).map((a: any) => ({
        id: a.id,
        nom: a.nom_plat,
        quantite: a.quantite,
        instructions: a.instructions_speciales || '',
        estVerifie: false
      }))
    };
  }

  jouerAlerteSonore(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [880, 1320].forEach((frequence, index) => {
        const oscillateur = ctx.createOscillator();
        const volume = ctx.createGain();
        const debut = ctx.currentTime + index * 0.16;
        oscillateur.frequency.setValueAtTime(frequence, debut);
        volume.gain.setValueAtTime(0.25, debut);
        volume.gain.exponentialRampToValueAtTime(0.001, debut + 0.4);
        oscillateur.connect(volume);
        volume.connect(ctx.destination);
        oscillateur.start(debut);
        oscillateur.stop(debut + 0.4);
      });
    } catch {
      // Son bloqué par le navigateur : la proposition reste visible à l'écran.
    }
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
    if (this.intervalleCompteARebours) clearInterval(this.intervalleCompteARebours);
    this.intervalleCompteARebours = undefined;
  }

  accepterProposition(surSucces?: () => void, surErreur?: (message: string) => void): void {
    this.accepterCourse(surSucces, surErreur);
  }

  refuserProposition(): void {
    this.refuserCourse();
  }

  /** Le serveur verrouille la commande : si un autre livreur a été plus rapide, on reçoit une erreur. */
  accepterCourse(surSucces?: () => void, surErreur?: (message: string) => void): void {
    this.arreterCompteARebours();
    const proposition = this.propositionActive();
    if (!proposition) return;
    this.http.post(`${this.urlLivraisons}${proposition.identifiantCommande}/accepter/`, {}).subscribe({
      next: () => {
        this.propositionActive.set(null);
        this.chargerMissionEnCours(surSucces);
      },
      error: (erreur) => {
        this.propositionActive.set(null);
        surErreur?.(this.messageServeur(erreur, "Cette course n'est plus disponible."));
      }
    });
  }

  /** Refus mémorisé par le serveur : la même course ne vous sera plus proposée. */
  refuserCourse(): void {
    this.arreterCompteARebours();
    const proposition = this.propositionActive();
    this.propositionActive.set(null);
    if (proposition) {
      this.http.post(`${this.urlLivraisons}${proposition.identifiantCommande}/refuser/`, {}).subscribe({
        error: () => {
          // Si le refus n'a pas pu être envoyé, la course pourra être reproposée : ce n'est pas bloquant.
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Course en cours (chaque étape est confirmée par le serveur)
  // ---------------------------------------------------------------------------

  readonly remiseConfirmee = signal<boolean>(false);
  readonly livraisonBloquee = signal<boolean>(false);

  /** Charge la course active depuis le serveur et en déduit l'étape à afficher. */
  chargerMissionEnCours(surSucces?: () => void): void {
    this.http.get<any>(`${this.urlLivraisons}mission-en-cours/`).subscribe({
      next: (reponse) => {
        this.estEnLigne.set(true);
        if (!reponse.mission_active) {
          this.courseEnCours.set(null);
          return;
        }
        const l = reponse.livraison;
        this.courseEnCours.set({
          identifiantCommande: String(l.commande_id),
          referenceCommande: l.commande_reference,
          restaurantNom: l.restaurant_nom,
          restaurantAdresse: l.restaurant_adresse,
          restaurantTelephone: l.restaurant_telephone,
          comptoirRetrait: '',
          clientNom: l.client_nom,
          clientTelephone: l.client_telephone,
          clientAdresse: l.client_adresse,
          clientInstructions: l.client_instructions,
          clientRepere: l.client_repere,
          distanceKm: l.distance_km ?? null,
          gainFcfa: l.gain_livreur_fcfa,
          tempsRestantSec: 0,
          tempsTrajetMin: 0,
          restaurantLatitude: l.restaurant_latitude ?? undefined,
          restaurantLongitude: l.restaurant_longitude ?? undefined,
          clientLatitude: l.client_latitude ?? undefined,
          clientLongitude: l.client_longitude ?? undefined,
          articles: (l.articles || []).map((a: any) => ({
            id: a.id,
            nom: a.nom_plat,
            quantite: a.quantite,
            instructions: a.instructions_speciales || '',
            estVerifie: Boolean(a.est_verifie)
          }))
        });
        this.remiseConfirmee.set(Boolean(reponse.remise_confirmee));
        this.livraisonBloquee.set(Boolean(reponse.est_bloquee));
        this.etapeCourse.set(this.etapeDepuisStatut(l.statut_commande));
        this.demarrerSuiviGps();
        surSucces?.();
      },
      error: (erreur) => {
        if (erreur?.status === 0) this.estEnLigne.set(false);
      }
    });
  }

  private etapeDepuisStatut(statut: string): EtapeCourseLivreur {
    switch (statut) {
      case 'EN_VERIFICATION':
        return 'ARRIVE_RESTAURANT';
      case 'EN_LIVRAISON':
        return 'VERS_CLIENT';
      case 'ARRIVE_CLIENT':
        return 'VALIDATION_CODE';
      default:
        return 'VERS_RESTAURANT';
    }
  }

  /** Étape purement visuelle : le livreur annonce qu'il est devant le restaurant. */
  avancerEtapeCourse(etape: EtapeCourseLivreur): void {
    this.etapeCourse.set(etape);
  }

  /** Coche / décoche un article : l'écran est mis à jour après la réponse du serveur. */
  basculerArticleVerifie(index: number): void {
    const course = this.courseEnCours();
    const article = course?.articles[index];
    if (!course || !article?.id) return;
    const nouvelEtat = !article.estVerifie;
    this.http.post(`${this.urlLivraisons}mission-en-cours/pointer-article/`, { ligne_id: article.id, est_verifie: nouvelEtat }).subscribe({
      next: () => {
        this.courseEnCours.update((c) =>
          c ? { ...c, articles: c.articles.map((a, i) => (i === index ? { ...a, estVerifie: nouvelEtat } : a)) } : c
        );
        this.etapeCourse.set('ARRIVE_RESTAURANT');
      },
      error: (erreur) => this.messageErreur.set(this.messageServeur(erreur, "Impossible d'enregistrer la vérification."))
    });
  }

  tousArticlesVerifies(): boolean {
    const course = this.courseEnCours();
    return !!course && course.articles.length > 0 && course.articles.every((a) => a.estVerifie);
  }

  /** Départ vers le client : exige tous les articles vérifiés ET la remise confirmée par le restaurant. */
  partirVersClient(): Observable<any> {
    return this.http.post(`${this.urlLivraisons}mission-en-cours/depart-client/`, {}).pipe(tap(() => this.etapeCourse.set('VERS_CLIENT')));
  }

  signalerArriveeClient(): Observable<any> {
    return this.http.post(`${this.urlLivraisons}mission-en-cours/arrivee-client/`, {}).pipe(tap(() => this.etapeCourse.set('VALIDATION_CODE')));
  }

  /** Le PIN est vérifié UNIQUEMENT par le serveur (nombre d'essais limité). */
  validerCode(codePin: string): Observable<{ gain: number }> {
    return this.http.post<any>(`${this.urlLivraisons}mission-en-cours/valider-pin/`, { code_pin: codePin }).pipe(
      map((reponse) => ({ gain: Number(reponse.gain_fcfa) })),
      tap(() => this.terminerLivraison())
    );
  }

  /** Annulation avant récupération : la course est reproposée à un autre livreur. */
  annulerCourse(motif: string): Observable<any> {
    return this.http.post(`${this.urlLivraisons}mission-en-cours/annuler/`, { motif }).pipe(tap(() => this.libererApresCourse()));
  }

  /** Échec de livraison (client absent, injoignable...) : le support prend le relais. */
  declarerEchec(motif: string): Observable<any> {
    return this.http.post(`${this.urlLivraisons}mission-en-cours/echec/`, { motif }).pipe(tap(() => this.libererApresCourse()));
  }

  private libererApresCourse(): void {
    this.courseEnCours.set(null);
    this.etapeCourse.set('VERS_RESTAURANT');
    this.remiseConfirmee.set(false);
    this.livraisonBloquee.set(false);
    this.chargerProfilLivreur();
  }

  terminerLivraison(): void {
    this.courseEnCours.set(null);
    this.etapeCourse.set('LIVRE');
    this.chargerProfilLivreur(); // gains du jour recalculés par le serveur
  }

  recommencerMission(): void {
    this.etapeCourse.set('VERS_RESTAURANT');
    this.courseEnCours.set(null);
  }
}
