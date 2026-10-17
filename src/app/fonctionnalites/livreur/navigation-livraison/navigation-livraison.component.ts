import { CommonModule } from '@angular/common';
import { MenuLivreurComponent } from '../../../partages/composants/menu-livreur/menu-livreur.component';
import { AfterViewInit, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { ServiceCarteDakarService } from '../../../socle/services/service-carte-dakar.service';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { SignalerProblemeComponent } from '../signaler-probleme/signaler-probleme.component';

@Component({
  selector: 'app-navigation-livraison',
  standalone: true,
  imports: [MenuLivreurComponent, CommonModule, RouterModule, SignalerProblemeComponent],
  templateUrl: './navigation-livraison.component.html'
})
export class NavigationLivraisonComponent implements AfterViewInit, OnDestroy {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly serviceCarteDakar = inject(ServiceCarteDakarService);
  readonly routeur = inject(Router);

  private carteLeaflet?: L.Map;
  private marqueurLivreur?: L.Marker;
  readonly distanceVersRestaurantKm = signal<number | null>(null);
  readonly dureeVersRestaurantMinutes = signal<number | null>(null);

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

  constructor() {
    // Le marqueur du livreur suit sa position GPS réelle (envoyée aussi au serveur).
    effect(() => {
      const position = this.serviceLivreur.positionGpsActuelle();
      if (position && this.carteLeaflet) this.placerMarqueurLivreur([position.latitude, position.longitude]);
    });
  }

  /**
   * Carte de navigation vers le restaurant : position réelle du restaurant (API)
   * et position GPS réelle du livreur. Aucune coordonnée n'est inventée.
   */
  private initialiserCarte(): void {
    if (!document.getElementById('carte-navigation-livreur')) return;
    const course = this.serviceLivreur.courseEnCours();
    const restaurant: [number, number] | null =
      course?.restaurantLatitude != null && course?.restaurantLongitude != null
        ? [course.restaurantLatitude, course.restaurantLongitude]
        : null;
    const gps = this.serviceLivreur.positionGpsActuelle();
    const livreur: [number, number] | null = gps ? [gps.latitude, gps.longitude] : null;

    this.carteLeaflet = L.map('carte-navigation-livreur', { zoomControl: false, attributionControl: false })
      .setView(restaurant ?? livreur ?? this.serviceCarteDakar.centreDakar, 14);
    this.serviceCarteDakar.creerCoucheTuilesVoyager().addTo(this.carteLeaflet);

    if (restaurant) {
      L.marker(restaurant, { icon: this.serviceCarteDakar.creerGrandPinDestination() }).addTo(this.carteLeaflet);
    }
    if (livreur) {
      this.placerMarqueurLivreur(livreur);
    }
    if (restaurant && livreur) {
      this.carteLeaflet.fitBounds([livreur, restaurant], { padding: [50, 50], maxZoom: 16 });
      this.serviceCarteDakar.obtenirItineraireDetaille(livreur, restaurant).then((itineraire) => {
        if (!this.carteLeaflet) return;
        L.polyline(itineraire.points, { color: '#00a3ff', weight: 7, lineCap: 'round', lineJoin: 'round', opacity: 0.95 }).addTo(this.carteLeaflet);
        // Distance et durée affichées seulement si l'itinéraire routier a réellement été calculé
        if (itineraire.succesRoutage) {
          this.distanceVersRestaurantKm.set(itineraire.distanceKm);
          this.dureeVersRestaurantMinutes.set(itineraire.dureeMinutes);
        }
      });
    }
  }

  private placerMarqueurLivreur(position: [number, number]): void {
    if (!this.carteLeaflet) return;
    if (this.marqueurLivreur) {
      this.marqueurLivreur.setLatLng(position);
    } else {
      this.marqueurLivreur = L.marker(position, { icon: this.serviceCarteDakar.creerIconeMotoLivreur('Vous') }).addTo(this.carteLeaflet);
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
    const gps = this.serviceLivreur.positionGpsActuelle();
    if (this.carteLeaflet && gps) {
      this.carteLeaflet.setView([gps.latitude, gps.longitude], 16, { animate: true });
    }
  }

  /**
   * Arrivé au restaurant : bascule vers la vérification des articles (Image 1).
   */
  effectuerActionEtape(): void {
    this.serviceLivreur.avancerEtapeCourse('ARRIVE_RESTAURANT');
    this.routeur.navigate(['/livreur/verification']);
  }

  /** Après une annulation acceptée par le serveur. */
  retourAccueil(): void {
    this.routeur.navigate(['/livreur']);
  }

  /**
   * Retourne à l'accueil livreur.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur']);
  }
}

