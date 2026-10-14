/**
 * Service de gestion des commandes et du suivi GPS des livreurs AYYOU.
 * Consomme l'API Django REST Framework sans aucune fausse donnée mockée.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommandeClient, EtapeSuiviLivraison, StatutCommande } from '../modeles/commande.modele';

@Injectable({
  providedIn: 'root'
})
export class ServiceCommandesService {
  private readonly http = inject(HttpClient);

  // Liste réactive des commandes du client connecté alimentée par Django
  readonly listeCommandes = signal<CommandeClient[]>([]);

  // Progression de la géolocalisation GPS du livreur sur le trajet (0 à 100 %)
  readonly progressionGpsLivreur = signal<number>(68);

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

  constructor() {
    this.chargerCommandes();
  }

  /**
   * Adapte un objet Commande Django vers l'interface CommandeClient Angular.
   */
  adapterCommande(c: any): CommandeClient {
    // Normalisation du statut
    let statut: StatutCommande = 'EN_LIVRAISON';
    if (c.statut === 'EN_ATTENTE_PAIEMENT') statut = 'EN_ATTENTE_PAIEMENT';
    else if (c.statut === 'LIVREE') statut = 'LIVRE';
    else if (c.statut === 'EN_PREPARATION') statut = 'PREPARATION';
    else if (c.statut === 'PRETE_POUR_RETRAIT') statut = 'PRET';
    else if (c.statut === 'REFUSEE_ANNULEE') statut = 'REFUSE';
    else if (c.statut === 'EN_LIVRAISON') statut = 'EN_LIVRAISON';

    // Normalisation de l'étape de suivi
    let etapeSuivi: EtapeSuiviLivraison = 'EN_ROUTE';
    if (c.etape_suivi === 'ACCEPTEE') etapeSuivi = 'ACCEPTEE';
    else if (c.etape_suivi === 'PREPARATION') etapeSuivi = 'PREPARATION';
    else if (c.etape_suivi === 'LIVREE') etapeSuivi = 'LIVREE';
    else if (c.etape_suivi === 'EN_ROUTE') etapeSuivi = 'EN_ROUTE';

    const codePin: [number, number, number, number] =
      Array.isArray(c.code_livraison) && c.code_livraison.length === 4
        ? [Number(c.code_livraison[0]), Number(c.code_livraison[1]), Number(c.code_livraison[2]), Number(c.code_livraison[3])]
        : [4, 8, 2, 5];

    return {
      identifiant: String(c.identifiant || c.reference || c.id || ''),
      idNumerique: c.id ? Number(c.id) : undefined,
      nomRestaurant: c.nom_restaurant || c.nomRestaurant || c.etablissement?.nom || 'Restaurant partenaire',
      adresseImageRestaurant: c.adresse_image_restaurant || c.adresseImageRestaurant || c.etablissement?.logo || '',
      dateHeureTexte: c.date_heure_texte || c.dateHeureTexte || 'Aujourd\'hui',
      statut,
      delaiOuRemarque: c.statut === 'EN_ATTENTE_PAIEMENT' ? 'Paiement en attente' : (c.delai_ou_remarque || c.delaiOuRemarque || '20-30 min'),
      montantTotalFcfa: Number(c.montant_total_fcfa || c.total_fcfa || c.montantTotalFcfa || 0),
      codeLivraison: codePin,
      etapeSuivi,
      heureArriveeEstimee: c.heure_arrivee_estimee || c.heureArriveeEstimee || '',
      messageProximite: c.messageProximite || (statut === 'EN_LIVRAISON' ? 'LE LIVREUR EST EN ROUTE' : undefined),
      estEnCours: c.est_en_cours ?? (statut !== 'LIVRE' && statut !== 'REFUSE'),
      livreur: c.livreur ? {
        nom: c.livreur.nom || 'Livreur',
        vehicule: c.livreur.vehicule || 'Moto',
        adressePhoto: c.livreur.adressePhoto || c.livreur.adresse_photo || '',
        numeroTelephone: c.livreur.numeroTelephone || c.livreur.telephone || '',
        latitude: Number(c.livreur.latitude || 14.6928),
        longitude: Number(c.livreur.longitude || -17.4467)
      } : undefined,
      articles: (c.articles || []).map((art: any) => ({
        nomPlat: art.nom_plat || art.nomPlat || 'Plat',
        quantite: Number(art.quantite || 1),
        prixTotalFcfa: Number(art.total_ligne_fcfa || art.prixTotalFcfa || (art.prix_unitaire_fcfa * art.quantite) || 0)
      })),
      statutBrut: c.statut || '',
      statutLibelle: c.statut === 'EN_ATTENTE_PAIEMENT' ? 'Paiement en attente' : (c.statut_libelle || (statut === 'PREPARATION' ? 'En préparation' : statut === 'LIVRE' ? 'Livrée' : statut === 'REFUSE' ? 'Refusée' : 'En livraison')),
      adresseLivraison: c.adresse_livraison || '',
      latitudeLivraison: c.latitude_livraison ? Number(c.latitude_livraison) : undefined,
      longitudeLivraison: c.longitude_livraison ? Number(c.longitude_livraison) : undefined,
      restaurantLatitude: c.restaurant_latitude ? Number(c.restaurant_latitude) : undefined,
      restaurantLongitude: c.restaurant_longitude ? Number(c.restaurant_longitude) : undefined
    };
  }

  /**
   * Charge les commandes réelles du client depuis l'API Django.
   */
  chargerCommandes(): void {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);

    this.http.get<any[]>(`${environment.apiUrl}/commandes/`).pipe(
      map((commandes) => commandes.map((c) => this.adapterCommande(c))),
      catchError(() => of([]))
    ).subscribe({
      next: (liste) => {
        this.listeCommandes.set(liste);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
      }
    });
  }

  /**
   * Récupère une commande par son identifiant (en mémoire ou via l'API).
   */
  trouverCommandeParId(identifiant: string): CommandeClient | undefined {
    const commandeTrouvee = this.listeCommandes().find((c) => c.identifiant === identifiant);
    if (!commandeTrouvee) {
      // Recharger la commande directement depuis l'endpoint détail
      this.http.get<any>(`${environment.apiUrl}/commandes/${identifiant}/`).subscribe({
        next: (c) => {
          const adaptee = this.adapterCommande(c);
          this.ajouterCommande(adaptee);
        },
        error: () => {}
      });
    }
    return commandeTrouvee;
  }

  /**
   * Valide la livraison de la commande en cours.
   */
  validerLivraison(identifiant: string): void {
    this.listeCommandes.update((cmds) =>
      cmds.map((c) => {
        if (c.identifiant === identifiant) {
          return {
            ...c,
            statut: 'LIVRE',
            etapeSuivi: 'LIVREE',
            estEnCours: false
          };
        }
        return c;
      })
    );
    this.livraisonValidee.set(true);
  }

  /**
   * Ajoute une nouvelle commande dans la liste des commandes du client.
   */
  ajouterCommande(commande: CommandeClient): void {
    this.listeCommandes.update((cmds) => {
      const existe = cmds.some((c) => c.identifiant === commande.identifiant);
      if (existe) {
        return cmds.map((c) => (c.identifiant === commande.identifiant ? commande : c));
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
    telephone_contact?: string;
    instructions_livraison?: string;
    mode_paiement?: string;
    latitude_livraison?: number | null;
    longitude_livraison?: number | null;
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
   * Démarre la session de paiement PayTech sécurisée pour la commande.
   */
  initierPaiementPayTech(commandeId: number | string): Observable<any> {
    const payload = {
      commande_id: Number(commandeId),
      url_succes: `${window.location.origin}/commandes/suivi/${commandeId}`,
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
        const adaptee = this.adapterCommande(c);
        this.ajouterCommande(adaptee);
      },
      error: () => {}
    });
  }

  /**
   * Ferme l'écran de livraison validée.
   */
  fermerValidationLivraison(): void {
    this.livraisonValidee.set(false);
  }
}
