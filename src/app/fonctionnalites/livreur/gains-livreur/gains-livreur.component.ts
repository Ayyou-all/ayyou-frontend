import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { ActiviteJourLivreur } from '../../../socle/modeles/livreur.modele';

@Component({
  selector: 'app-gains-livreur',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gains-livreur.component.html'
})
export class GainsLivreurComponent implements AfterViewInit, OnDestroy {
  readonly serviceLivreur = inject(ServiceLivreurService);

  @ViewChild('canvasActivite') private canvasRef?: ElementRef<HTMLCanvasElement>;
  private chartActivite?: Chart;

  constructor() {
    // Synchronisation automatique en temps réel avec les données du livreur
    effect(() => {
      const donnees = this.serviceLivreur.activiteHebdomadaire();
      if (this.chartActivite && donnees.length > 0) {
        this.actualiserGraphique(donnees);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initialiserGraphique();
  }

  ngOnDestroy(): void {
    if (this.chartActivite) {
      this.chartActivite.destroy();
      this.chartActivite = undefined;
    }
  }

  private initialiserGraphique(): void {
    if (!this.canvasRef?.nativeElement) return;

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const donnees = this.serviceLivreur.activiteHebdomadaire();
    const labels = donnees.map((d) => d.jour);
    const montants = donnees.map((d) => d.montantFcfa);

    this.chartActivite = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Gains',
            data: montants,
            backgroundColor: '#E51824',
            hoverBackgroundColor: '#b9121c',
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 34
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            padding: 10,
            cornerRadius: 10,
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
              label: (context) => {
                const val = Number(context.raw || 0);
                return `${val.toLocaleString('fr-FR')} FCFA`;
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
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 10,
                weight: 'bold'
              },
              color: '#94a3b8',
              callback: (value) => {
                const n = Number(value);
                return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
              }
            }
          }
        }
      }
    });
  }

  private actualiserGraphique(donnees: ActiviteJourLivreur[]): void {
    if (!this.chartActivite) return;
    this.chartActivite.data.labels = donnees.map((d) => d.jour);
    this.chartActivite.data.datasets[0].data = donnees.map((d) => d.montantFcfa);
    this.chartActivite.update();
  }
}
