/**
 * Service fournissant les coordonnées GPS réelles et les utilitaires Leaflet pour Dakar.
 * Les positions affichées viennent toujours de l'API (restaurant, client, livreur).
 */

import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface PositionGpsDakar {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceCarteDakarService {
  // Centre de Dakar : sert UNIQUEMENT à centrer une carte avant de connaître une vraie position.
  // Ce n'est jamais une position de restaurant, de client ou de livreur.
  readonly centreDakar: [number, number] = [14.7167, -17.4677];

  /**
   * Crée la couche de tuiles OpenStreetMap officielle (100% gratuite, sans clé API).
   */
  creerCoucheTuilesVoyager(): L.TileLayer {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
  }

  /**
   * Crée la couche de tuiles OpenStreetMap France (optimisée en français, sans clé API).
   */
  creerCoucheTuilesPositron(): L.TileLayer {
    return L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      maxZoom: 20,
      subdomains: 'abc',
      attribution: '&copy; OpenStreetMap France'
    });
  }

  /**
   * Crée la couche de tuiles sombre (OpenStreetMap avec filtre sombre CSS sans clé API).
   */
  creerCoucheTuilesSombre(): L.TileLayer {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'tuile-carte-sombre',
      attribution: '&copy; OpenStreetMap'
    });
  }

  /**
   * Icône personnalisée de la moto du livreur en direct.
   */
  creerIconeMotoLivreur(nom: string = 'Moussa'): L.DivIcon {
    return L.divIcon({
      className: 'marqueur-leaflet-sans-style',
      html: `
        <div class="relative flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#E51824] text-white font-black text-xs border-2 border-white select-none whitespace-nowrap -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110">
          <div class="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
            <i class="fa-solid fa-motorcycle text-[10px]"></i>
          </div>
          <span class="tracking-wide">${nom}</span>
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </div>
      `,
      iconSize: [90, 36],
      iconAnchor: [45, 18]
    });
  }

  /**
   * Icône personnalisée du restaurant avec logo ustensiles.
   */
  creerIconeRestaurant(nom: string = 'Le Teranga'): L.DivIcon {
    return L.divIcon({
      className: 'marqueur-leaflet-sans-style',
      html: `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full">
          <div class="w-10 h-10 rounded-2xl bg-[#E51824] text-white flex items-center justify-center border-2 border-white">
            <i class="fa-solid fa-utensils text-sm"></i>
          </div>
          <div class="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-black mt-1 truncate max-w-[100px]">
            ${nom}
          </div>
        </div>
      `,
      iconSize: [40, 60],
      iconAnchor: [20, 50]
    });
  }

  /**
   * Icône personnalisée du client destination (Maison ou point de livraison).
   */
  creerIconeClient(libelle: string = 'Vous'): L.DivIcon {
    return L.divIcon({
      className: 'marqueur-leaflet-sans-style',
      html: `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full">
          <div class="w-10 h-10 rounded-full bg-[#1e293b] text-white flex items-center justify-center border-2 border-white">
            <i class="fa-solid fa-house text-xs"></i>
          </div>
          <div class="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-black mt-1 truncate max-w-[100px]">
            ${libelle}
          </div>
        </div>
      `,
      iconSize: [40, 60],
      iconAnchor: [20, 50]
    });
  }

  /**
   * Grand marqueur goutte rouge de destination GPS (conforme Image 3).
   */
  creerGrandPinDestination(): L.DivIcon {
    return L.divIcon({
      className: 'marqueur-leaflet-sans-style',
      html: `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full">
          <div class="w-12 h-16 bg-[#E51824] rounded-t-full rounded-b-none relative flex items-center justify-center [clip-path:polygon(0%_0%,100%_0%,100%_70%,50%_100%,0%_70%)] border border-red-700">
            <div class="w-5 h-5 rounded-full bg-white -mt-2"></div>
          </div>
          <div class="w-8 h-2 rounded-full bg-black/30 blur-2xs mt-0.5"></div>
        </div>
      `,
      iconSize: [48, 64],
      iconAnchor: [24, 60]
    });
  }

  /**
   * Calcule la distance orthodromique (Haversine) à vol d'oiseau entre deux points en kilomètres.
   */
  calculerDistanceVolOiseauKm(depart: [number, number], arrivee: [number, number]): number {
    const R = 6371; // Rayon Terre en km
    const dLat = (arrivee[0] - depart[0]) * (Math.PI / 180);
    const dLon = (arrivee[1] - depart[1]) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(depart[0] * (Math.PI / 180)) *
        Math.cos(arrivee[0] * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  /**
   * Calcule l'itinéraire routier réel via le moteur de routage OSRM.
   * Retourne les points GPS, la distance en km, la durée estimée et le statut de routage.
   */
  async obtenirItineraireDetaille(
    depart: [number, number],
    arrivee: [number, number]
  ): Promise<{ points: [number, number][]; distanceKm: number; dureeMinutes: number; succesRoutage: boolean }> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${depart[1]},${depart[0]};${arrivee[1]},${arrivee[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
          const points = data.routes[0].geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]] as [number, number]);
          const distanceKm = Number((data.routes[0].distance / 1000).toFixed(1));
          const dureeMinutes = Math.max(1, Math.round(data.routes[0].duration / 60));
          return {
            points,
            distanceKm,
            dureeMinutes,
            succesRoutage: true
          };
        }
      }
    } catch {
      // Échec de connexion réseau ou OSRM temporairement inaccessible
    }

    // Repli de sécurité avec distance orthodromique et vitesse moyenne Dakar (25 km/h)
    const distanceKm = this.calculerDistanceVolOiseauKm(depart, arrivee);
    const dureeMinutes = Math.max(1, Math.round((distanceKm / 25) * 60));
    return {
      points: [depart, arrivee],
      distanceKm,
      dureeMinutes,
      succesRoutage: false
    };
  }

  /**
   * Calcule l'itinéraire routier réel via le moteur de routage public OSRM.
   * Retourne la liste des coordonnées GPS pour tracer une polyligne routière précise.
   */
  async obtenirItineraireRoutier(
    depart: [number, number],
    arrivee: [number, number]
  ): Promise<[number, number][]> {
    const res = await this.obtenirItineraireDetaille(depart, arrivee);
    return res.points;
  }
}
