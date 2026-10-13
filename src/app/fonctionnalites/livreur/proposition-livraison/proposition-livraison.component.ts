import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, inject, Input, OnDestroy, Output } from '@angular/core';
import * as L from 'leaflet';
import { PropositionLivraison } from '../../../socle/modeles/livreur.modele';
import { ServiceCarteDakarService } from '../../../socle/services/service-carte-dakar.service';

@Component({
  selector: 'app-proposition-livraison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proposition-livraison.component.html'
})
export class PropositionLivraisonComponent implements AfterViewInit, OnDestroy {
  readonly serviceCarteDakar = inject(ServiceCarteDakarService);

  @Input() proposition!: PropositionLivraison;
  @Input() secondesRestantes: number = 22;

  @Output() accepter = new EventEmitter<void>();
  @Output() refuser = new EventEmitter<void>();

  private carteLeaflet?: L.Map;

  // Calcul du pourcentage pour le cercle SVG de décompte (sur 30 secondes)
  get pourcentageCercle(): number {
    return (this.secondesRestantes / 30) * 100;
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      this.initialiserCarte();
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.carteLeaflet) {
      this.carteLeaflet.remove();
    }
  }

  private initialiserCarte(): void {
    const conteneur = document.getElementById('carte-apercu-proposition');
    if (!conteneur) return;

    const depart = this.serviceCarteDakar.restaurantTeranga; // Plateau
    const arrivee = this.serviceCarteDakar.clientMedina;     // Médina
    const trajet = this.serviceCarteDakar.trajetPlateauMedina;

    this.carteLeaflet = L.map('carte-apercu-proposition', {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false
    }).setView([14.6780, -17.4410], 13);

    // Couche sombre CartoDB Dark Matter
    this.serviceCarteDakar.creerCoucheTuilesSombre().addTo(this.carteLeaflet);

    // Tracé orange vif reliant le restaurant au client
    L.polyline(trajet, {
      color: '#ea580c',
      weight: 4,
      opacity: 0.95
    }).addTo(this.carteLeaflet);

    // Marqueur départ restaurant (rond orange)
    L.circleMarker(depart, {
      radius: 6,
      fillColor: '#f97316',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(this.carteLeaflet);

    // Marqueur arrivée client (rond blanc)
    L.circleMarker(arrivee, {
      radius: 6,
      fillColor: '#94a3b8',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(this.carteLeaflet);
  }
}

