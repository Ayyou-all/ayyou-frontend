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
  readonly nomRestaurant = signal<string>('');
  readonly dateAujourdhuiTexte = signal<string>('');

  // Filtre période de revenus actif (24h, 7 jours, 30 jours)
  readonly periodeActive = signal<FiltrePeriodeRevenu>('7j');

  // Recherche dans l'en-tête
  readonly rechercheTexte = signal<string>('');
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);
  // Données calculées par le serveur (GET /api/commandes/restaurant/statistiques/)
  readonly statistiquesJour = signal<any | null>(null);
  readonly courbe = signal<{ libelle: string; chiffre_affaires_fcfa: number; commandes: number }[]>([]);
  readonly courbe7Jours = signal<{ libelle: string; chiffre_affaires_fcfa: number; commandes: number }[]>([]);

  // Statistiques calculées depuis les commandes réelles
  readonly commandesJour = signal<number>(0);
  readonly commandesJourProgression = signal<string>('');

  readonly clientsNombre = signal<number>(0);
  readonly clientsProgression = signal<string>('');

  readonly revenusJour = signal<string>('0 FCFA');
  readonly revenusJourProgression = signal<string>('');

  // Attribution commerciale des vidéos du Studio
  readonly ventesAttribueesVideos = signal<string>('0 FCFA');
  readonly partChiffreAffairesVideos = signal<string>('');
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
      error: () => this.messageErreur.set('Impossible de charger les informations du restaurant.')
    });

    this.chargerAnalytiques();

    // Effet réactif pour actualiser les graphiques Chart.js dès que les données arrivent
    effect(() => {
      this.courbe();
      this.courbe7Jours();
      if (this.chartRevenus) this.actualiserGraphiqueRevenus();
      if (this.chartSemaine) this.actualiserGraphiqueSemaine();
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


    const donnees = this.calculerPointsRevenus();

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

  private actualiserGraphiqueRevenus(): void {
    if (!this.chartRevenus) return;
    const donnees = this.calculerPointsRevenus();
    this.chartRevenus.data.labels = donnees.labels;
    this.chartRevenus.data.datasets[0].data = donnees.valeurs;
    this.chartRevenus.update();
  }

  /** Points du graphique des revenus : directement ceux calculés par le serveur. */
  private calculerPointsRevenus(): { labels: string[]; valeurs: number[] } {
    return {
      labels: this.courbe().map((point) => point.libelle),
      valeurs: this.courbe().map((point) => point.chiffre_affaires_fcfa)
    };
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

    const barres = this.calculerBarresSemaine();
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

  private actualiserGraphiqueSemaine(): void {
    if (!this.chartSemaine) return;
    const barres = this.calculerBarresSemaine();
    const data = barres.map((b) => b.quantite);
    const maxVal = Math.max(...data, 0);
    this.chartSemaine.data.labels = barres.map((b) => b.jour);
    this.chartSemaine.data.datasets[0].data = data;
    this.chartSemaine.data.datasets[0].backgroundColor = data.map((v) => (v === maxVal && maxVal > 0 ? '#E51824' : '#F1F5F9'));
    this.chartSemaine.update();
  }

  /** Nombre de commandes par jour sur les 7 derniers jours (calculé par le serveur). */
  private calculerBarresSemaine(): { jour: string; quantite: number }[] {
    return this.courbe7Jours().map((point) => ({ jour: point.libelle, quantite: point.commandes }));
  }

  chargerAnalytiques(): void {
    this.chargementEnCours.set(true);
    this.messageErreur.set(null);
    this.http
      .get<any>(`${environment.apiUrl}/commandes/restaurant/statistiques/`, { params: { periode: this.periodeActive() } })
      .subscribe({
        next: (stats) => {
          this.chargementEnCours.set(false);
          this.appliquerStatistiques(stats);
        },
        error: () => {
          this.chargementEnCours.set(false);
          this.messageErreur.set('Impossible de charger les statistiques. Veuillez réessayer.');
        }
      });
    this.chargerCommandesRecentes();
  }

  private appliquerStatistiques(stats: any): void {
    const jour = stats.aujourdhui;
    this.statistiquesJour.set(jour);
    this.commandesJour.set(jour.commandes);
    this.clientsNombre.set(jour.clients_uniques);
    this.revenusJour.set(`${jour.chiffre_affaires_fcfa.toLocaleString('fr-FR')} FCFA`);
    this.commandesJourProgression.set(this.texteEvolution(stats.evolution_vs_hier.commandes));
    this.clientsProgression.set(this.texteEvolution(stats.evolution_vs_hier.clients));
    this.revenusJourProgression.set(this.texteEvolution(stats.evolution_vs_hier.chiffre_affaires));

    const periode = stats.resume_periode;
    this.commandesVideos.set(periode.commandes_via_videos);
    this.ventesAttribueesVideos.set(`${periode.chiffre_affaires_videos_fcfa.toLocaleString('fr-FR')} FCFA`);
    this.partChiffreAffairesVideos.set(
      periode.chiffre_affaires_fcfa > 0
        ? `${Math.round((periode.chiffre_affaires_videos_fcfa / periode.chiffre_affaires_fcfa) * 100)}% du CA`
        : ''
    );

    this.courbe.set(stats.courbe);
    this.courbe7Jours.set(stats.courbe_7_jours);

    // Répartition des ventes par plat (les plus vendus sur la période)
    const totalQuantite = stats.meilleures_ventes.reduce((total: number, plat: any) => total + plat.quantite, 0);
    const couleurs = ['#E51824', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    this.categoriesDonut.set(
      stats.meilleures_ventes.map((plat: any, index: number) => ({
        nom: plat.nom,
        valeur: plat.quantite,
        pourcentage: totalQuantite ? Math.round((plat.quantite / totalQuantite) * 100) : 0,
        couleur: couleurs[index % couleurs.length]
      }))
    );
  }

  /** « +12 % vs hier », ou rien si hier n'avait aucune donnée à comparer. */
  private texteEvolution(pourcent: number | null): string {
    if (pourcent === null || pourcent === undefined) return '';
    return `${pourcent > 0 ? '+' : ''}${pourcent}% vs hier`;
  }

  /** Dernières commandes du jour (tableau en bas de page). */
  private chargerCommandesRecentes(): void {
    this.http.get<any[]>(`${environment.apiUrl}/commandes/restaurant/`, { params: { vue: 'jour' } }).subscribe({
      next: (commandes) => {
        this.listeCommandes.set(
          commandes.slice(0, 10).map((c) => ({
            id: `#${c.reference}`,
            plat: (c.articles || []).map((a: any) => `${a.quantite}x ${a.nom_plat}`).join(', '),
            client: c.client_nom || '',
            statut: c.statut === 'LIVREE' ? 'Livré' : ['EN_PREPARATION', 'PRETE_POUR_RETRAIT'].includes(c.statut) ? 'Préparation' : 'En attente',
            montant: `${Number(c.total_fcfa).toLocaleString('fr-FR')} FCFA`
          }))
        );
      },
      error: () => this.messageErreur.set('Impossible de charger les commandes récentes.')
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
    this.chargerAnalytiques();
  }
}
