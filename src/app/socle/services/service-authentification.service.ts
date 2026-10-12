import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, tap, throwError } from 'rxjs';
import {
  IdentifiantsConnexion,
  ReponseAuthentification,
  RoleUtilisateur,
  Utilisateur
} from '../modeles/utilisateur.modele';

const CLE_STOCKAGE_UTILISATEUR = 'ayyou_utilisateur_connecte';
const CLE_STOCKAGE_JETON = 'ayyou_jeton_acces';

@Injectable({
  providedIn: 'root'
})
export class ServiceAuthentification {
  // Signaux réactifs pour la gestion d'état de l'authentification
  readonly utilisateurConnecte = signal<Utilisateur | null>(null);
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  // Signaux calculés
  readonly estAuthentifie = computed(() => this.utilisateurConnecte() !== null);
  readonly roleActuel = computed(() => this.utilisateurConnecte()?.role ?? null);

  // Utilisateurs de démonstration par rôle métier
  private readonly utilisateursSimules: Record<RoleUtilisateur, Utilisateur> = {
    CLIENT: {
      identifiant: 'util-client-01',
      prenom: 'Fatou',
      nom: 'Diop',
      courriel: 'fatou.diop@ayyou.sn',
      telephone: '+221 77 123 45 67',
      role: 'CLIENT',
      adressePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      adresse: 'Almadies, Dakar',
      estActif: true,
      dateCreation: '2026-01-15'
    },
    RESTAURANT: {
      identifiant: 'util-restau-01',
      prenom: 'Cheikh',
      nom: 'Ndiaye',
      courriel: 'contact@teranga-gourmand.sn',
      telephone: '+221 77 234 56 78',
      role: 'RESTAURANT',
      nomEtablissement: 'Le Teranga Gourmand',
      adressePhoto: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
      adresse: 'Plateau, Dakar',
      estActif: true,
      dateCreation: '2026-01-10'
    },
    VENDEUR: {
      identifiant: 'util-vendeur-01',
      prenom: 'Awa',
      nom: 'Sow',
      courriel: 'awa.marche@ayyou.sn',
      telephone: '+221 77 345 67 89',
      role: 'VENDEUR',
      nomEtablissement: 'Délices & Épices Kermel',
      adressePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      adresse: 'Marché Kermel, Dakar',
      estActif: true,
      dateCreation: '2026-02-01'
    },
    LIVREUR: {
      identifiant: 'util-livreur-01',
      prenom: 'Moussa',
      nom: 'Ba',
      courriel: 'moussa.express@ayyou.sn',
      telephone: '+221 77 456 78 90',
      role: 'LIVREUR',
      typeVehicule: 'MOTO',
      adressePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      estActif: true,
      dateCreation: '2026-02-10'
    },
    ADMINISTRATEUR: {
      identifiant: 'util-admin-01',
      prenom: 'Aissatou',
      nom: 'Gueye',
      courriel: 'direction@ayyou.sn',
      telephone: '+221 77 567 89 01',
      role: 'ADMINISTRATEUR',
      adressePhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      estActif: true,
      dateCreation: '2025-12-01'
    }
  };

  constructor() {
    this.chargerSessionExistante();
  }

  /**
   * Connexion avec téléphone ou e-mail et mot de passe.
   */
  connecter(identifiants: IdentifiantsConnexion): Observable<Utilisateur> {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);
    this.messageSucces.set(null);

    const identifiantNormalise = identifiants.courriel.trim().toLowerCase();

    // Recherche parmi les profils simulés ou création d'une session dynamique
    let utilisateurTrouve: Utilisateur | undefined;

    if (identifiantNormalise.includes('restau') || identifiantNormalise.includes('teranga')) {
      utilisateurTrouve = this.utilisateursSimules.RESTAURANT;
    } else if (identifiantNormalise.includes('vendeur') || identifiantNormalise.includes('kermel')) {
      utilisateurTrouve = this.utilisateursSimules.VENDEUR;
    } else if (identifiantNormalise.includes('livreur')) {
      utilisateurTrouve = this.utilisateursSimules.LIVREUR;
    } else if (identifiantNormalise.includes('admin')) {
      utilisateurTrouve = this.utilisateursSimules.ADMINISTRATEUR;
    } else {
      // Par défaut utilisateur client
      utilisateurTrouve = {
        ...this.utilisateursSimules.CLIENT,
        courriel: identifiantNormalise.includes('@') ? identifiantNormalise : 'utilisateur@ayyou.sn',
        telephone: !identifiantNormalise.includes('@') ? identifiants.courriel : '+221 77 000 00 00'
      };
    }

    // Simulation de délai réseau réaliste (600ms)
    return of(utilisateurTrouve).pipe(
      delay(600),
      tap((utilisateur) => {
        this.sauvegarderSession({
          jetonAcces: 'jeton_simule_' + Date.now(),
          jetonRafraichissement: 'rafraichir_' + Date.now(),
          utilisateur
        });
        this.utilisateurConnecte.set(utilisateur);
        this.chargementEnCours.set(false);
        this.messageSucces.set(`Bienvenue, ${utilisateur.prenom} !`);
      })
    );
  }

  /**
   * Connexion directe via un rôle prédéfini (idéal pour les démonstrations de certification).
   */
  connecterAvecRolePredefini(role: RoleUtilisateur): Observable<Utilisateur> {
    const utilisateur = this.utilisateursSimules[role];
    return this.connecter({
      courriel: utilisateur.courriel,
      motDePasse: 'Secret2026!',
      seSouvenirDeMoi: true
    });
  }

  /**
   * Déconnexion complète.
   */
  deconnecter(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CLE_STOCKAGE_UTILISATEUR);
      localStorage.removeItem(CLE_STOCKAGE_JETON);
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
    }
  }

  /**
   * Restaure la session au rechargement de la page si existante.
   */
  chargerSessionExistante(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const donneesUtilisateur = localStorage.getItem(CLE_STOCKAGE_UTILISATEUR);
      if (donneesUtilisateur) {
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
