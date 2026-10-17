/**
 * Service de gestion des commandes et du suivi GPS des livreurs AYYOU.
 * Consomme l'API Django REST Framework sans aucune fausse donnée mockée.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommandeClient, EtapeSuiviLivraison, StatutCommande } from '../modeles/commande.modele';
import { EstimationCommande } from '../modeles/panier.modele';
import { ServiceAuthentification } from './service-authentification.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceCommandesService {
  private readonly http = inject(HttpClient);

  // Liste réactive des commandes du client connecté alimentée par Django
  readonly listeCommandes = signal<CommandeClient[]>([]);

  // Progression de la géolocalisation GPS du livreur sur le trajet (0 à 100 %)
  readonly progressionGpsLivreur = signal<number>(0);

  // Modal / écran de confirmation de livraison réussie
  readonly livraisonValidee = signal<boolean>(false);

  // États de chargement et d'erreur
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);

  // Commandes actuellement en cours
  readonly commandesEnCours = computed(() => {
    return this.listeCommandes().filter((c) => c.estEnCours);
  });

  // Commandes passées / historique
  readonly commandesHistorique = computed(() => {
    return this.listeCommandes().filter((c) => !c.estEnCours);
  });

  // URL de la page suivante renvoyée par l'API paginée (null s'il n'y a plus rien à charger)
  readonly urlPageSuivante = signal<string | null>(null);
  // Vrai quand le dernier rafraîchissement du suivi a échoué faute de réseau
  readonly connexionPerdue = signal<boolean>(false);

  private readonly serviceAuth = inject(ServiceAuthentification);

  constructor() {
    // Seul un client possède des commandes « client » : inutile d'appeler l'API pour les autres rôles.
    if (this.serviceAuth.utilisateurConnecte()?.role === 'CLIENT') {
      this.chargerCommandes();
    }
  }

  /**
   * Traduit le statut détaillé du serveur en statut d'affichage de la liste.
   * Le libellé exact affiché reste celui du serveur (statut_libelle).
   */
  private convertirStatut(statutServeur: string): StatutCommande {
    switch (statutServeur) {
      case 'EN_ATTENTE_PAIEMENT':
        return 'EN_ATTENTE_PAIEMENT';
      case 'CREEE_EN_ATTENTE':
      case 'EN_PREPARATION':
        return 'PREPARATION';
      case 'PRETE_POUR_RETRAIT':
        return 'PRET';
      case 'LIVREE':
        return 'LIVRE';
      case 'REFUSEE_ANNULEE':
      case 'ECHEC_LIVRAISON':
        return 'REFUSE';
      default:
        // COURSE_ASSIGNEE, EN_VERIFICATION, EN_LIVRAISON, ARRIVE_CLIENT
        return 'EN_LIVRAISON';
    }
  }

  /**
   * Adapte un objet Commande Django vers l'interface CommandeClient Angular.
   */
  adapterCommande(c: any): CommandeClient {
    const statut = this.convertirStatut(c.statut);

    // Normalisation de l'étape de suivi
    let etapeSuivi: EtapeSuiviLivraison = 'EN_ROUTE';
    if (c.etape_suivi === 'ACCEPTEE') etapeSuivi = 'ACCEPTEE';
    else if (c.etape_suivi === 'PREPARATION') etapeSuivi = 'PREPARATION';
    else if (c.etape_suivi === 'LIVREE') etapeSuivi = 'LIVREE';
    else if (c.etape_suivi === 'EN_ROUTE') etapeSuivi = 'EN_ROUTE';

    let codePin: [number, number, number, number] | undefined = undefined;
    if (Array.isArray(c.code_livraison) && c.code_livraison.length === 4) {
      codePin = [Number(c.code_livraison[0]), Number(c.code_livraison[1]), Number(c.code_livraison[2]), Number(c.code_livraison[3])];
    } else if (typeof c.code_livraison_pin === 'string' && c.code_livraison_pin.length === 4) {
      codePin = [Number(c.code_livraison_pin[0]), Number(c.code_livraison_pin[1]), Number(c.code_livraison_pin[2]), Number(c.code_livraison_pin[3])];
    }

    return {
      identifiant: String(c.identifiant || c.reference || c.id || ''),
      idNumerique: c.id ? Number(c.id) : undefined,
      nomRestaurant: c.nom_restaurant || '',
      adresseImageRestaurant: c.adresse_image_restaurant || c.adresseImageRestaurant || c.etablissement?.logo || '',
      dateHeureTexte: c.date_heure_texte || '',
      statut,
      delaiOuRemarque: c.statut === 'EN_ATTENTE_PAIEMENT' ? 'Paiement en attente' : (c.delai_ou_remarque || ''),
      montantTotalFcfa: Number(c.montant_total_fcfa || c.total_fcfa || c.montantTotalFcfa || 0),
      sousTotalFcfa: Number(c.sous_total_fcfa || 0),
      fraisLivraisonFcfa: Number(c.frais_livraison_fcfa || 0),
      statutPaiement: c.statut_paiement || '',
      modePaiement: c.mode_paiement || '',
      codeLivraison: codePin,
      etapeSuivi,
      heureArriveeEstimee: c.heure_arrivee_estimee || c.heureArriveeEstimee || '',
      messageProximite: c.messageProximite || (statut === 'EN_LIVRAISON' ? 'LE LIVREUR EST EN ROUTE' : undefined),
      estEnCours: Boolean(c.est_en_cours),
      livreur: c.livreur ? {
        nom: c.livreur.nom || '',
        vehicule: c.livreur.vehicule || '',
        adressePhoto: c.livreur.adressePhoto || c.livreur.adresse_photo || '',
        numeroTelephone: c.livreur.numeroTelephone || c.livreur.telephone || '',
        latitude: c.livreur.latitude !== null && c.livreur.latitude !== undefined ? Number(c.livreur.latitude) : null,
        longitude: c.livreur.longitude !== null && c.livreur.longitude !== undefined ? Number(c.livreur.longitude) : null,
        dateDernierePosition: c.livreur.dateDernierePosition || c.livreur.date_derniere_position || null,
      } : undefined,
      articles: (c.articles || []).map((art: any) => ({
        nomPlat: art.nom_plat || '',
        quantite: Number(art.quantite || 1),
        prixUnitaireFcfa: Number(art.prix_unitaire_fcfa || (art.total_ligne_fcfa && art.quantite ? Math.round(art.total_ligne_fcfa / art.quantite) : 0)),
        prixTotalFcfa: Number(art.total_ligne_fcfa || art.prixTotalFcfa || (art.prix_unitaire_fcfa * art.quantite) || 0)
      })),
      statutBrut: c.statut || '',
      statutLibelle: c.statut_libelle || '',
      adresseLivraison: c.adresse_livraison || '',
      latitudeLivraison: c.latitude_livraison ? Number(c.latitude_livraison) : undefined,
      longitudeLivraison: c.longitude_livraison ? Number(c.longitude_livraison) : undefined,
      restaurantLatitude: c.restaurant_latitude ? Number(c.restaurant_latitude) : undefined,
      restaurantLongitude: c.restaurant_longitude ? Number(c.restaurant_longitude) : undefined,
      heureDebutPreparation: c.heure_debut_preparation || null,
      heureFinPreparation: c.heure_fin_preparation || null,
      heureDepartLivraison: c.heure_depart_livraison || null,
      heureLivraisonEffective: c.heure_livraison_effective || null,
      dateCreation: c.date_creation || null
    };
  }

  /**
   * Charge la première page des commandes du client.
   * L'API est paginée : { count, next, previous, results: [...] }.
   */
  chargerCommandes(): void {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);
    this.http.get<any>(`${environment.apiUrl}/commandes/`).subscribe({
      next: (reponse) => {
        this.listeCommandes.set((reponse.results || []).map((c: any) => this.adapterCommande(c)));
        this.urlPageSuivante.set(reponse.next || null);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.messageErreur.set('Impossible de charger vos commandes. Veuillez réessayer.');
      }
    });
  }

  /** Ajoute la page suivante de l'historique (bouton « Voir plus »). */
  chargerPlusDeCommandes(): void {
    const url = this.urlPageSuivante();
    if (!url || this.chargementEnCours()) return;
    this.chargementEnCours.set(true);
    this.http.get<any>(url).subscribe({
      next: (reponse) => {
        const suivantes = (reponse.results || []).map((c: any) => this.adapterCommande(c));
        this.listeCommandes.update((actuelles) => [...actuelles, ...suivantes]);
        this.urlPageSuivante.set(reponse.next || null);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.messageErreur.set('Impossible de charger plus de commandes. Veuillez réessayer.');
      }
    });
  }

  /**
   * Récupère une commande par son identifiant (en mémoire ou via l'API).
   * Vérifie à la fois la référence (ORD-XXXX) et l'identifiant numérique.
   */
  trouverCommandeParId(identifiant: string): CommandeClient | undefined {
    const idNettoye = String(identifiant || '').trim();
    if (!idNettoye) return undefined;

    const commandeTrouvee = this.listeCommandes().find((c) =>
      c.identifiant === idNettoye ||
      (c.idNumerique !== undefined && String(c.idNumerique) === idNettoye)
    );
    if (!commandeTrouvee) {
      // Recharger la commande directement depuis l'endpoint détail
      this.rechargerCommande(idNettoye);
    }
    return commandeTrouvee;
  }

  /**
   * Actualise l'état de la commande depuis le backend (la livraison ne peut être
   * clôturée que par la validation du PIN par le coursier côté serveur).
   */
  validerLivraison(identifiant: string): void {
    this.rechargerCommande(identifiant);
  }

  /**
   * Ajoute ou fusionne une commande dans la liste des commandes du client.
   */
  ajouterCommande(commande: CommandeClient): void {
    this.listeCommandes.update((cmds) => {
      const index = cmds.findIndex((c) =>
        c.identifiant === commande.identifiant ||
        (c.idNumerique !== undefined && commande.idNumerique !== undefined && c.idNumerique === commande.idNumerique)
      );
      if (index !== -1) {
        const copie = [...cmds];
        copie[index] = { ...copie[index], ...commande };
        return copie;
      }
      return [commande, ...cmds];
    });
  }

  /**
   * Crée une commande réelle dans l'API Django REST Framework.
   */
  creerCommande(payload: {
    etablissement_id: number;
    adresse_livraison: string;
    repere_livraison?: string;
    latitude_livraison: number;
    longitude_livraison: number;
    telephone_contact?: string;
    instructions_livraison?: string;
    mode_paiement?: string;
    source_video_id?: string;
    articles?: { plat_id: number; quantite: number; instructions_speciales?: string }[];
  }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/commandes/`, payload).pipe(
      tap((res) => {
        const adaptee = this.adapterCommande(res);
        this.ajouterCommande(adaptee);
      })
    );
  }

  /**
   * Demande au serveur les montants exacts (sous-total, frais, total) pour une position de livraison.
   * Le total renvoyé est exactement celui qui sera payé sur PayTech.
   */
  estimerCommande(payload: {
    etablissement_id: number;
    latitude_livraison: number;
    longitude_livraison: number;
    articles: { plat_id: number; quantite: number }[];
  }): Observable<EstimationCommande> {
    return this.http.post<any>(`${environment.apiUrl}/commandes/estimation/`, payload).pipe(
      map((reponse) => ({
        sousTotalFcfa: reponse.sous_total_fcfa,
        fraisLivraisonFcfa: reponse.frais_livraison_fcfa,
        totalFcfa: reponse.total_fcfa
      }))
    );
  }

  /**
   * Annule la commande (autorisé par le serveur seulement avant l'acceptation du restaurant).
   * Si elle était payée, le serveur demande aussi le remboursement à PayTech.
   */
  annulerCommande(identifiant: string | number, motif: string = ''): Observable<CommandeClient> {
    return this.http.post<any>(`${environment.apiUrl}/commandes/${identifiant}/annuler/`, { motif }).pipe(
      map((reponse) => this.adapterCommande(reponse)),
      tap((commande) => this.ajouterCommande(commande))
    );
  }

  /**
   * Démarre la session de paiement PayTech sécurisée pour la commande.
   */
  initierPaiementPayTech(commandeId: number | string): Observable<any> {
    const payload = {
      commande_id: Number(commandeId),
      url_succes: `${window.location.origin}/commandes/suivi/${commandeId}?paiement=succes`,
      url_annulation: `${window.location.origin}/commandes/suivi/${commandeId}?paiement=en_attente`
    };
    return this.http.post<any>(`${environment.apiUrl}/paiements/initier/`, payload);
  }

  /**
   * Vérifie le paiement auprès de PayTech et recharge la commande.
   */
  verifierPaiementPayTech(commandeId: number | string): Observable<any> {
    const numId = Number(commandeId);
    if (!numId) return of(null);
    return this.http.post<any>(`${environment.apiUrl}/paiements/verifier/`, { commande_id: numId }).pipe(
      tap(() => {
        this.rechargerCommande(String(commandeId));
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Recharge une commande spécifique depuis Django.
   */
  rechargerCommande(identifiant: string): void {
    this.http.get<any>(`${environment.apiUrl}/commandes/${identifiant}/`).subscribe({
      next: (c) => {
        this.connexionPerdue.set(false);
        this.ajouterCommande(this.adapterCommande(c));
      },
      // Pas de réseau : on garde le dernier état connu et on le signale (nouvel essai automatique).
      error: (erreur) => this.connexionPerdue.set(erreur?.status === 0)
    });
  }

  /**
   * Ferme l'écran de livraison validée.
   */
  fermerValidationLivraison(): void {
    this.livraisonValidee.set(false);
  }
}
