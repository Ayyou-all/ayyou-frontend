import { CommonModule } from '@angular/common';
import { MenuLivreurComponent } from '../../../partages/composants/menu-livreur/menu-livreur.component';
import { AfterViewInit, Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { ServiceCarteDakarService } from '../../../socle/services/service-carte-dakar.service';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { SignalerProblemeComponent } from '../signaler-probleme/signaler-probleme.component';

@Component({
  selector: 'app-trajet-client',
  standalone: true,
  imports: [MenuLivreurComponent, CommonModule, RouterModule, SignalerProblemeComponent],
  templateUrl: './trajet-client.component.html'
})
export class TrajetClientComponent implements AfterViewInit, OnDestroy {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly serviceCarteDakar = inject(ServiceCarteDakarService);
  readonly routeur = inject(Router);

  private carteLeaflet?: L.Map;
  private marqueurLivreur?: L.Marker;
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

  constructor() {
    // Le marqueur du livreur suit sa position GPS réelle.
    effect(() => {
      const position = this.serviceLivreur.positionGpsActuelle();
      if (position && this.carteLeaflet) this.placerMarqueurLivreur([position.latitude, position.longitude]);
    });
  }

  /**
   * Carte du trajet vers le client : adresse de livraison choisie par le client (API)
   * et position GPS réelle du livreur. Aucune coordonnée n'est inventée.
   */
  private initialiserCarte(): void {
    if (!document.getElementById('carte-trajet-client')) return;
    const course = this.serviceLivreur.courseEnCours();
    const client: [number, number] | null =
      course?.clientLatitude != null && course?.clientLongitude != null ? [course.clientLatitude, course.clientLongitude] : null;
    const gps = this.serviceLivreur.positionGpsActuelle();
    const livreur: [number, number] | null = gps ? [gps.latitude, gps.longitude] : null;

    this.carteLeaflet = L.map('carte-trajet-client', { zoomControl: false, attributionControl: false })
      .setView(client ?? livreur ?? this.serviceCarteDakar.centreDakar, 14);
    this.coucheActuelle = this.serviceCarteDakar.creerCoucheTuilesVoyager();
    this.coucheActuelle.addTo(this.carteLeaflet);

    if (client) {
      L.marker(client, { icon: this.serviceCarteDakar.creerIconeClient(course?.clientNom || 'Client') }).addTo(this.carteLeaflet);
    }
    if (livreur) {
      this.placerMarqueurLivreur(livreur);
    }
    if (client && livreur) {
      this.carteLeaflet.fitBounds([livreur, client], { padding: [50, 50], maxZoom: 16 });
      this.serviceCarteDakar.obtenirItineraireRoutier(livreur, client).then((points) => {
        if (this.carteLeaflet) {
          L.polyline(points, { color: '#0284c7', weight: 7, lineCap: 'round', lineJoin: 'round', opacity: 0.95 }).addTo(this.carteLeaflet);
        }
      });
    }
  }

  private placerMarqueurLivreur(position: [number, number]): void {
    if (!this.carteLeaflet) return;
    if (this.marqueurLivreur) {
      this.marqueurLivreur.setLatLng(position);
    } else {
      const nom = this.serviceLivreur.profilLivreur().prenom || 'Vous';
      this.marqueurLivreur = L.marker(position, { icon: this.serviceCarteDakar.creerIconeMotoLivreur(nom) }).addTo(this.carteLeaflet);
    }
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
    const gps = this.serviceLivreur.positionGpsActuelle();
    if (this.carteLeaflet && gps) {
      this.carteLeaflet.setView([gps.latitude, gps.longitude], 15, { animate: true });
    }
  }

  readonly arriveeEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);

  /** Arrivé chez le client : l'écran du PIN s'ouvre seulement si le serveur a enregistré l'arrivée. */
  arriverChezClient(): void {
    this.arriveeEnCours.set(true);
    this.messageErreur.set(null);
    this.serviceLivreur.signalerArriveeClient().subscribe({
      next: () => {
        this.arriveeEnCours.set(false);
        this.routeur.navigate(['/livreur/validation-code']);
      },
      error: (erreur) => {
        this.arriveeEnCours.set(false);
        this.messageErreur.set(erreur?.error?.message || 'Impossible de signaler votre arrivée. Vérifiez votre connexion.');
      }
    });
  }

  retourAccueil(): void {
    this.routeur.navigate(['/livreur']);
  }

  /**
   * Retourne à la vérification de la commande.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur/verification']);
  }
}

