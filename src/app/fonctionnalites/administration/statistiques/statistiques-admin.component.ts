import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { environment } from '../../../../environments/environment';

export interface PointEvolutionRevenu {
  date: string;
  valeurMilliers: number;
  label: string;
  xPourcentage: number;
  yPourcentage: number;
}

export interface RestaurantPerformanceTop {
  nom: string;
  commandes: number;
  pourcentageBarre: number;
}

export interface CategorieStatistique {
  nom: string;
  total: number;
  pourcentage: number;
  dasharray?: string;
  dashoffset?: string;
  couleur: string;
}

@Component({
  selector: 'app-statistiques-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistiques-admin.component.html'
})
export class StatistiquesAdminComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('canvasEvolution') private canvasEvolutionRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasCategoriesDonut') private canvasDonutRef?: ElementRef<HTMLCanvasElement>;

  private chartEvolution?: Chart;
  private chartDonut?: Chart;

  // Sélecteur de période globale
  readonly periodeSelectionnee = signal<string>('30 derniers jours');

  // Fréquence graphique (Hebdomadaire vs Mensuel)
  readonly frequenceGraphique = signal<'HEBDOMADAIRE' | 'MENSUEL'>('HEBDOMADAIRE');
  readonly derniereMiseAJour = signal<string>('En direct');

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);
  readonly chargementEnCours = signal<boolean>(false);

  // 4 Cartes KPI dynamiques
  readonly kpis = signal({
    revenuTotal: { valeur: '0 FCFA', evolution: '' },
    commandesTotales: { valeur: '0', evolution: '' },
    utilisateursActifs: { valeur: '0', evolution: '' },
    tauxCroissance: { valeur: '—', evolution: '' }
  });

  // Points de la courbe d'évolution des commandes/revenus
  readonly pointsCourbeRevenus = signal<PointEvolutionRevenu[]>([]);

  // Performance des Meilleurs Restaurants (Top 5 bar chart)
  readonly topRestaurants = signal<RestaurantPerformanceTop[]>([]);

  // Répartition réelle par catégorie (Donut chart)
  readonly categories = signal<CategorieStatistique[]>([
    { nom: 'Plats locaux', total: 0, pourcentage: 100, couleur: '#E51824' }
  ]);

  constructor() {
    // Mise à jour réactive des graphiques Chart.js lors de l'arrivée des données
    effect(() => {
      const pts = this.pointsCourbeRevenus();
      if (this.chartEvolution && pts.length > 0) {
        this.actualiserGraphiqueEvolution(pts);
      }
    });

    effect(() => {
      const cats = this.categories();
      if (this.chartDonut && cats.length > 0) {
        this.actualiserGraphiqueDonut(cats);
      }
    });
  }

  ngOnInit(): void {
    this.chargerStatistiques();

    // Actualisation temps réel toutes les 15 secondes
    const intervalle = setInterval(() => {
      this.chargerStatistiques(true);
    }, 15000);

    this.destroyRef.onDestroy(() => {
      clearInterval(intervalle);
    });
  }

  ngAfterViewInit(): void {
    this.initialiserGraphiqueEvolution();
    this.initialiserGraphiqueDonut();
  }

  ngOnDestroy(): void {
    if (this.chartEvolution) {
      this.chartEvolution.destroy();
      this.chartEvolution = undefined;
    }
    if (this.chartDonut) {
      this.chartDonut.destroy();
      this.chartDonut = undefined;
    }
  }

  private initialiserGraphiqueEvolution(): void {
    if (!this.canvasEvolutionRef?.nativeElement) return;
    const ctx = this.canvasEvolutionRef.nativeElement.getContext('2d');
    if (!ctx) return;


    const pts = this.pointsCourbeRevenus();
    const labels = pts.length > 0 ? pts.map((p) => p.date) : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const data = pts.length > 0 ? pts.map((p) => p.valeurMilliers / 100) : [0, 0, 0, 0, 0, 0, 0];

    this.chartEvolution = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Commandes',
            data,
            borderColor: '#E51824',
            borderWidth: 3,
            backgroundColor: 'rgba(229, 24, 36, 0.08)', // couleur unie (pas de dégradé)
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
            padding: 10,
            cornerRadius: 10,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
            displayColors: false,
            callbacks: {
              label: (context) => {
                const val = Number(context.raw || 0);
                return `${val} commande${val > 1 ? 's' : ''}`;
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
              stepSize: 1,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: 'bold' },
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }

  private actualiserGraphiqueEvolution(pts: PointEvolutionRevenu[]): void {
    if (!this.chartEvolution) return;
    this.chartEvolution.data.labels = pts.map((p) => p.date);
    this.chartEvolution.data.datasets[0].data = pts.map((p) => p.valeurMilliers / 100);
    this.chartEvolution.update();
  }

  private initialiserGraphiqueDonut(): void {
    if (!this.canvasDonutRef?.nativeElement) return;
    const ctx = this.canvasDonutRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const cats = this.categories();
    const labels = cats.map((c) => c.nom);
    const data = cats.map((c) => c.pourcentage || 1);
    const bgColors = cats.map((c) => c.couleur || '#E51824');

    this.chartDonut = new Chart(ctx, {
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

  private actualiserGraphiqueDonut(cats: CategorieStatistique[]): void {
    if (!this.chartDonut) return;
    this.chartDonut.data.labels = cats.map((c) => c.nom);
    this.chartDonut.data.datasets[0].data = cats.map((c) => c.pourcentage);
    this.chartDonut.data.datasets[0].backgroundColor = cats.map((c) => c.couleur || '#E51824');
    this.chartDonut.update();
  }

  chargerStatistiques(silencieux: boolean = false): void {
    if (!silencieux) {
      this.chargementEnCours.set(true);
    }
    this.http.get<any>(`${environment.apiUrl}/administration/statistiques/`).subscribe({
      next: (stats) => {
        const volumeFcfa = stats.volumeAffairesFcfa ?? stats.volume_affaires_fcfa ?? 0;
        const totalCmd = stats.totalCommandes ?? stats.total_commandes ?? 0;
        const totalUsers = stats.totalUtilisateurs ?? stats.totalClients ?? 0;

        const volumeFormate = Number(volumeFcfa).toLocaleString('fr-FR') + ' FCFA';
        const totalCmdFormate = Number(totalCmd).toLocaleString('fr-FR');
        const totalUsersFormate = Number(totalUsers).toLocaleString('fr-FR');

        this.kpis.set({
          revenuTotal: { valeur: volumeFormate, evolution: '' },
          commandesTotales: { valeur: totalCmdFormate, evolution: '' },
          utilisateursActifs: { valeur: totalUsersFormate, evolution: '' },
          // Part des commandes payées qui ont réellement été livrées
          tauxCroissance: {
            valeur: totalCmd > 0 ? `${Math.round(((stats.commandesLivrees ?? 0) / totalCmd) * 100)} %` : '—',
            evolution: ''
          }
        });

        const maintenant = new Date();
        this.derniereMiseAJour.set(
          `Mis à jour à ${maintenant.getHours().toString().padStart(2, '0')}:${maintenant.getMinutes().toString().padStart(2, '0')}:${maintenant.getSeconds().toString().padStart(2, '0')}`
        );

        if (stats.commandesParJour && Array.isArray(stats.commandesParJour)) {
          const points: PointEvolutionRevenu[] = stats.commandesParJour.map((pt: any) => ({
            date: pt.date || 'Jour',
            valeurMilliers: (pt.valeur || pt.total || 0) * 100,
            label: `${pt.valeur || pt.total || 0} commande(s)`,
            xPourcentage: pt.xPourcentage || pt.x || 35,
            yPourcentage: pt.yPourcentage || pt.y || 180
          }));
          this.pointsCourbeRevenus.set(points);
        }

        if (stats.topRestaurants && Array.isArray(stats.topRestaurants)) {
          this.topRestaurants.set(
            stats.topRestaurants.map((r: any) => ({
              nom: r.nom || 'Restaurant',
              commandes: r.commandes || 0,
              pourcentageBarre: Math.max(r.pourcentageBarre || 10, 10)
            }))
          );
        }

        if (stats.commandesParCategorie && Array.isArray(stats.commandesParCategorie) && stats.commandesParCategorie.length > 0) {
          this.categories.set(stats.commandesParCategorie);
        }

        this.chargementEnCours.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement statistiques:', err);
        this.chargementEnCours.set(false);
      }
    });
  }

  exporterRapport(): void {
    const k = this.kpis();
    const contenu = [
      'RAPPORT STATISTIQUE GLOBAL - PLATEFORME AYYOU',
      `Date de génération : ${new Date().toLocaleDateString('fr-FR')}`,
      '--------------------------------------------------',
      `Volume d'affaires total : ${k.revenuTotal.valeur}`,
      `Total des commandes : ${k.commandesTotales.valeur}`,
      `Utilisateurs enregistrés : ${k.utilisateursActifs.valeur}`,
      `Taux de performance : ${k.tauxCroissance.valeur}`,
      '--------------------------------------------------',
      'TOP RESTAURANTS PARTENAIRES :'
    ];

    for (const r of this.topRestaurants()) {
      contenu.push(`- ${r.nom} : ${r.commandes} commandes`);
    }

    const blob = new Blob([contenu.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.setAttribute('href', url);
    lien.setAttribute('download', `ayyou-rapport-statistiques-${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);

    this.notificationSucces.set('Rapport statistique téléchargé avec succès.');
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }
}
