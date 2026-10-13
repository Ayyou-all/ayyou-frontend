import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { ServiceCarteDakarService } from '../../../socle/services/service-carte-dakar.service';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-trajet-client',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './trajet-client.component.html'
})
export class TrajetClientComponent implements AfterViewInit, OnDestroy {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly serviceCarteDakar = inject(ServiceCarteDakarService);
  readonly routeur = inject(Router);

  private carteLeaflet?: L.Map;
  private coucheActuelle?: L.TileLayer;
  private modeSombre: boolean = false;

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      this.initialiserCarte();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.carteLeaflet) {
      this.carteLeaflet.remove();
    }
  }

  /**
   * Initialise la carte réelle de Dakar reliant le Plateau / Corniche aux Almadies.
   */
  private initialiserCarte(): void {
    const conteneur = document.getElementById('carte-trajet-client');
    if (!conteneur) return;

    // Coordonnées réelles à Dakar
    const coordClient = this.serviceCarteDakar.clientAlmadies; // Almadies, Villa 45 [14.7435, -17.5180]
    const coordLivreur = this.serviceCarteDakar.livreurVersAlmadies; // Corniche Ouest / VDN [14.7150, -17.4780]
    const trajet = this.serviceCarteDakar.trajetPlateauAlmadies;

    this.carteLeaflet = L.map('carte-trajet-client', {
      zoomControl: false,
      attributionControl: false
    }).setView([14.7280, -17.4950], 13);

    // Couche de tuiles réelles de Dakar
    this.coucheActuelle = this.serviceCarteDakar.creerCoucheTuilesVoyager();
    this.coucheActuelle.addTo(this.carteLeaflet);

    // Tracé de la route réelle le long de la Corniche et VDN
    L.polyline(trajet, {
      color: '#0284c7',
      weight: 7,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.95
    }).addTo(this.carteLeaflet);

    // Marqueur Maison Client (Almadies)
    L.marker(coordClient, {
      icon: this.serviceCarteDakar.creerIconeClient('Almadies')
    }).addTo(this.carteLeaflet);

    // Marqueur Moto Livreur en direct
    L.marker(coordLivreur, {
      icon: this.serviceCarteDakar.creerIconeMotoLivreur('Moussa')
    }).addTo(this.carteLeaflet);
  }

  /**
   * Bascule le style de carte (Voyager / Sombre).
   */
  basculerStyleCarte(): void {
    if (!this.carteLeaflet || !this.coucheActuelle) return;

    this.carteLeaflet.removeLayer(this.coucheActuelle);
    this.modeSombre = !this.modeSombre;

    this.coucheActuelle = this.modeSombre
      ? this.serviceCarteDakar.creerCoucheTuilesSombre()
      : this.serviceCarteDakar.creerCoucheTuilesVoyager();

    this.coucheActuelle.addTo(this.carteLeaflet);
  }

  /**
   * Recentre la carte sur le livreur et son trajet vers Almadies.
   */
  recentrerPosition(): void {
    if (this.carteLeaflet) {
      this.carteLeaflet.setView(this.serviceCarteDakar.livreurVersAlmadies, 14, { animate: true });
    }
  }

  /**
   * Arrivé chez le client : bascule vers la saisie du code de sécurité (Image 3).
   */
  arriverChezClient(): void {
    this.serviceLivreur.avancerEtapeCourse('VALIDATION_CODE');
    this.routeur.navigate(['/livreur/validation-code']);
  }

  /**
   * Retourne à la vérification de la commande.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur/verification']);
  }
}

