import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { EstimationCommande, MethodePaiement, PanierRestaurant } from '../../../socle/modeles/panier.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import { ServiceCarteDakarService } from '../../../socle/services/service-carte-dakar.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServiceCommandesService } from '../../../socle/services/service-commandes.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

/**
 * Validation du panier d'un restaurant : adresse, montants exacts et paiement.
 *
 * Règles :
 * - La destination est un point choisi par le client (GPS du téléphone au départ,
 *   déplaçable sur la carte). On n'utilise jamais la position du téléphone si le client
 *   a placé le marqueur ailleurs.
 * - Les montants affichés viennent du serveur (POST /api/commandes/estimation/) :
 *   le total affiché est exactement celui qui sera payé.
 */
@Component({
  selector: 'app-detail-panier',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './detail-panier.component.html'
})
export class DetailPanierComponent implements OnInit, OnDestroy {
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly servicePanier = inject(ServicePanierService);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly serviceCommandes = inject(ServiceCommandesService);
  private readonly serviceCarte = inject(ServiceCarteDakarService);

  // Destination de la livraison
  readonly latitudeLivraison = signal<number | null>(null);
  readonly longitudeLivraison = signal<number | null>(null);
  readonly adresseLivraison = signal<string>('');
  readonly repereLivraison = signal<string>('');
  readonly localisationEnCours = signal<boolean>(false);
  readonly erreurLocalisation = signal<string | null>(null);
  readonly modalModifierAdresse = signal<boolean>(false);

  // Montants exacts calculés par le serveur
  readonly estimation = signal<EstimationCommande | null>(null);
  readonly estimationEnCours = signal<boolean>(false);
  readonly erreurEstimation = signal<string | null>(null);

  // Paiement
  readonly traitementPaiementEnCours = signal<boolean>(false);
  readonly messageErreurPaiement = signal<string | null>(null);
  readonly commandeReussie = signal<boolean>(false);
  readonly referenceCommandeCreee = signal<string>('');
  readonly commandeCreeeId = signal<string | null>(null);
  readonly noteAuRestaurant = signal<string>('');

  private carteAdresse?: L.Map;
  private marqueurDestination?: L.Marker;

  readonly identifiantRestaurant = computed(() => this.route.snapshot.paramMap.get('idRestaurant') || '');

  /** Panier du restaurant demandé, ou panier vide (aucune donnée inventée). */
  readonly panier = computed<PanierRestaurant>(() => {
    const trouve = this.servicePanier.trouverPanierRestaurant(this.identifiantRestaurant());
    if (trouve) return trouve;
    const restaurant = this.serviceCatalogue.trouverRestaurant(this.identifiantRestaurant());
    return {
      identifiantRestaurant: this.identifiantRestaurant(),
      nomRestaurant: restaurant?.nom || '',
      adresseLogoRestaurant: restaurant?.adresseLogo || '',
      delaiLivraison: restaurant?.delaiLivraisonTexte || '',
      lignes: [],
      methodePaiement: 'WAVE',
      sousTotalFcfa: 0,
      estCommandable: false,
      avertissements: []
    };
  });

  readonly aDesArticlesIndisponibles = computed(() => this.panier().lignes.some((l) => l.plat.statut === 'INDISPONIBLE'));

  readonly peutPayer = computed(
    () =>
      this.panier().lignes.length > 0 &&
      this.panier().estCommandable &&
      !this.aDesArticlesIndisponibles() &&
      this.estimation() !== null &&
      this.adresseLivraison().trim().length > 0 &&
      !this.traitementPaiementEnCours()
  );

  constructor() {
    // Recalcul des montants dès que la destination ou le contenu du panier change.
    effect(() => {
      const lignes = this.panier().lignes;
      const latitude = this.latitudeLivraison();
      const longitude = this.longitudeLivraison();
      untracked(() => this.actualiserEstimation(lignes, latitude, longitude));
    });
  }

  ngOnInit(): void {
    this.detecterPositionReelle();
  }

  ngOnDestroy(): void {
    this.carteAdresse?.remove();
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    this.fermerModifierAdresse();
    this.commandeReussie.set(false);
  }

  // ---------------------------------------------------------------------------
  // Destination
  // ---------------------------------------------------------------------------

