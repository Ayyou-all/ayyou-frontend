import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { environment } from '../../../../environments/environment';

export interface CarteIndicateurSuperadmin {
  titre: string;
  valeur: string;
  icone: string;
  classeCouleurIcone: string;
  classeFondIcone: string;
  badgeTexte: string;
  classeBadge: string;
}

export interface ValidationRecenteSuperadmin {
  identifiant: string;
  nom: string;
  specialiteOuVehicule: string;
  type: 'RESTAURANT' | 'LIVREUR';
  iconeOuPhoto: string;
  estPhoto: boolean;
  classeFondIcone?: string;
  dateInscription: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
}

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tableau-de-bord.component.html'
})
export class TableauDeBordComponent implements AfterViewInit, OnDestroy {
  readonly routeur = inject(Router);
  private readonly http = inject(HttpClient);

  @ViewChild('canvasCommandes') private canvasRef?: ElementRef<HTMLCanvasElement>;
  private chartCommandes?: Chart;

  // Période sélectionnée pour le graphique (Semaine ou Mois)
  readonly periodeSelectionnee = signal<'SEMAINE' | 'MOIS'>('SEMAINE');

  // 4 Cartes d'indicateurs (KPIs) alimentées par l'API Superadmin
  readonly listeIndicateurs = signal<CarteIndicateurSuperadmin[]>([
    {
      titre: "Chiffre d'affaires",
      valeur: '0 FCFA',
      icone: 'fa-solid fa-coins',
      classeCouleurIcone: 'text-emerald-500',
      classeFondIcone: 'bg-emerald-50',
      badgeTexte: 'Réel',
      classeBadge: 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    },
    {
      titre: 'Commandes totales',
      valeur: '0',
      icone: 'fa-solid fa-bag-shopping',
      classeCouleurIcone: 'text-[#E51824]',
      classeFondIcone: 'bg-red-50',
      badgeTexte: 'En direct',
      classeBadge: 'bg-red-50 text-[#E51824] border border-red-100'
    },
    {
      titre: 'Partenaires en attente',
      valeur: '0',
      icone: 'fa-solid fa-clock-rotate-left',
      classeCouleurIcone: 'text-amber-500',
      classeFondIcone: 'bg-amber-50',
      badgeTexte: 'À modérer',
      classeBadge: 'bg-amber-50 text-amber-700 border border-amber-200'
    },
    {
      titre: 'Utilisateurs totaux',
      valeur: '0',
      icone: 'fa-solid fa-users',
      classeCouleurIcone: 'text-slate-700',
      classeFondIcone: 'bg-slate-100',
      badgeTexte: 'Vérifiés',
      classeBadge: 'bg-slate-100 text-slate-600 border border-slate-200'
    }
  ]);

  // Données brutes de la courbe (7 derniers jours ou 30 jours) - alimentées par l'API
  readonly donneesBrutesSemaine = signal<{ jour: string; date?: string; valeur: number }[]>([]);

  // Liste des dernières validations réelles (provenant de la base de données)
  readonly dernieresValidations = signal<ValidationRecenteSuperadmin[]>([]);

  // Horodatage de la dernière synchronisation avec l'API
  readonly messageErreur = signal<string | null>(null);
  readonly derniereMiseAJour = signal<Date | null>(null);

  constructor() {
    this.chargerStatistiques();
    // Rafraîchissement en temps réel toutes les 15 secondes
    const intervalle = setInterval(() => this.chargerStatistiques(), 15000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalle));

