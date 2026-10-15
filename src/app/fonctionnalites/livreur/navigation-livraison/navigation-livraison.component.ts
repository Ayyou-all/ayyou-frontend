import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, inject, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { ServiceCarteDakarService } from '../../../socle/services/service-carte-dakar.service';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-navigation-livraison',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation-livraison.component.html'
})
export class NavigationLivraisonComponent implements AfterViewInit, OnDestroy {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly serviceCarteDakar = inject(ServiceCarteDakarService);
  readonly routeur = inject(Router);

  private carteLeaflet?: L.Map;
  private marqueurLivreur?: L.Marker;

  // Libellé du bouton d'action principal selon l'étape de livraison
  readonly libelleActionBouton = computed(() => {
    switch (this.serviceLivreur.etapeCourse()) {
      case 'VERS_RESTAURANT':
        return 'Arrivé au restaurant';
      case 'ARRIVE_RESTAURANT':
        return 'Commande récupérée';
      case 'VERS_CLIENT':
        return 'Arrivé chez le client';
      case 'ARRIVE_CLIENT':
        return 'Valider la livraison';
      default:
        return 'Arrivé au restaurant';
    }
  });

  // Icône du bouton d'action selon l'étape
  readonly iconeActionBouton = computed(() => {
    switch (this.serviceLivreur.etapeCourse()) {
      case 'VERS_RESTAURANT':
        return 'fa-solid fa-location-dot';
      case 'ARRIVE_RESTAURANT':
        return 'fa-solid fa-box';
      case 'VERS_CLIENT':
        return 'fa-solid fa-flag-checkered';
      case 'ARRIVE_CLIENT':
        return 'fa-solid fa-circle-check';
      default:
        return 'fa-solid fa-location-dot';
    }
  });

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
   * Initialise la carte réelle de Dakar centrée sur l'itinéraire du livreur vers le restaurant.
   */
  private initialiserCarte(): void {
    const conteneur = document.getElementById('carte-navigation-livreur');
    if (!conteneur) return;

    // Coordonnées réelles à Dakar
    const course = this.serviceLivreur.courseEnCours();
    const coordRestaurant: [number, number] = (course?.restaurantLatitude && course?.restaurantLongitude)
      ? [course.restaurantLatitude, course.restaurantLongitude]
      : this.serviceCarteDakar.restaurantTeranga;
    const coordLivreur = this.serviceCarteDakar.livreurVersRestaurant;
    const miTrajet: [number, number] = [
      (coordLivreur[0] + coordRestaurant[0]) / 2,
      (coordLivreur[1] + coordRestaurant[1]) / 2
    ];
    const trajet: [number, number][] = [coordLivreur, miTrajet, coordRestaurant];

    this.carteLeaflet = L.map('carte-navigation-livreur', {
      zoomControl: false,
      attributionControl: false
    }).setView(coordLivreur, 14);

    // Couche de tuiles réelles de Dakar
    this.serviceCarteDakar.creerCoucheTuilesVoyager().addTo(this.carteLeaflet);

    // Tracé de navigation GPS bleu vif (conforme maquette)
    L.polyline(trajet, {
      color: '#00a3ff',
      weight: 7,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.95
    }).addTo(this.carteLeaflet);

    // Grand Pin rouge de destination sur le restaurant partenaire
    L.marker(coordRestaurant, {
      icon: this.serviceCarteDakar.creerGrandPinDestination()
    }).addTo(this.carteLeaflet);

    // Marqueur live du livreur (Moto)
    this.marqueurLivreur = L.marker(coordLivreur, {
      icon: this.serviceCarteDakar.creerIconeMotoLivreur('Vous')
    }).addTo(this.carteLeaflet);

    if (this.carteLeaflet) {
      this.carteLeaflet.fitBounds([coordLivreur, coordRestaurant], { padding: [50, 50], maxZoom: 16 });
    }
  }

  /**
   * Zoom avant sur la carte.
   */
  zoomer(): void {
    this.carteLeaflet?.zoomIn();
  }

  /**
   * Zoom arrière sur la carte.
   */
  dezoomer(): void {
    this.carteLeaflet?.zoomOut();
  }

  /**
   * Recentre la carte sur la position actuelle du livreur.
   */
  recentrerPosition(): void {
    if (this.carteLeaflet) {
      this.carteLeaflet.setView(this.serviceCarteDakar.livreurVersRestaurant, 16, { animate: true });
    }
  }

  /**
   * Arrivé au restaurant : bascule vers la vérification des articles (Image 1).
   */
  effectuerActionEtape(): void {
    this.serviceLivreur.avancerEtapeCourse('ARRIVE_RESTAURANT');
    this.routeur.navigate(['/livreur/verification']);
  }

  /**
   * Retourne à l'accueil livreur.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur']);
  }
}

