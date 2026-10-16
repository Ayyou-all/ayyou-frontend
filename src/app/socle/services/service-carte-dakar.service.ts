/**
 * Service fournissant les coordonnées GPS réelles et les utilitaires Leaflet pour Dakar.
 * Gère les positions réelles de Dakar : Plateau, Médina, Corniche Ouest, VDN et Almadies.
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
  // Coordonnées réelles de référence à Dakar
  readonly restaurantTeranga: [number, number] = [14.6710, -17.4320]; // Plateau, Dakar
  readonly clientMedina: [number, number] = [14.6855, -17.4490];      // Rue 22 x Blaise Diagne, Médina
  readonly clientAlmadies: [number, number] = [14.7435, -17.5180];    // Almadies, Villa 45
  readonly livreurVersRestaurant: [number, number] = [14.6780, -17.4420]; // En route vers le Plateau
  readonly livreurVersAlmadies: [number, number] = [14.7150, -17.4780];   // Sur la Corniche Ouest / VDN

  // Trajet routier réel Dakar Plateau -> Médina
  readonly trajetPlateauMedina: [number, number][] = [
    [14.6710, -17.4320], // Plateau - Restaurant
    [14.6738, -17.4365], // Place de l'Indépendance
    [14.6772, -17.4412], // Avenue Lamine Gueye
    [14.6805, -17.4448], // Rond-point Poste Médina
    [14.6830, -17.4468], // Avenue Blaise Diagne
    [14.6855, -17.4490]  // Rue 22 - Client Médina
  ];

  // Trajet routier réel Dakar Plateau -> Almadies (Corniche Ouest & VDN)
  readonly trajetPlateauAlmadies: [number, number][] = [
    [14.6710, -17.4320], // Plateau
    [14.6780, -17.4420], // Boulevard de la République
    [14.6880, -17.4600], // Corniche Ouest
    [14.6980, -17.4670], // Place du Souvenir Africain
    [14.7150, -17.4780], // Mermoz / VDN
    [14.7260, -17.4880], // Monument de la Renaissance / Ouakam
    [14.7360, -17.5020], // Ngor
    [14.7435, -17.5180]  // Route des Almadies - Villa 45
  ];

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
        <div class="relative flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#E51824] text-white font-black text-xs shadow-2xl border-2 border-white select-none whitespace-nowrap -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110">
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
          <div class="w-10 h-10 rounded-2xl bg-[#E51824] text-white flex items-center justify-center shadow-xl border-2 border-white">
            <i class="fa-solid fa-utensils text-sm"></i>
          </div>
          <div class="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-black mt-1 shadow truncate max-w-[100px]">
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
          <div class="w-10 h-10 rounded-full bg-[#1e293b] text-white flex items-center justify-center shadow-xl border-2 border-white">
            <i class="fa-solid fa-house text-xs"></i>
          </div>
          <div class="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-black mt-1 shadow truncate max-w-[100px]">
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
          <div class="w-12 h-16 bg-[#E51824] rounded-t-full rounded-b-none relative flex items-center justify-center shadow-2xl [clip-path:polygon(0%_0%,100%_0%,100%_70%,50%_100%,0%_70%)] border border-red-700">
            <div class="w-5 h-5 rounded-full bg-white -mt-2 shadow-inner"></div>
          </div>
          <div class="w-8 h-2 rounded-full bg-black/30 blur-2xs mt-0.5"></div>
        </div>
      `,
      iconSize: [48, 64],
      iconAnchor: [24, 60]
    });
  }

  /**
   * Calcule l'itinéraire routier réel via le moteur de routage public OSRM.
   * Retourne la liste des coordonnées GPS pour tracer une polyligne routière précise.
   */
  async obtenirItineraireRoutier(
    depart: [number, number],
    arrivee: [number, number]
  ): Promise<[number, number][]> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${depart[1]},${depart[0]};${arrivee[1]},${arrivee[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
          return data.routes[0].geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]]);
        }
      }
    } catch {
      // Repli direct
    }
    return [depart, arrivee];
  }
}
