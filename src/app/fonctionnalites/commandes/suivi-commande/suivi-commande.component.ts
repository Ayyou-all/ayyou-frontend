import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { CommandeClient } from '../../../socle/modeles/commande.modele';
import { ServiceCarteDakarService } from '../../../socle/services/service-carte-dakar.service';
import { ServiceCommandesService } from '../../../socle/services/service-commandes.service';
import { ValidationLivraisonComponent } from '../validation-livraison/validation-livraison.component';

@Component({
  selector: 'app-suivi-commande',
  standalone: true,
  imports: [CommonModule, RouterModule, ValidationLivraisonComponent],
  templateUrl: './suivi-commande.component.html'
})
export class SuiviCommandeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly serviceCommandes = inject(ServiceCommandesService);
  readonly serviceCarteDakar = inject(ServiceCarteDakarService);

  private carteLeaflet?: L.Map;
  private marqueurRestaurant?: L.Marker;
  private marqueurClient?: L.Marker;
  private traceItineraire?: L.Polyline;
  private marqueurLivreur?: L.Marker;
  private intervallePolling?: any;

  // État d'ouverture de l'accordéon des détails de la commande
  readonly detailsOuverts = signal<boolean>(true);

  // Modal de contact téléphonique du livreur
  readonly modalAppelLivreur = signal<boolean>(false);

  // Identifiant de la commande sélectionnée dans la route
  readonly identifiantCommande = computed(() => {
    return this.route.snapshot.paramMap.get('idCommande') || '';
  });

  // Données de la commande courante (100% réelles, synchronisées avec la DB)
  readonly commande = computed<CommandeClient>(() => {
    const id = this.identifiantCommande();
    const liste = this.serviceCommandes.listeCommandes();
    const commandeTrouvee = liste.find((c) => c.identifiant === id || String(c.identifiant) === String(id));
    if (commandeTrouvee) return commandeTrouvee;

    return (
      this.serviceCommandes.trouverCommandeParId(id) ?? {
        identifiant: id,
        nomRestaurant: 'Restaurant partenaire',
        adresseImageRestaurant: '',
        dateHeureTexte: "Aujourd'hui",
        statut: 'PREPARATION',
        delaiOuRemarque: 'Connexion au serveur...',
        montantTotalFcfa: 0,
        codeLivraison: [0, 0, 0, 0],
        etapeSuivi: 'ACCEPTEE',
        heureArriveeEstimee: '',
        messageProximite: 'TRAITEMENT EN COURS',
        estEnCours: true,
        articles: []
      }
    );
  });

  constructor() {
    effect(() => {
      const cmd = this.commande();
      if (this.carteLeaflet) {
        this.actualiserCarte(cmd);
      }
      if (cmd.statutBrut === 'LIVREE' && !this.serviceCommandes.livraisonValidee()) {
        this.serviceCommandes.livraisonValidee.set(true);
      }
    });
  }

  // Progression dynamique calculée depuis le statut réel en base de données
  readonly pourcentageProgression = computed<number>(() => {
    const s = this.commande().statutBrut || '';
    if (s === 'EN_ATTENTE_PAIEMENT') return 0;
    if (s === 'CREEE_EN_ATTENTE') return 25;
    if (s === 'EN_PREPARATION' || s === 'PRETE_POUR_RETRAIT') return 50;
    if (['COURSE_ASSIGNEE', 'EN_VERIFICATION', 'EN_LIVRAISON', 'ARRIVE_CLIENT'].includes(s)) return 75;
    if (s === 'LIVREE') return 100;
    return 25;
  });

  readonly estEnAttentePaiement = computed<boolean>(() => {
    const s = this.commande().statutBrut || this.commande().statut;
    return s === 'EN_ATTENTE_PAIEMENT';
  });

  readonly chargementPaiement = signal<boolean>(false);
  readonly erreurPaiement = signal<string | null>(null);

  readonly etape1Active = computed<boolean>(() => {
    const s = this.commande().statutBrut || '';
    return s !== 'EN_ATTENTE_PAIEMENT';
  });
  readonly etape2Active = computed<boolean>(() => {
    const s = this.commande().statutBrut || '';
    return ['EN_PREPARATION', 'PRETE_POUR_RETRAIT', 'COURSE_ASSIGNEE', 'EN_VERIFICATION', 'EN_LIVRAISON', 'ARRIVE_CLIENT', 'LIVREE'].includes(s);
  });
  readonly etape3Active = computed<boolean>(() => {
    const s = this.commande().statutBrut || '';
    return ['COURSE_ASSIGNEE', 'EN_VERIFICATION', 'EN_LIVRAISON', 'ARRIVE_CLIENT', 'LIVREE'].includes(s);
  });
  readonly etape4Active = computed<boolean>(() => this.commande().statutBrut === 'LIVREE');

  /**
   * Permet au client de finaliser son paiement PayTech (Wave / Orange Money)
   * s'il a quitté ou annulé le guichet de paiement précédemment.
   */
  reprendrePaiement(): void {
    const cmd = this.commande();
    const id = cmd.idNumerique || cmd.identifiant || this.identifiantCommande();
    if (!id) return;

    this.chargementPaiement.set(true);
    this.erreurPaiement.set(null);

    this.serviceCommandes.initierPaiementPayTech(id).subscribe({
      next: (tentative: any) => {
        this.chargementPaiement.set(false);
        if (tentative && tentative.url_redirection) {
          window.location.href = tentative.url_redirection;
        } else {
          this.erreurPaiement.set('Impossible de générer le lien de paiement PayTech. Veuillez réessayer.');
        }
      },
      error: (err: any) => {
        this.chargementPaiement.set(false);
        const msg =
          err?.error?.message ||
          err?.error?.detail ||
          'Échec de la connexion avec le service PayTech (Wave / Orange Money).';
        this.erreurPaiement.set(msg);
      }
    });
  }

  ngOnInit(): void {
    const id = this.identifiantCommande();
    if (id) {
      // Recharger immédiatement la commande depuis le backend
      this.serviceCommandes.rechargerCommande(id);
      // Vérifier le statut PayTech en direct si retour de paiement
      this.serviceCommandes.verifierPaiementPayTech(id).subscribe();

      // Écoute temps réel : actualisation de la commande depuis la base toutes les 4 secondes
      this.intervallePolling = setInterval(() => {
        this.serviceCommandes.rechargerCommande(id);
      }, 4000);
    }
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      this.initialiserCarte();
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.intervallePolling) {
      clearInterval(this.intervallePolling);
    }
    if (this.carteLeaflet) {
      this.carteLeaflet.remove();
    }
  }

  /**
   * Initialise la carte réelle avec OpenStreetMap et les coordonnées réelles de la base de données.
   */
  private initialiserCarte(): void {
    const conteneur = document.getElementById('carte-suivi-commande');
    if (!conteneur) return;

    const cmd = this.commande();
    const coordRestaurant: [number, number] = (cmd.restaurantLatitude && cmd.restaurantLongitude)
      ? [cmd.restaurantLatitude, cmd.restaurantLongitude]
      : [14.6739, -17.4372];

    this.carteLeaflet = L.map('carte-suivi-commande', {
      zoomControl: false,
      attributionControl: false
    }).setView(coordRestaurant, 13);

    this.serviceCarteDakar.creerCoucheTuilesVoyager().addTo(this.carteLeaflet);
    this.actualiserCarte(cmd);
    this.recentrerSurCourse();
  }

  /**
   * Met à jour réactivement les marqueurs Leaflet (Restaurant, Client, Livreur et itinéraire)
   * dès que des données réelles fraîches arrivent depuis la base de données.
   */
  private actualiserCarte(cmd: CommandeClient): void {
    if (!this.carteLeaflet) return;

    const coordRestaurant: [number, number] = (cmd.restaurantLatitude && cmd.restaurantLongitude)
      ? [cmd.restaurantLatitude, cmd.restaurantLongitude]
      : [14.6739, -17.4372];

    const coordClient: [number, number] = (cmd.latitudeLivraison && cmd.longitudeLivraison)
      ? [cmd.latitudeLivraison, cmd.longitudeLivraison]
      : [14.6852, -17.4518];

    // Marqueur Restaurant
    if (!this.marqueurRestaurant) {
      this.marqueurRestaurant = L.marker(coordRestaurant, {
        icon: this.serviceCarteDakar.creerIconeRestaurant(cmd.nomRestaurant)
      }).addTo(this.carteLeaflet);
    } else {
      this.marqueurRestaurant.setLatLng(coordRestaurant);
    }

    // Marqueur Client
    if (!this.marqueurClient) {
      this.marqueurClient = L.marker(coordClient, {
        icon: this.serviceCarteDakar.creerIconeClient('Livraison')
      }).addTo(this.carteLeaflet);
    } else {
      this.marqueurClient.setLatLng(coordClient);
    }

    // Tracé de l'itinéraire
    if (!this.traceItineraire) {
      this.traceItineraire = L.polyline([coordRestaurant, coordClient], {
        color: '#E51824',
        weight: 4,
        dashArray: '6, 6',
        opacity: 0.85
      }).addTo(this.carteLeaflet);
    } else {
      this.traceItineraire.setLatLngs([coordRestaurant, coordClient]);
    }

    // Marqueur Livreur : affiché et repositionné UNIQUEMENT si assigné en DB
    if (cmd.livreur && cmd.livreur.latitude && cmd.livreur.longitude) {
      if (!this.marqueurLivreur) {
        this.marqueurLivreur = L.marker([cmd.livreur.latitude, cmd.livreur.longitude], {
          icon: this.serviceCarteDakar.creerIconeMotoLivreur(cmd.livreur.nom)
        }).addTo(this.carteLeaflet);
      } else {
        this.marqueurLivreur.setLatLng([cmd.livreur.latitude, cmd.livreur.longitude]);
      }
    } else if (this.marqueurLivreur) {
      this.marqueurLivreur.remove();
      this.marqueurLivreur = undefined;
    }
  }

  /**
   * Recentre la vue de la carte sur le livreur s'il est assigné.
   */
  recentrerSurLivreur(): void {
    if (this.carteLeaflet && this.marqueurLivreur) {
      this.carteLeaflet.setView(this.marqueurLivreur.getLatLng(), 15, { animate: true });
    } else {
      this.recentrerSurCourse();
    }
  }

  /**
   * Recentre sur l'ensemble de la course (Restaurant et Client).
   */
  recentrerSurCourse(): void {
    if (!this.carteLeaflet) return;
    const cmd = this.commande();
    const coordRestaurant: [number, number] = (cmd.restaurantLatitude && cmd.restaurantLongitude)
      ? [cmd.restaurantLatitude, cmd.restaurantLongitude]
      : [14.6739, -17.4372];
    const coordClient: [number, number] = (cmd.latitudeLivraison && cmd.longitudeLivraison)
      ? [cmd.latitudeLivraison, cmd.longitudeLivraison]
      : [14.6852, -17.4518];

    this.carteLeaflet.fitBounds([coordRestaurant, coordClient], { padding: [40, 40] });
  }

  /**
   * Bascule l'affichage du volet de détails de la commande.
   */
  basculerDetails(): void {
    this.detailsOuverts.update((ouvert) => !ouvert);
  }

  /**
   * Retourne à la liste de mes commandes.
   */
  retourner(): void {
    this.routeur.navigate(['/commandes']);
  }

  /**
   * Simule la complétion de livraison et ouvre l'écran "Commande livrée !" (Image 2).
   */
  confirmerLivraison(): void {
    this.serviceCommandes.validerLivraison(this.commande().identifiant);
  }

  /**
   * Ouvre la modale d'appel du livreur.
   */
  appelerLivreur(): void {
    this.modalAppelLivreur.set(true);
  }

  /**
   * Ferme la modale d'appel.
   */
  fermerAppel(): void {
    this.modalAppelLivreur.set(false);
  }
}

