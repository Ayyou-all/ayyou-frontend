import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

export type FiltrePeriodeRevenu = '24h' | '7j' | '30j';

export interface CommandeRecenteAnalytique {
  id: string;
  plat: string;
  client: string;
  statut: 'Préparation' | 'En attente' | 'Livré';
  montant: string;
}

@Component({
  selector: 'app-gerant-analytiques',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-analytiques.component.html'
})
export class GerantAnalytiquesComponent {
  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);

  // Informations réelles de l'établissement
  readonly nomRestaurant = signal<string>('Mon Restaurant');
  readonly dateAujourdhuiTexte = signal<string>('');

  // Filtre période de revenus actif (24h, 7 jours, 30 jours)
  readonly periodeActive = signal<FiltrePeriodeRevenu>('7j');

  // Recherche dans l'en-tête
  readonly rechercheTexte = signal<string>('');
  readonly chargementEnCours = signal<boolean>(false);
  readonly commandesRaw = signal<any[]>([]);

  // Statistiques calculées depuis les commandes réelles
  readonly commandesJour = signal<number>(0);
  readonly commandesJourProgression = signal<string>('+0%');

  readonly clientsNombre = signal<number>(0);
  readonly clientsProgression = signal<string>('+0%');

  readonly revenusJour = signal<string>('0 FCFA');
  readonly revenusJourProgression = signal<string>('+0%');

  // Attribution commerciale des vidéos du Studio
  readonly ventesAttribueesVideos = signal<string>('0 FCFA');
  readonly partChiffreAffairesVideos = signal<string>('0% du CA');
  readonly commandesVideos = signal<number>(0);

  // Données de répartition par catégories (calculées depuis les articles réels commandés ou la carte réelle)
  readonly categoriesDonut = signal<{ nom: string; pourcentage: number; couleur: string; valeur: number }[]>([]);

  // Segments calculés pour le Donut SVG
  readonly segmentsDonut = computed(() => {
    const cats = this.categoriesDonut();
    const circonference = 345.575; // 2 * PI * 55
    let offsetCumule = 0;
    return cats.map((cat) => {
      const longueur = (cat.pourcentage / 100) * circonference;
      const segment = {
        ...cat,
        dasharray: `${longueur.toFixed(2)} ${circonference.toFixed(2)}`,
        dashoffset: (-offsetCumule).toFixed(2)
      };
      offsetCumule += longueur;
      return segment;
    });
  });

  // Commandes de la semaine calculées dynamiquement par jour (L, M, M, J, V, S, D)
  readonly barresSemaine = computed(() => {
    const jours = [
      { code: 1, jour: 'L' },
      { code: 2, jour: 'M' },
      { code: 3, jour: 'M' },
      { code: 4, jour: 'J' },
      { code: 5, jour: 'V' },
      { code: 6, jour: 'S' },
      { code: 0, jour: 'D' }
    ];

    const commandes = this.commandesRaw();
    const compteursParJour: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    commandes.forEach((c) => {
      if (c.date_creation) {
        const d = new Date(c.date_creation);
        const dayIdx = d.getDay();
        compteursParJour[dayIdx] = (compteursParJour[dayIdx] || 0) + 1;
      }
    });

    const maxVal = Math.max(...Object.values(compteursParJour), 0);

    return jours.map((j) => {
      const qte = compteursParJour[j.code] || 0;
      const hauteur = maxVal > 0 ? Math.max(10, Math.round((qte / maxVal) * 85)) : 0;
      return {
        jour: j.jour,
        hauteur,
        quantite: qte,
        estMax: qte === maxVal && maxVal > 0
      };
    });
  });

  // Points SVG dynamiques pour la courbe des revenus
  readonly donneesCourbe = computed(() => {
    const commandes = this.commandesRaw();
    const totalGlobal = commandes.reduce((acc, c) => acc + Number(c.total_fcfa || 0), 0);

    // 7 points équidistants pour Lun..Dim
    const xPositions = [90, 220, 350, 480, 610, 740, 870];
    const joursCode = [1, 2, 3, 4, 5, 6, 0];

    const revenusParJour: number[] = joursCode.map((code) => {
      return commandes
        .filter((c) => {
          if (!c.date_creation) return false;
          return new Date(c.date_creation).getDay() === code;
        })
        .reduce((acc, c) => acc + Number(c.total_fcfa || 0), 0);
    });

    const maxRev = Math.max(...revenusParJour, 0);

    const points = xPositions.map((x, idx) => {
      const montant = revenusParJour[idx] || 0;
      // y=220 est la ligne 0 F, y=50 est le max
      const y = maxRev > 0 ? 220 - Math.round((montant / maxRev) * 165) : 220;
      return { x, y, montant, label: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][idx] };
    });

    const cheminLigne = 'M ' + points.map((p) => `${p.x},${p.y}`).join(' L ');
    const cheminAire = cheminLigne + ' L 870,220 L 90,220 Z';

    return {
      points,
      cheminLigne,
      cheminAire,
      maxRev,
      totalGlobal,
      labelMax: maxRev > 0 ? `${maxRev >= 1000 ? Math.round(maxRev / 1000) + 'k' : maxRev} F` : '0 F',
      labelMilieu: maxRev > 0 ? `${Math.round(maxRev / 2000)}k F` : '0 F'
    };
  });

  // Données de la table des commandes réelles
  readonly listeCommandes = signal<CommandeRecenteAnalytique[]>([]);

  constructor() {
    const user = this.serviceAuth.utilisateurConnecte();
    if (user?.nomEtablissement) {
      this.nomRestaurant.set(user.nomEtablissement);
    }
    const d = new Date();
    const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    this.dateAujourdhuiTexte.set(`Aujourd'hui, ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`);

    this.http.get<any>(`${environment.apiUrl}/etablissements/mon-etablissement/`).subscribe({
      next: (etab) => {
        if (etab?.nom) this.nomRestaurant.set(etab.nom);
      },
      error: () => {}
    });

    this.chargerAnalytiques();
  }

  chargerAnalytiques(): void {
    this.chargementEnCours.set(true);

    this.http.get<any>(`${environment.apiUrl}/commandes/restaurant/`).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (data) => {
        this.chargementEnCours.set(false);
        const commandes: any[] = Array.isArray(data) ? data : (data?.results || []);
        this.commandesRaw.set(commandes);

        if (!commandes || commandes.length === 0) {
          this.commandesJour.set(0);
          this.revenusJour.set('0 FCFA');
          this.clientsNombre.set(0);
          this.listeCommandes.set([]);
          this.chargerProportionsMenu();
          return;
        }

        const dateAujourdhui = new Date().toISOString().split('T')[0];
        const cmdsJour = commandes.filter((c) => (c.date_creation || '').startsWith(dateAujourdhui));
        const totalJour = cmdsJour.reduce((acc, c) => acc + Number(c.total_fcfa || 0), 0);
        const totalGlobal = commandes.reduce((acc, c) => acc + Number(c.total_fcfa || 0), 0);

        this.commandesJour.set(cmdsJour.length || commandes.length);
        this.revenusJour.set(`${(totalJour || totalGlobal).toLocaleString('fr-FR')} FCFA`);

        const clientsUniques = new Set(commandes.map((c) => c.client_nom).filter(Boolean));
        this.clientsNombre.set(clientsUniques.size || 1);

        // Ventes attribuées aux vidéos
        const cmdsVideos = commandes.filter((c) => Boolean(c.source_video_id));
        const totalVideos = cmdsVideos.reduce((acc, c) => acc + Number(c.total_fcfa || 0), 0);
        this.commandesVideos.set(cmdsVideos.length);
        this.ventesAttribueesVideos.set(`${totalVideos.toLocaleString('fr-FR')} FCFA`);
        if (totalGlobal > 0 && totalVideos > 0) {
          this.partChiffreAffairesVideos.set(`${Math.round((totalVideos / totalGlobal) * 100)}% du CA`);
        }

        // Calcul des catégories réelles commandées
        this.calculerCategoriesReelles(commandes);

        // Mapping des commandes récentes
        const recentes: CommandeRecenteAnalytique[] = commandes.slice(0, 10).map((c) => {
          let statutAffiche: 'Préparation' | 'En attente' | 'Livré' = 'En attente';
          if (c.statut === 'EN_PREPARATION' || c.statut === 'PRETE_POUR_RETRAIT') {
            statutAffiche = 'Préparation';
          } else if (c.statut === 'LIVREE') {
            statutAffiche = 'Livré';
          }

          const premierPlat = c.articles?.[0]?.nom_plat || 'Commande repas';
          return {
            id: `#${c.reference || c.id}`,
            plat: premierPlat,
            client: c.client_nom || 'Client AYYOU',
            statut: statutAffiche,
            montant: `${Number(c.total_fcfa || 0).toLocaleString('fr-FR')} FCFA`
          };
        });

        this.listeCommandes.set(recentes);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.chargerProportionsMenu();
      }
    });
  }

  /**
   * Calcule la répartition des ventes par catégories depuis les articles réels.
   */
  private calculerCategoriesReelles(commandes: any[]): void {
    const compteurCat: Record<string, number> = {};
    let totalArticles = 0;

    commandes.forEach((c) => {
      (c.articles || []).forEach((art: any) => {
        const cat = art.section_menu || 'Plats';
        const qte = Number(art.quantite || 1);
        compteurCat[cat] = (compteurCat[cat] || 0) + qte;
        totalArticles += qte;
      });
    });

    if (totalArticles === 0) {
      this.chargerProportionsMenu();
      return;
    }

    const couleurs = ['#E51824', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    const resultat = Object.entries(compteurCat).map(([nom, count], idx) => ({
      nom,
      valeur: count,
      pourcentage: Math.round((count / totalArticles) * 100),
      couleur: couleurs[idx % couleurs.length]
    }));

    this.categoriesDonut.set(resultat);
  }

  /**
   * Si aucune commande n'a encore été passée, base la répartition sur la carte réelle du restaurant.
   */
  private chargerProportionsMenu(): void {
    this.http.get<any[]>(`${environment.apiUrl}/catalogue/mes-plats/`).pipe(
      catchError(() => of([]))
    ).subscribe((plats) => {
      if (!plats || plats.length === 0) {
        this.categoriesDonut.set([]);
        return;
      }
      const compteur: Record<string, number> = {};
      plats.forEach((p) => {
        const section = p.section_menu === 'BOISSONS' ? 'Boissons' : p.section_menu === 'DESSERTS' ? 'Desserts' : 'Plats';
        compteur[section] = (compteur[section] || 0) + 1;
      });
      const total = plats.length;
      const couleursMap: Record<string, string> = {
        'Plats': '#E51824',
        'Boissons': '#3B82F6',
        'Desserts': '#CBD5E1'
      };
      const resultat = Object.entries(compteur).map(([nom, count]) => ({
        nom,
        valeur: count,
        pourcentage: Math.round((count / total) * 100),
        couleur: couleursMap[nom] || '#E51824'
      }));
      this.categoriesDonut.set(resultat);
    });
  }

  readonly commandesFiltrees = computed(() => {
    const q = this.rechercheTexte().trim().toLowerCase();
    if (!q) return this.listeCommandes();
    return this.listeCommandes().filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.plat.toLowerCase().includes(q) ||
        c.client.toLowerCase().includes(q) ||
        c.statut.toLowerCase().includes(q)
    );
  });

  definirPeriode(p: FiltrePeriodeRevenu): void {
    this.periodeActive.set(p);
  }
}
