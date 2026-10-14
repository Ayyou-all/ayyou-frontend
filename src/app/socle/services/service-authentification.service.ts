import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FormulaireInscription,
  IdentifiantsConnexion,
  ReponseAuthentification,
  RoleUtilisateur,
  Utilisateur
} from '../modeles/utilisateur.modele';

export type TypeActionConnexionRequise =
  | 'COMMANDE'
  | 'LIKE'
  | 'ABONNEMENT'
  | 'PARTAGE'
  | 'ESPACE_PRIVE';

export interface ConfigurationActionRequise {
  type: TypeActionConnexionRequise;
  titre: string;
  description: string;
  icone: string;
  couleurIcone: string;
  classeFondIcone: string;
  texteBoutonAction?: string;
  callbackApresConnexion?: () => void;
}

const CLE_STOCKAGE_UTILISATEUR = 'ayyou_utilisateur_connecte';
const CLE_STOCKAGE_JETON = 'ayyou_jeton_acces';
const CLE_STOCKAGE_RAFRAICHISSEMENT = 'ayyou_jeton_rafraichissement';

@Injectable({
  providedIn: 'root'
})
export class ServiceAuthentification {
  private readonly http = inject(HttpClient);

  // Signaux réactifs pour la gestion d'état de l'authentification
  readonly utilisateurConnecte = signal<Utilisateur | null>(null);
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  // Types et configuration pour le mode visiteur
  readonly modaleConnexionOuverte = signal<boolean>(false);
  readonly configurationActionRequise = signal<ConfigurationActionRequise | null>(null);

  // Signaux calculés
  readonly estAuthentifie = computed(() => this.utilisateurConnecte() !== null);
  readonly estVisiteur = computed(() => this.utilisateurConnecte() === null);
  readonly roleActuel = computed(() => this.utilisateurConnecte()?.role ?? null);
  readonly estClient = computed(() => this.utilisateurConnecte()?.role === 'CLIENT');
  readonly estGerant = computed(() => this.utilisateurConnecte()?.role === 'RESTAURANT');
  readonly estLivreur = computed(() => this.utilisateurConnecte()?.role === 'LIVREUR');
  readonly estAdministrateur = computed(() => this.utilisateurConnecte()?.role === 'ADMINISTRATEUR');

  constructor() {
    this.chargerSessionExistante();
  }

  /**
   * Adapte l'objet utilisateur Django (snake_case) vers l'interface TypeScript Angular.
   */
  private adapterUtilisateur(donnees: any): Utilisateur {
    return {
      identifiant: String(donnees.id || donnees.identifiant || ''),
      prenom: donnees.prenom || '',
      nom: donnees.nom || '',
      courriel: donnees.courriel || '',
      telephone: donnees.telephone || '',
      role: (donnees.role || 'CLIENT') as RoleUtilisateur,
      adressePhoto: donnees.adresse_photo || donnees.adressePhoto || undefined,
      nomEtablissement: donnees.nom_etablissement || donnees.nomEtablissement || undefined,
      typeVehicule: donnees.type_vehicule || donnees.typeVehicule || undefined,
      adresse: donnees.adresse || undefined,
      estActif: donnees.est_actif ?? donnees.estActif ?? true,
      dateCreation: donnees.date_creation || donnees.dateCreation || new Date().toISOString()
    };
  }

