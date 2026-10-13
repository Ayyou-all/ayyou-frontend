import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, inject, OnDestroy, signal } from '@angular/core';
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
export class SuiviCommandeComponent implements AfterViewInit, OnDestroy {
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly serviceCommandes = inject(ServiceCommandesService);
  readonly serviceCarteDakar = inject(ServiceCarteDakarService);

  private carteLeaflet?: L.Map;
  private marqueurLivreur?: L.Marker;
  private intervalleSimulation?: any;

  // État d'ouverture de l'accordéon des détails de la commande
  readonly detailsOuverts = signal<boolean>(true);

  // Modal de contact téléphonique du livreur
  readonly modalAppelLivreur = signal<boolean>(false);

  // Identifiant de la commande sélectionnée dans la route
  readonly identifiantCommande = computed(() => {
    return this.route.snapshot.paramMap.get('idCommande') || 'ORD-99238';
  });

  // Données de la commande courante
  readonly commande = computed<CommandeClient>(() => {
    const id = this.identifiantCommande();
    return (
      this.serviceCommandes.trouverCommandeParId(id) ??
      this.serviceCommandes.listeCommandes()[0]
    );
  });

  // Progression simulée du déplacement GPS du livreur (de 0% à 100%)
  readonly progressionGps = signal<number>(68);

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      this.initialiserCarte();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.intervalleSimulation) {
      clearInterval(this.intervalleSimulation);
    }
    if (this.carteLeaflet) {
      this.carteLeaflet.remove();
    }
  }

  /**
   * Initialise la carte réelle de Dakar avec OpenStreetMap / CartoDB Voyager.
   */
  private initialiserCarte(): void {
    const conteneur = document.getElementById('carte-suivi-commande');
    if (!conteneur) return;

    // Coordonnées réelles à Dakar
    const coordRestaurant = this.serviceCarteDakar.restaurantTeranga; // Plateau
    const coordClient = this.serviceCarteDakar.clientMedina;          // Médina
    const trajet = this.serviceCarteDakar.trajetPlateauMedina;

    // Calcul de la position intermédiaire du livreur (entre Plateau et Médina)
    const positionLivreur: [number, number] = [14.6795, -17.4435];

    // Création de la carte centrée sur Dakar
    this.carteLeaflet = L.map('carte-suivi-commande', {
      zoomControl: false,
      attributionControl: false
    }).setView([14.6780, -17.4410], 14);

    // Couche de tuiles réelles
    this.serviceCarteDakar.creerCoucheTuilesVoyager().addTo(this.carteLeaflet);

    // Tracé de l'itinéraire réel
    L.polyline(trajet, {
      color: '#E51824',
      weight: 5,
      dashArray: '8, 8',
      opacity: 0.85
    }).addTo(this.carteLeaflet);

    // Marqueur Restaurant Le Teranga
    L.marker(coordRestaurant, {
      icon: this.serviceCarteDakar.creerIconeRestaurant('Le Teranga')
    }).addTo(this.carteLeaflet);

    // Marqueur Client Médina
    L.marker(coordClient, {
      icon: this.serviceCarteDakar.creerIconeClient('Vous')
    }).addTo(this.carteLeaflet);

    // Marqueur Livreur Moussa
    this.marqueurLivreur = L.marker(positionLivreur, {
      icon: this.serviceCarteDakar.creerIconeMotoLivreur('Moussa')
    }).addTo(this.carteLeaflet);

    // Déplacement dynamique fluide simulé du livreur en direct
    let indexEtape = 2;
    this.intervalleSimulation = setInterval(() => {
      if (!this.marqueurLivreur || !this.carteLeaflet) return;
      indexEtape = (indexEtape + 1) % trajet.length;
      const prochainePos = trajet[indexEtape];
      this.marqueurLivreur.setLatLng(prochainePos);
    }, 4000);
  }

  /**
   * Recentre la vue de la carte sur le livreur.
   */
  recentrerSurLivreur(): void {
    if (this.carteLeaflet && this.marqueurLivreur) {
      this.carteLeaflet.setView(this.marqueurLivreur.getLatLng(), 15, { animate: true });
    }
  }

  /**
   * Recentre sur l'ensemble de la course (Restaurant et Client).
   */
  recentrerSurCourse(): void {
    if (this.carteLeaflet) {
      this.carteLeaflet.fitBounds(
        [
          this.serviceCarteDakar.restaurantTeranga,
          this.serviceCarteDakar.clientMedina
        ],
        { padding: [40, 40] }
      );
    }
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

