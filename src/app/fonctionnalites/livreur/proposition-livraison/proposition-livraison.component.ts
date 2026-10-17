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

  /** Aperçu : position réelle du restaurant uniquement (la position du client reste privée). */
  private initialiserCarte(): void {
    const conteneur = document.getElementById('carte-apercu-proposition');
    const lat = this.proposition.restaurantLatitude;
    const lng = this.proposition.restaurantLongitude;
    if (!conteneur || lat == null || lng == null) return;

    const restaurant: [number, number] = [lat, lng];
    this.carteLeaflet = L.map('carte-apercu-proposition', {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false
    }).setView(restaurant, 14);
    this.serviceCarteDakar.creerCoucheTuilesSombre().addTo(this.carteLeaflet);
    L.circleMarker(restaurant, {
      radius: 7,
      fillColor: '#f97316',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(this.carteLeaflet);
  }
}