  /**
   * Met à jour les données de l'utilisateur connecté en mémoire et dans le stockage local.
   */
  mettreAJourUtilisateur(donnees: any): void {
    const adapt = this.adapterUtilisateur(donnees);
    this.utilisateurConnecte.set(adapt);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CLE_STOCKAGE_UTILISATEUR, JSON.stringify(adapt));
    }
  }

  /**
   * Connexion réelle avec l'API Django REST Framework.
   */
  connecter(identifiants: IdentifiantsConnexion): Observable<Utilisateur> {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    const payload = {
      identifiant: identifiants.courriel.trim(),
      mot_de_passe: identifiants.motDePasse
    };

    return this.http
      .post<any>(`${environment.apiUrl}/authentification/connexion/`, payload)
      .pipe(
        map((reponse) => {
          const utilisateur = this.adapterUtilisateur(reponse.utilisateur);
          this.sauvegarderSession({
            jetonAcces: reponse.jeton_acces,
            jetonRafraichissement: reponse.jeton_rafraichissement,
            utilisateur
          });
          this.utilisateurConnecte.set(utilisateur);
          this.chargementEnCours.set(false);
          this.messageSucces.set(`Bienvenue, ${utilisateur.prenom} !`);
          return utilisateur;
        }),
        catchError((erreur) => {
          this.chargementEnCours.set(false);
          const message =
            erreur?.error?.message ||
            erreur?.error?.detail ||
            'Identifiants incorrects. Veuillez vérifier votre adresse e-mail et mot de passe.';
          this.messageErreur.set(message);
          return throwError(() => erreur);
        })
      );
  }

  /**
   * Inscription réelle avec l'API Django REST Framework.
   */
  inscrire(formulaire: Partial<FormulaireInscription> & { motDePasse: string; confirmationMotDePasse: string }): Observable<Utilisateur> {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    const aDesFichiers =
      !!formulaire.documentJustificatif ||
      !!formulaire.logo ||
      !!formulaire.couverture ||
      !!formulaire.permisRecto ||
      !!formulaire.permisVerso;

    let corpsRequete: any;

    if (aDesFichiers) {
      const formData = new FormData();
      formData.append('prenom', formulaire.prenom?.trim() || '');
      formData.append('nom', formulaire.nom?.trim() || '');
      formData.append('courriel', formulaire.courriel?.trim().toLowerCase() || '');
      formData.append('telephone', formulaire.telephone?.replace(/\s+/g, '') || '');
      formData.append('mot_de_passe', formulaire.motDePasse);
      formData.append('confirmation_mot_de_passe', formulaire.confirmationMotDePasse);
      formData.append('role', formulaire.role || 'CLIENT');
      formData.append('conditions_acceptees', 'true');
      if (formulaire.nomEtablissement) formData.append('nom_etablissement', formulaire.nomEtablissement);
      if (formulaire.typeVehicule) formData.append('type_vehicule', formulaire.typeVehicule);
      if (formulaire.adresse) formData.append('adresse', formulaire.adresse);
      if (formulaire.documentJustificatif) formData.append('document_justificatif', formulaire.documentJustificatif);
      if (formulaire.documentType) formData.append('document_type', formulaire.documentType);
      if (formulaire.logo) formData.append('logo', formulaire.logo);
      if (formulaire.couverture) formData.append('couverture', formulaire.couverture);
      if (formulaire.permisRecto) formData.append('permis_recto', formulaire.permisRecto);
      if (formulaire.permisVerso) formData.append('permis_verso', formulaire.permisVerso);
      corpsRequete = formData;
    } else {
      corpsRequete = {
        prenom: formulaire.prenom?.trim(),
        nom: formulaire.nom?.trim(),
        courriel: formulaire.courriel?.trim().toLowerCase(),
        telephone: formulaire.telephone?.replace(/\s+/g, ''),
        mot_de_passe: formulaire.motDePasse,
        confirmation_mot_de_passe: formulaire.confirmationMotDePasse,
        role: formulaire.role || 'CLIENT',
        nom_etablissement: formulaire.nomEtablissement || '',
        type_vehicule: formulaire.typeVehicule || undefined,
        adresse: formulaire.adresse || '',
        conditions_acceptees: true
      };
    }

    return this.http
      .post<any>(`${environment.apiUrl}/authentification/inscription/`, corpsRequete)
      .pipe(
        map((reponse) => {
          const utilisateur = this.adapterUtilisateur(reponse.utilisateur);
          this.sauvegarderSession({
            jetonAcces: reponse.jeton_acces,
            jetonRafraichissement: reponse.jeton_rafraichissement,
            utilisateur
          });
          this.utilisateurConnecte.set(utilisateur);
          this.chargementEnCours.set(false);
          this.messageSucces.set(`Compte créé avec succès ! Bienvenue, ${utilisateur.prenom}.`);
          return utilisateur;
        }),
        catchError((erreur) => {
          this.chargementEnCours.set(false);
          let message = 'Erreur lors de la création du compte.';
          if (erreur?.error) {
            if (typeof erreur.error === 'string') {
              message = erreur.error;
            } else if (erreur.error.message) {
              message = erreur.error.message;
            } else {
              const premiersChamps = Object.keys(erreur.error);
              if (premiersChamps.length > 0) {
                const champ = premiersChamps[0];
                const detail = erreur.error[champ];
                message = Array.isArray(detail) ? detail[0] : String(detail);
              }
            }
          }
          this.messageErreur.set(message);
          return throwError(() => erreur);
        })
      );
  }

  /**
   * Envoie réellement un code de vérification à 6 chiffres par e-mail via SMTP Django.
   */
  envoyerCodeVerification(courriel: string): Observable<{ succes: boolean; message: string; expiration_minutes?: number }> {
    return this.http.post<{ succes: boolean; message: string; expiration_minutes?: number }>(
      `${environment.apiUrl}/authentification/envoyer-code/`,
      { courriel: courriel.trim().toLowerCase() }
    );
  }

  /**
   * Valide le code de vérification e-mail auprès du backend Django.
   */
  verifierCodeVerification(courriel: string, code: string): Observable<{ succes: boolean; valide: boolean; message: string }> {
    return this.http.post<{ succes: boolean; valide: boolean; message: string }>(
      `${environment.apiUrl}/authentification/verifier-code/`,
      { courriel: courriel.trim().toLowerCase(), code: code.trim() }
    );
  }

  /**
   * Déconnexion complète auprès de Django et nettoyage du stockage local.
   */
  deconnecter(): void {
    const jetonRafraichissement =
      typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem(CLE_STOCKAGE_RAFRAICHISSEMENT)
        : null;

    if (jetonRafraichissement) {
      this.http
        .post(`${environment.apiUrl}/authentification/deconnexion/`, {
          jeton_rafraichissement: jetonRafraichissement
        })
        .subscribe({
          next: () => {},
          error: () => {}
        });
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CLE_STOCKAGE_UTILISATEUR);
      localStorage.removeItem(CLE_STOCKAGE_JETON);
      localStorage.removeItem(CLE_STOCKAGE_RAFRAICHISSEMENT);
    }
    this.utilisateurConnecte.set(null);
    this.messageSucces.set(null);
    this.messageErreur.set(null);
  }

  /**
   * Sauvegarde les informations de session dans le stockage local.
   */
  sauvegarderSession(reponse: ReponseAuthentification): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CLE_STOCKAGE_UTILISATEUR, JSON.stringify(reponse.utilisateur));
      localStorage.setItem(CLE_STOCKAGE_JETON, reponse.jetonAcces);
      if (reponse.jetonRafraichissement) {
        localStorage.setItem(CLE_STOCKAGE_RAFRAICHISSEMENT, reponse.jetonRafraichissement);
      }
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié. Si oui, exécute l'action immédiatement.
   * Si non (mode visiteur), ouvre la modale de connexion avec le contexte approprié.
   */
  exigerAuthentification(
    type: TypeActionConnexionRequise,
    callbackApresConnexion?: () => void,
    detailsPersonnalises?: Partial<ConfigurationActionRequise>
  ): boolean {
    if (this.estAuthentifie()) {
      callbackApresConnexion?.();
      return true;
    }

    const configurationsParDefaut: Record<
      TypeActionConnexionRequise,
      Omit<ConfigurationActionRequise, 'callbackApresConnexion'>
    > = {
      COMMANDE: {
        type: 'COMMANDE',
        titre: 'Connexion requise pour commander',
        description:
          'Connectez-vous ou créez votre compte pour savourer ce plat et suivre votre livraison en direct sur Dakar.',
        icone: 'fa-solid fa-cart-shopping',
        couleurIcone: 'text-[#E51824]',
        classeFondIcone: 'bg-red-50 ring-red-100',
        texteBoutonAction: 'Commander ce plat'
      },
      LIKE: {
        type: 'LIKE',
        titre: 'Aimez ce plat et soutenez le resto !',
        description:
          'Connectez-vous pour liker cette publication, sauvegarder vos découvertes et encourager les chefs sénégalais.',
        icone: 'fa-solid fa-heart',
        couleurIcone: 'text-rose-500',
        classeFondIcone: 'bg-rose-50 ring-rose-100',
        texteBoutonAction: 'Ajouter aux favoris'
      },
      ABONNEMENT: {
        type: 'ABONNEMENT',
        titre: 'Abonnez-vous à ce restaurant',
        description:
          'Connectez-vous pour suivre ce restaurant, ne rater aucune nouvelle vidéo et profiter de ses offres exclusives.',
        icone: 'fa-solid fa-bell',
        couleurIcone: 'text-amber-500',
        classeFondIcone: 'bg-amber-50 ring-amber-100',
        texteBoutonAction: "S'abonner"
      },
      PARTAGE: {
        type: 'PARTAGE',
        titre: 'Partagez avec vos proches',
        description:
          'Connectez-vous pour recommander vos plats préférés et faire découvrir la cuisine dakaroise à votre entourage.',
        icone: 'fa-solid fa-share-nodes',
        couleurIcone: 'text-blue-500',
        classeFondIcone: 'bg-blue-50 ring-blue-100',
        texteBoutonAction: 'Partager'
      },
      ESPACE_PRIVE: {
        type: 'ESPACE_PRIVE',
        titre: 'Connexion requise',
        description:
          'Cet espace est réservé aux membres connectés. Connectez-vous pour retrouver vos commandes et vos informations.',
        icone: 'fa-solid fa-user-lock',
        couleurIcone: 'text-slate-800',
        classeFondIcone: 'bg-slate-100 ring-slate-200',
        texteBoutonAction: 'Accéder à mon espace'
      }
    };

    const configBase = configurationsParDefaut[type];
    this.configurationActionRequise.set({
      ...configBase,
      ...detailsPersonnalises,
      callbackApresConnexion
    });
    this.modaleConnexionOuverte.set(true);
    return false;
  }

  /**
   * Ferme la modale de demande de connexion.
   */
  fermerModaleConnexion(): void {
    this.modaleConnexionOuverte.set(false);
    this.configurationActionRequise.set(null);
  }

  /**
   * Restaure la session au rechargement de la page si existante.
   */
  chargerSessionExistante(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const donneesUtilisateur = localStorage.getItem(CLE_STOCKAGE_UTILISATEUR);
      const jeton = localStorage.getItem(CLE_STOCKAGE_JETON);
      if (donneesUtilisateur && jeton) {
        try {
          const utilisateur = JSON.parse(donneesUtilisateur) as Utilisateur;
          this.utilisateurConnecte.set(utilisateur);
        } catch {
          this.deconnecter();
        }
      }
    }
  }
}
