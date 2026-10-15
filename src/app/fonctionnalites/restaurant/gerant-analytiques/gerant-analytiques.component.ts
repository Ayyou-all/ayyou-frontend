import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
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
export class GerantAnalytiquesComponent implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);

  @ViewChild('canvasRevenus') private canvasRevenusRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasCategories') private canvasCategoriesRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasCommandesSemaine') private canvasSemaineRef?: ElementRef<HTMLCanvasElement>;

  private chartRevenus?: Chart;
  private chartCategories?: Chart;
  private chartSemaine?: Chart;

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

  // Données de répartition par catégories
  readonly categoriesDonut = signal<{ nom: string; pourcentage: number; couleur: string; valeur: number }[]>([]);

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

    // Effet réactif pour actualiser les graphiques Chart.js dès que les données arrivent
    effect(() => {
      const cmds = this.commandesRaw();
      const periode = this.periodeActive();
      if (this.chartRevenus) {
        this.actualiserGraphiqueRevenus(cmds, periode);
      }
      if (this.chartSemaine) {
        this.actualiserGraphiqueSemaine(cmds);
      }
    });

    effect(() => {
      const cats = this.categoriesDonut();
      if (this.chartCategories && cats.length > 0) {
        this.actualiserGraphiqueCategories(cats);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initialiserGraphiqueRevenus();
    this.initialiserGraphiqueCategories();
    this.initialiserGraphiqueSemaine();
  }

  ngOnDestroy(): void {
    if (this.chartRevenus) {
      this.chartRevenus.destroy();
      this.chartRevenus = undefined;
    }
    if (this.chartCategories) {
      this.chartCategories.destroy();
      this.chartCategories = undefined;
    }
    if (this.chartSemaine) {
      this.chartSemaine.destroy();
      this.chartSemaine = undefined;
    }
  }

  // =========================================================================
  // 1. GRAPHIQUE REVENUS (LIGNE CONTINUE AVEC DÉGRADÉ SOUPLE)
  // =========================================================================
  private initialiserGraphiqueRevenus(): void {
    if (!this.canvasRevenusRef?.nativeElement) return;
    const ctx = this.canvasRevenusRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(229, 24, 36, 0.22)');
    gradient.addColorStop(0.85, 'rgba(229, 24, 36, 0.02)');
    gradient.addColorStop(1, 'rgba(229, 24, 36, 0.0)');

    const donnees = this.calculerPointsRevenus(this.commandesRaw(), this.periodeActive());

    this.chartRevenus = new Chart(ctx, {
      type: 'line',
      data: {
        labels: donnees.labels,
        datasets: [
          {
            label: 'Revenus',
            data: donnees.valeurs,
            borderColor: '#E51824',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#E51824',
            pointBorderWidth: 2.5,
            pointRadius: 4.5,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#E51824',
            pointHoverBorderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 12,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
            displayColors: false,
            callbacks: {
              label: (ctxItem) => {
                const val = Number(ctxItem.raw || 0);
                return `${val.toLocaleString('fr-FR')} FCFA`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' },
              color: '#94a3b8'
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: 'bold' },
              color: '#94a3b8',
              callback: (value) => {
                const n = Number(value);
                return n >= 1000 ? `${Math.round(n / 1000)}k F` : `${n} F`;
              }
            }
          }
        }
      }
    });
  }

  private actualiserGraphiqueRevenus(commandes: any[], periode: FiltrePeriodeRevenu): void {
    if (!this.chartRevenus) return;
    const donnees = this.calculerPointsRevenus(commandes, periode);
    this.chartRevenus.data.labels = donnees.labels;
    this.chartRevenus.data.datasets[0].data = donnees.valeurs;
    this.chartRevenus.update();
  }

  private calculerPointsRevenus(commandes: any[], periode: FiltrePeriodeRevenu): { labels: string[]; valeurs: number[] } {
    if (periode === '24h') {
      const labels = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-24h'];
      const valeurs = [0, 0, 0, 0, 0, 0];
      const today = new Date().toISOString().split('T')[0];
      commandes
        .filter((c) => (c.date_creation || '').startsWith(today))
        .forEach((c) => {
          const h = new Date(c.date_creation).getHours();
          const idx = Math.min(Math.floor(h / 4), 5);
          valeurs[idx] += Number(c.total_fcfa || 0);
        });
      return { labels, valeurs };
    }

    if (periode === '30j') {
      const labels = ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'];
      const valeurs = [0, 0, 0, 0];
      commandes.forEach((c) => {
        const d = new Date(c.date_creation || Date.now());
        const jourDuMois = d.getDate();
        const idx = Math.min(Math.floor((jourDuMois - 1) / 7), 3);
        valeurs[idx] += Number(c.total_fcfa || 0);
      });
      return { labels, valeurs };
    }

    // Par défaut '7j' (Lun..Dim)
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const joursCode = [1, 2, 3, 4, 5, 6, 0];
    const valeurs = joursCode.map((code) => {
      return commandes
        .filter((c) => c.date_creation && new Date(c.date_creation).getDay() === code)
        .reduce((acc, c) => acc + Number(c.total_fcfa || 0), 0);
    });

    return { labels, valeurs };
  }

  // =========================================================================
  // 2. GRAPHIQUE CATÉGORIES (DONUT / DOUGHNUT)
  // =========================================================================
  private initialiserGraphiqueCategories(): void {
    if (!this.canvasCategoriesRef?.nativeElement) return;
    const ctx = this.canvasCategoriesRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const cats = this.categoriesDonut();
    const labels = cats.map((c) => c.nom);
    const data = cats.map((c) => c.pourcentage || 1);
    const bgColors = cats.map((c) => c.couleur || '#E51824');

    this.chartCategories = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: bgColors,
            borderWidth: 0,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 10,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 'bold' },
            callbacks: {
              label: (context) => ` ${context.label} : ${context.raw}%`
            }
          }
        }
      }
    });
  }

  private actualiserGraphiqueCategories(cats: { nom: string; pourcentage: number; couleur: string }[]): void {
    if (!this.chartCategories) return;
    this.chartCategories.data.labels = cats.map((c) => c.nom);
    this.chartCategories.data.datasets[0].data = cats.map((c) => c.pourcentage);
    this.chartCategories.data.datasets[0].backgroundColor = cats.map((c) => c.couleur);
    this.chartCategories.update();
  }

  // =========================================================================
  // 3. GRAPHIQUE COMMANDES SEMAINE (BAR CHART)
  // =========================================================================
  private initialiserGraphiqueSemaine(): void {
    if (!this.canvasSemaineRef?.nativeElement) return;
    const ctx = this.canvasSemaineRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const barres = this.calculerBarresSemaine(this.commandesRaw());
    const labels = barres.map((b) => b.jour);
    const data = barres.map((b) => b.quantite);
    const maxVal = Math.max(...data, 0);
    const bgColors = data.map((v) => (v === maxVal && maxVal > 0 ? '#E51824' : '#F1F5F9'));

    this.chartSemaine = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Commandes',
            data,
            backgroundColor: bgColors,
            hoverBackgroundColor: '#E51824',
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 38
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 10,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 'bold' },
            displayColors: false,
            callbacks: {
              label: (context) => `${context.raw} commande(s)`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' },
              color: '#94a3b8'
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              stepSize: 1,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: 'bold' },
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }

  private actualiserGraphiqueSemaine(commandes: any[]): void {
    if (!this.chartSemaine) return;
    const barres = this.calculerBarresSemaine(commandes);
    const data = barres.map((b) => b.quantite);
    const maxVal = Math.max(...data, 0);
    this.chartSemaine.data.labels = barres.map((b) => b.jour);
    this.chartSemaine.data.datasets[0].data = data;
    this.chartSemaine.data.datasets[0].backgroundColor = data.map((v) => (v === maxVal && maxVal > 0 ? '#E51824' : '#F1F5F9'));
    this.chartSemaine.update();
  }

  private calculerBarresSemaine(commandes: any[]): { jour: string; quantite: number }[] {
    const jours = [
      { code: 1, jour: 'Lun' },
      { code: 2, jour: 'Mar' },
      { code: 3, jour: 'Mer' },
      { code: 4, jour: 'Jeu' },
      { code: 5, jour: 'Ven' },
      { code: 6, jour: 'Sam' },
      { code: 0, jour: 'Dim' }
    ];

    const compteurs: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    commandes.forEach((c) => {
      if (c.date_creation) {
        const idx = new Date(c.date_creation).getDay();
        compteurs[idx] = (compteurs[idx] || 0) + 1;
      }
    });

    return jours.map((j) => ({
      jour: j.jour,
      quantite: compteurs[j.code] || 0
    }));
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

        const cmdsVideos = commandes.filter((c) => Boolean(c.source_video_id));
        const totalVideos = cmdsVideos.reduce((acc, c) => acc + Number(c.total_fcfa || 0), 0);
        this.commandesVideos.set(cmdsVideos.length);
        this.ventesAttribueesVideos.set(`${totalVideos.toLocaleString('fr-FR')} FCFA`);
        if (totalGlobal > 0 && totalVideos > 0) {
          this.partChiffreAffairesVideos.set(`${Math.round((totalVideos / totalGlobal) * 100)}% du CA`);
        }

        this.calculerCategoriesReelles(commandes);

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
