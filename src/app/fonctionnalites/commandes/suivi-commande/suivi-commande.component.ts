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

  // Télémétrie en temps réel calculée depuis la position GPS réelle
  readonly distanceRestanteKm = signal<number | null>(null);
  readonly tempsRestantMinutes = signal<number | null>(null);
  readonly routageDisponible = signal<boolean>(true);

  // Identifiant de la commande sélectionnée dans la route
  readonly identifiantCommande = computed(() => {
    return this.route.snapshot.paramMap.get('idCommande') || '';
  });

  // Données de la commande courante (100% réelles, synchronisées avec la DB)
  readonly commande = computed<CommandeClient>(() => {
    const id = this.identifiantCommande();
    const liste = this.serviceCommandes.listeCommandes();
    const commandeTrouvee = liste.find(
      (c) =>
        c.identifiant === id ||
        String(c.identifiant) === String(id) ||
        (c.idNumerique !== undefined && String(c.idNumerique) === String(id))
    );
    if (commandeTrouvee) return commandeTrouvee;

    return (
      this.serviceCommandes.trouverCommandeParId(id) ?? {
        identifiant: id,
        nomRestaurant: 'Restaurant partenaire',
        adresseImageRestaurant: '',
        dateHeureTexte: "Aujourd'hui",
        statut: 'PREPARATION',
        delaiOuRemarque: 'Chargement des détails...',
        montantTotalFcfa: 0,
        etapeSuivi: 'ACCEPTEE',
        heureArriveeEstimee: '',
        messageProximite: 'TRAITEMENT EN COURS',
        estEnCours: true,
        articles: []
      }
    );
  });

  // Indicateur de fraîcheur de la position GPS du livreur
  readonly statutGpsLivreur = computed(() => {
    const l = this.commande().livreur;
    if (!l) {
      return { niveau: 'non_assigne', texte: 'Livreur en cours d\'attribution' };
    }
    if (l.latitude === null || l.latitude === undefined || l.longitude === null || l.longitude === undefined) {
      return { niveau: 'sans_gps', texte: 'En attente du signal GPS' };
    }
    if (!l.dateDernierePosition) {
      return { niveau: 'direct', texte: 'Position GPS en direct' };
    }

    try {
      const timestamp = new Date(l.dateDernierePosition).getTime();
      const ecartSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
      if (ecartSec < 60) {
        return { niveau: 'direct', texte: `En direct (il y a ${ecartSec}s)` };
      } else if (ecartSec < 300) {
        const min = Math.round(ecartSec / 60);
        return { niveau: 'recent', texte: `Actualisé il y a ${min} min` };
      } else {
        const dateObj = new Date(timestamp);
        const heureStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return { niveau: 'obsolete', texte: `Signal GPS obsolète (${heureStr})` };
      }
    } catch {
      return { niveau: 'direct', texte: 'Position GPS reçue' };
    }
  });

  // Timeline des étapes réelles alimentée par les statuts et horodatages de la base de données
  readonly timeline = computed(() => {
    const cmd = this.commande();
    const s = cmd.statutBrut || '';

    const formatHeure = (dateStr?: string | null) => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    };

    const heureCreation = formatHeure(cmd.dateCreation) || (cmd.dateHeureTexte ? cmd.dateHeureTexte.split(',')[1]?.trim() || '' : '');
    const heureDebutPrep = formatHeure(cmd.heureDebutPreparation);
    const heureFinPrep = formatHeure(cmd.heureFinPreparation);
    const heureDepart = formatHeure(cmd.heureDepartLivraison);
    const heureLivraison = formatHeure(cmd.heureLivraisonEffective);

    const ordre = [
      'EN_ATTENTE_PAIEMENT',
      'CREEE_EN_ATTENTE',
      'EN_PREPARATION',
      'PRETE_POUR_RETRAIT',
      'COURSE_ASSIGNEE',
      'EN_VERIFICATION',
      'EN_LIVRAISON',
      'ARRIVE_CLIENT',
      'LIVREE'
    ];
    const idxActuel = ordre.indexOf(s);
    const atteint = (cle: string) => idxActuel >= ordre.indexOf(cle);

    return [
      {
        titre: 'Commande enregistrée',
        description: s === 'EN_ATTENTE_PAIEMENT' ? 'En attente de règlement PayTech' : 'Commande confirmée et transmise au restaurant',
        heure: heureCreation,
        icone: 'fa-solid fa-receipt',
        etat: s === 'EN_ATTENTE_PAIEMENT' ? 'en_cours' : (idxActuel >= 1 ? 'termine' : 'a_venir')
      },
      {
        titre: 'Préparation en cuisine',
        description: atteint('EN_PREPARATION') ? (heureDebutPrep ? `Cuisine démarrée à ${heureDebutPrep}` : 'Le restaurant prépare vos plats') : 'En attente de prise en charge par le restaurant',
        heure: heureDebutPrep,
        icone: 'fa-solid fa-fire-burner',
        etat: atteint('PRETE_POUR_RETRAIT') ? 'termine' : (s === 'EN_PREPARATION' ? 'en_cours' : 'a_venir')
      },
      {
        titre: 'Commande prête au comptoir',
        description: atteint('PRETE_POUR_RETRAIT') ? (heureFinPrep ? `Prête pour retrait à ${heureFinPrep}` : 'Emballée et prête au comptoir') : 'Préparation en cours',
        heure: heureFinPrep,
        icone: 'fa-solid fa-box-open',
        etat: atteint('COURSE_ASSIGNEE') || atteint('EN_VERIFICATION') || atteint('EN_LIVRAISON') ? 'termine' : (s === 'PRETE_POUR_RETRAIT' ? 'en_cours' : 'a_venir')
      },
      {
        titre: 'Livreur affecté',
        description: cmd.livreur ? `${cmd.livreur.nom} est en route vers le restaurant` : 'Recherche d\'un coursier à proximité',
        heure: '',
        icone: 'fa-solid fa-motorcycle',
        etat: atteint('EN_LIVRAISON') ? 'termine' : (['COURSE_ASSIGNEE', 'EN_VERIFICATION'].includes(s) ? 'en_cours' : 'a_venir')
      },
      {
        titre: 'Colis récupéré & en route vers vous',
        description: atteint('EN_LIVRAISON') ? (heureDepart ? `En livraison depuis ${heureDepart}` : 'Le coursier est en route vers votre adresse') : 'Prise en charge à venir',
        heure: heureDepart,
        icone: 'fa-solid fa-route',
        etat: atteint('LIVREE') ? 'termine' : (['EN_LIVRAISON', 'ARRIVE_CLIENT'].includes(s) ? 'en_cours' : 'a_venir')
      },
      {
        titre: 'Commande livrée et validée',
        description: s === 'LIVREE' ? (heureLivraison ? `Livraison confirmée à ${heureLivraison}` : 'Livrée et validée par le code PIN') : 'Donnez le code PIN au livreur pour clôturer la livraison',
        heure: heureLivraison,
        icone: 'fa-solid fa-circle-check',
        etat: s === 'LIVREE' ? 'termine' : 'a_venir'
      }
    ];
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
    if (s === 'CREEE_EN_ATTENTE') return 20;
    if (s === 'EN_PREPARATION') return 40;
    if (s === 'PRETE_POUR_RETRAIT') return 60;
    if (s === 'COURSE_ASSIGNEE' || s === 'EN_VERIFICATION') return 75;
    if (s === 'EN_LIVRAISON' || s === 'ARRIVE_CLIENT') return 88;
    if (s === 'LIVREE') return 100;
    return 20;
  });

  readonly estEnAttentePaiement = computed<boolean>(() => {
    const s = this.commande().statutBrut || this.commande().statut;
    return s === 'EN_ATTENTE_PAIEMENT';
  });

  readonly chargementPaiement = signal<boolean>(false);
  readonly erreurPaiement = signal<string | null>(null);
  readonly alertePaiementSucces = signal<boolean>(false);

  /**
   * Ferme manuellement la bannière festive de confirmation de paiement.
   */
  fermerAlerteSucces(): void {
    this.alertePaiementSucces.set(false);
  }

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
   * Émet une mélodie festive pour confirmer le succès du paiement.
   */
  jouerSonConfirmation(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.35);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
        });
      }
    } catch {}
  }

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
    const paramPaiement = this.route.snapshot.queryParamMap.get('paiement');

    if (paramPaiement === 'succes') {
      this.alertePaiementSucces.set(true);
      this.jouerSonConfirmation();
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }, 2500);
    }

    if (id) {
      // Recharger immédiatement la commande depuis le backend
      this.serviceCommandes.rechargerCommande(id);
      // Vérifier le statut PayTech en direct si retour de paiement
      this.serviceCommandes.verifierPaiementPayTech(id).subscribe({
        next: () => {
          this.serviceCommandes.rechargerCommande(id);
        }
      });

      // Écoute temps réel : actualisation de la commande depuis la base toutes les 4 secondes
      this.intervallePolling = setInterval(() => {
        const cmdCourante = this.commande();
        if (cmdCourante.statutBrut === 'LIVREE' || cmdCourante.statutBrut === 'REFUSEE_ANNULEE') {
          if (this.intervallePolling) {
            clearInterval(this.intervallePolling);
            this.intervallePolling = null;
          }
          return;
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return;
        }
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

    // Détermination dynamique des points de départ et d'arrivée du tracé routier
    let pointDepart: [number, number] = coordRestaurant;
    let pointArrivee: [number, number] = coordClient;

    const s = cmd.statutBrut || '';
    const livreurGpsValide = Boolean(
      cmd.livreur &&
      cmd.livreur.latitude !== null && cmd.livreur.latitude !== undefined &&
      cmd.livreur.longitude !== null && cmd.livreur.longitude !== undefined
    );

    if (livreurGpsValide) {
      const coordLivreur: [number, number] = [cmd.livreur!.latitude!, cmd.livreur!.longitude!];
      pointDepart = coordLivreur;

      if (['COURSE_ASSIGNEE', 'EN_VERIFICATION'].includes(s)) {
        // En route vers le restaurant
        pointArrivee = coordRestaurant;
      } else {
        // En route vers le client ou arrivé au pied du domicile
        pointArrivee = coordClient;
      }
    }

    // Calcul de l'itinéraire routier via OSRM et recalcul de la distance / durée restante
    this.serviceCarteDakar.obtenirItineraireDetaille(pointDepart, pointArrivee).then((detail) => {
      if (!this.carteLeaflet) return;
      this.distanceRestanteKm.set(detail.distanceKm);
      this.tempsRestantMinutes.set(detail.dureeMinutes);
      this.routageDisponible.set(detail.succesRoutage);

      if (!this.traceItineraire) {
        this.traceItineraire = L.polyline(detail.points, {
          color: '#E51824',
          weight: 4,
          opacity: 0.85
        }).addTo(this.carteLeaflet);
      } else {
        this.traceItineraire.setLatLngs(detail.points);
      }
    });

    // Marqueur Livreur : affiché et repositionné dynamiquement UNIQUEMENT si assigné avec coordonnées GPS
    if (livreurGpsValide) {
      const coordLivreur: [number, number] = [cmd.livreur!.latitude!, cmd.livreur!.longitude!];
      if (!this.marqueurLivreur) {
        this.marqueurLivreur = L.marker(coordLivreur, {
          icon: this.serviceCarteDakar.creerIconeMotoLivreur(cmd.livreur!.nom)
        }).addTo(this.carteLeaflet);
      } else {
        this.marqueurLivreur.setLatLng(coordLivreur);
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
   * Actualise la commande depuis le serveur (le statut LIVREE provient uniquement du backend).
   */
  confirmerLivraison(): void {
    this.serviceCommandes.rechargerCommande(this.commande().identifiant);
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