    // Effet pour mettre à jour automatiquement le graphique Chart.js
    effect(() => {
      const donnees = this.donneesBrutesSemaine();
      const periode = this.periodeSelectionnee();
      if (this.chartCommandes && donnees.length > 0) {
        this.actualiserGraphique(donnees, periode);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initialiserGraphique();
  }

  ngOnDestroy(): void {
    if (this.chartCommandes) {
      this.chartCommandes.destroy();
      this.chartCommandes = undefined;
    }
  }

  private initialiserGraphique(): void {
    if (!this.canvasRef?.nativeElement) return;
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Création d'un dégradé rouge doux sous la courbe

    const donnees = this.donneesBrutesSemaine();
    const labels = donnees.length > 0 ? donnees.map((p) => p.jour) : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const valeurs = donnees.length > 0 ? donnees.map((p) => p.valeur) : [0, 0, 0, 0, 0, 0, 0];

    this.chartCommandes = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Commandes',
            data: valeurs,
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
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
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
        animation: {
          duration: 750,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 12,
            titleFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11,
              weight: 'bold'
            },
            bodyFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 13,
              weight: 'bold'
            },
            displayColors: false,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const d = this.donneesBrutesSemaine()[idx];
                return d?.date ? `${items[0]?.label} (${d.date})` : `${items[0]?.label}`;
              },
              label: (context) => {
                const val = Number(context.raw || 0);
                return `${val} commande${val > 1 ? 's' : ''}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
                weight: 'bold'
              },
              color: '#94a3b8'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              stepSize: 1,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
                weight: 'bold'
              },
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }

  private actualiserGraphique(donnees: { jour: string; date?: string; valeur: number }[], periode: 'SEMAINE' | 'MOIS'): void {
    if (!this.chartCommandes) return;
    this.chartCommandes.data.labels = donnees.map((p) => p.jour);
    this.chartCommandes.data.datasets[0].data = donnees.map((p) => p.valeur);
    this.chartCommandes.update();
  }

  chargerStatistiques(): void {
    this.http.get<any>(`${environment.apiUrl}/administration/statistiques/`).subscribe({
      next: (stats) => {
        const ca = Number(stats.volumeAffairesFcfa ?? stats.chiffre_affaires_total_fcfa ?? 0);
        const cmds = Number(stats.totalCommandes ?? stats.nombre_commandes_total ?? 0);
        const attente = Number(stats.partenairesEnAttente ?? stats.nombre_partenaires_en_attente ?? 0);
        const totalUsers = Number(stats.totalUtilisateurs ?? stats.nombre_utilisateurs_total ?? 0);

        this.listeIndicateurs.set([
          {
            titre: "Chiffre d'affaires",
            valeur: `${ca.toLocaleString('fr-FR')} FCFA`,
            icone: 'fa-solid fa-coins',
            classeCouleurIcone: 'text-emerald-500',
            classeFondIcone: 'bg-emerald-50',
            badgeTexte: 'Réel',
            classeBadge: 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          },
          {
            titre: 'Commandes totales',
            valeur: String(cmds),
            icone: 'fa-solid fa-bag-shopping',
            classeCouleurIcone: 'text-[#E51824]',
            classeFondIcone: 'bg-red-50',
            badgeTexte: 'En direct',
            classeBadge: 'bg-red-50 text-[#E51824] border border-red-100'
          },
          {
            titre: 'Partenaires en attente',
            valeur: String(attente),
            icone: 'fa-solid fa-clock-rotate-left',
            classeCouleurIcone: 'text-amber-500',
            classeFondIcone: 'bg-amber-50',
            badgeTexte: 'À modérer',
            classeBadge: 'bg-amber-50 text-amber-700 border border-amber-200'
          },
          {
            titre: 'Utilisateurs totaux',
            valeur: String(totalUsers),
            icone: 'fa-solid fa-users',
            classeCouleurIcone: 'text-slate-700',
            classeFondIcone: 'bg-slate-100',
            badgeTexte: 'Vérifiés',
            classeBadge: 'bg-slate-100 text-slate-600 border border-slate-200'
          }
        ]);

        if (Array.isArray(stats.commandesParJour)) {
          this.donneesBrutesSemaine.set(
            stats.commandesParJour.map((p: any) => ({
              jour: String(p.jour),
              date: p.date,
              valeur: Number(p.valeur ?? 0)
            }))
          );
        }

        if (Array.isArray(stats.dernieresValidations)) {
          this.dernieresValidations.set(stats.dernieresValidations);
        }

        this.derniereMiseAJour.set(new Date());
        this.messageErreur.set(null);
      },
      error: () => this.messageErreur.set('Impossible de charger les statistiques. Nouvelle tentative automatique.')
    });
  }

  voirToutesLesValidations(): void {
    this.routeur.navigate(['/administration/validations']);
  }

  examinerPartenaire(identifiant: string): void {
    this.routeur.navigate(['/administration/validations'], {
      queryParams: { cible: identifiant }
    });
  }
}