  /** Point de départ : la position GPS réelle du téléphone (modifiable ensuite sur la carte). */
  detecterPositionReelle(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.erreurLocalisation.set("La géolocalisation n'est pas disponible : placez votre adresse sur la carte.");
      return;
    }
    this.localisationEnCours.set(true);
    this.erreurLocalisation.set(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.localisationEnCours.set(false);
        this.definirDestination(position.coords.latitude, position.coords.longitude);
      },
      () => {
        this.localisationEnCours.set(false);
        this.erreurLocalisation.set('Position GPS indisponible. Ouvrez « Modifier » et placez votre adresse sur la carte.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /** Enregistre la destination et propose une adresse lisible (géocodage inverse OpenStreetMap). */
  definirDestination(latitude: number, longitude: number): void {
    this.erreurLocalisation.set(null); // la destination est connue : l'ancien message GPS n'a plus lieu d'être
    this.latitudeLivraison.set(Number(latitude.toFixed(6)));
    this.longitudeLivraison.set(Number(longitude.toFixed(6)));
    this.marqueurDestination?.setLatLng([latitude, longitude]);

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
      .then((reponse) => reponse.json())
      .then((donnees) => {
        const adresse = donnees.address || {};
        const morceaux = [
          adresse.road || adresse.pedestrian,
          adresse.suburb || adresse.neighbourhood || adresse.city_district,
          adresse.city || adresse.town
        ].filter(Boolean);
        if (morceaux.length > 0) this.adresseLivraison.set(morceaux.join(', '));
      })
      .catch(() => {
        // Sans géocodage, le client saisit lui-même son adresse : la position reste celle du marqueur.
      });
  }

  ouvrirModifierAdresse(): void {
    this.modalModifierAdresse.set(true);
    // La carte ne peut être créée qu'une fois la modale affichée dans la page.
    setTimeout(() => this.initialiserCarteAdresse());
  }

  fermerModifierAdresse(): void {
    this.modalModifierAdresse.set(false);
    this.carteAdresse?.remove();
    this.carteAdresse = undefined;
    this.marqueurDestination = undefined;
  }

  /** Carte où le client place (clic) ou glisse le marqueur sur sa vraie adresse de livraison. */
  private initialiserCarteAdresse(): void {
    if (!document.getElementById('carte-adresse-livraison')) return;
    const latitude = this.latitudeLivraison();
    const longitude = this.longitudeLivraison();
    const centre: [number, number] = latitude !== null && longitude !== null ? [latitude, longitude] : this.serviceCarte.centreDakar;

    this.carteAdresse = L.map('carte-adresse-livraison', { attributionControl: false }).setView(centre, latitude !== null ? 16 : 12);
    this.serviceCarte.creerCoucheTuilesVoyager().addTo(this.carteAdresse);

    if (latitude !== null && longitude !== null) {
      this.placerMarqueur(latitude, longitude);
    }
    this.carteAdresse.on('click', (evenement: L.LeafletMouseEvent) => {
      this.placerMarqueur(evenement.latlng.lat, evenement.latlng.lng);
      this.definirDestination(evenement.latlng.lat, evenement.latlng.lng);
    });
  }

  private placerMarqueur(latitude: number, longitude: number): void {
    if (!this.carteAdresse) return;
    if (this.marqueurDestination) {
      this.marqueurDestination.setLatLng([latitude, longitude]);
      return;
    }
    this.marqueurDestination = L.marker([latitude, longitude], {
      draggable: true,
      icon: this.serviceCarte.creerIconeClient('Livraison')
    }).addTo(this.carteAdresse);
    this.marqueurDestination.on('dragend', () => {
      const position = this.marqueurDestination!.getLatLng();
      this.definirDestination(position.lat, position.lng);
    });
  }

  // ---------------------------------------------------------------------------
  // Montants exacts (serveur)
  // ---------------------------------------------------------------------------

  private actualiserEstimation(lignes: PanierRestaurant['lignes'], latitude: number | null, longitude: number | null): void {
    this.estimation.set(null);
    this.erreurEstimation.set(null);
    const etablissementId = Number(this.identifiantRestaurant());
    if (lignes.length === 0 || latitude === null || longitude === null || !etablissementId) return;

    this.estimationEnCours.set(true);
    this.serviceCommandes
      .estimerCommande({
        etablissement_id: etablissementId,
        latitude_livraison: latitude,
        longitude_livraison: longitude,
        articles: lignes.map((l) => ({ plat_id: Number(l.plat.identifiant), quantite: l.quantite }))
      })
      .subscribe({
        next: (montants) => {
          this.estimationEnCours.set(false);
          this.estimation.set(montants);
        },
        error: (erreur) => {
          this.estimationEnCours.set(false);
          this.erreurEstimation.set(erreur?.error?.message || 'Impossible de calculer les frais de livraison. Vérifiez votre connexion.');
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Panier
  // ---------------------------------------------------------------------------

  augmenterQuantite(identifiantPlat: string): void {
    this.servicePanier.modifierQuantiteArticle(this.identifiantRestaurant(), identifiantPlat, 1);
  }

  diminuerQuantite(identifiantPlat: string): void {
    this.servicePanier.modifierQuantiteArticle(this.identifiantRestaurant(), identifiantPlat, -1);
  }

  supprimerArticle(identifiantPlat: string): void {
    this.servicePanier.supprimerArticle(this.identifiantRestaurant(), identifiantPlat);
  }

  viderPanier(): void {
    this.servicePanier.viderPanierRestaurant(this.identifiantRestaurant());
    this.routeur.navigate(['/panier']);
  }

  choisirMethodePaiement(methode: MethodePaiement): void {
    this.servicePanier.definirMethodePaiement(this.identifiantRestaurant(), methode);
  }

  allerVersProfilRestaurant(): void {
    this.routeur.navigate(['/restaurant', this.identifiantRestaurant()]);
  }

  ajouterAutresPlats(): void {
    this.allerVersProfilRestaurant();
  }

  retourner(): void {
    this.routeur.navigate(['/panier']);
  }

  // ---------------------------------------------------------------------------
  // Paiement
  // ---------------------------------------------------------------------------

  effectuerPaiement(): void {
    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification('COMMANDE', () => this.effectuerPaiement(), {
        titre: 'Payer votre commande',
        description: 'Connectez-vous pour finaliser votre commande, enregistrer votre adresse de livraison et suivre votre livreur.'
      });
      return;
    }
    const latitude = this.latitudeLivraison();
    const longitude = this.longitudeLivraison();
    if (!this.peutPayer() || latitude === null || longitude === null) {
      this.messageErreurPaiement.set('Choisissez votre adresse de livraison sur la carte avant de payer.');
      return;
    }

    this.traitementPaiementEnCours.set(true);
    this.messageErreurPaiement.set(null);
    this.servicePanier.definirNoteRestaurant(this.identifiantRestaurant(), this.noteAuRestaurant());
    const panier = this.panier();

    this.serviceCommandes
      .creerCommande({
        etablissement_id: Number(this.identifiantRestaurant()),
        adresse_livraison: this.adresseLivraison().trim(),
        repere_livraison: this.repereLivraison().trim(),
        latitude_livraison: latitude,
        longitude_livraison: longitude,
        instructions_livraison: this.noteAuRestaurant(),
        mode_paiement: panier.methodePaiement,
        articles: panier.lignes.map((l) => ({
          plat_id: Number(l.plat.identifiant),
          quantite: l.quantite,
          instructions_speciales: l.instructionsSpeciales || ''
        }))
      })
      .subscribe({
        next: (commande: any) => {
          this.commandeCreeeId.set(String(commande.id));
          this.referenceCommandeCreee.set(commande.identifiant || commande.reference || String(commande.id));
          this.servicePanier.supprimerPanier(this.identifiantRestaurant());
          this.lancerPaiementPayTech(commande.id);
        },
        error: (erreur: any) => {
          this.traitementPaiementEnCours.set(false);
          this.messageErreurPaiement.set(this.extraireMessageErreur(erreur, 'La commande n\'a pas pu être créée.'));
        }
      });
  }

  /** Redirige vers le guichet PayTech (Wave / Orange Money). */
  private lancerPaiementPayTech(commandeId: number): void {
    this.serviceCommandes.initierPaiementPayTech(commandeId).subscribe({
      next: (tentative: any) => {
        if (tentative?.url_redirection) {
          window.location.href = tentative.url_redirection;
          return;
        }
        this.traitementPaiementEnCours.set(false);
        this.messageErreurPaiement.set('Lien de paiement indisponible. Reprenez le paiement depuis « Mes commandes ».');
      },
      error: (erreur: any) => {
        // La commande existe déjà : le client pourra reprendre le paiement depuis son suivi.
        this.traitementPaiementEnCours.set(false);
        this.commandeReussie.set(false);
        this.messageErreurPaiement.set(
          this.extraireMessageErreur(erreur, 'Le paiement n\'a pas pu démarrer.') + ' Vous pouvez le reprendre depuis « Mes commandes ».'
        );
      }
    });
  }

  private extraireMessageErreur(erreur: any, messageParDefaut: string): string {
    const corps = erreur?.error;
    if (corps?.message) return corps.message;
    if (corps && typeof corps === 'object') {
      const premiereValeur = Object.values(corps)[0];
      if (Array.isArray(premiereValeur) && premiereValeur.length > 0) return String(premiereValeur[0]);
    }
    return messageParDefaut;
  }

  allerVersCommandes(): void {
    const idCommande = this.commandeCreeeId();
    this.commandeReussie.set(false);
    this.routeur.navigate(idCommande ? ['/commandes/suivi', idCommande] : ['/commandes']);
  }
}
