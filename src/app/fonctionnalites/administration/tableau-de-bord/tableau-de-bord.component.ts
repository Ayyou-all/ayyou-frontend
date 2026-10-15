import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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

export interface PointDonneeGraphique {
  jour: string;
  date?: string;
  valeur: number;
  xPourcentage: number;
  yPourcentage: number;
}

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tableau-de-bord.component.html'
})
export class TableauDeBordComponent {
  readonly routeur = inject(Router);
  private readonly http = inject(HttpClient);

  // Période sélectionnée pour le graphique (Semaine ou Mois)
  readonly periodeSelectionnee = signal<'SEMAINE' | 'MOIS'>('SEMAINE');

  // Point survolé sur le graphique
  readonly pointSurvole = signal<PointDonneeGraphique | null>(null);

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

  // Données brutes de la courbe (7 derniers jours) - alimentées exclusivement par l'API
  private readonly donneesBrutesSemaine = signal<{ jour: string; date?: string; valeur: number }[]>([]);

  // Hauteur de la zone de tracé SVG (viewBox 0 0 670 270)
  private readonly HAUTEUR_SVG = 270;
  private readonly X_POINTS = [35, 135, 235, 335, 435, 535, 635];

  // Valeur maximale de l'axe Y calculée à partir des vraies données (multiple de 9 pour 10 graduations)
  readonly maxAxeY = computed(() => {
    const max = Math.max(0, ...this.donneesBrutesSemaine().map((p) => p.valeur));
    return Math.max(9, Math.ceil((max * 1.15) / 9) * 9);
  });

  // Graduations de l'axe Y (du haut vers le bas)
  readonly graduationsAxeY = computed(() => {
    const max = this.maxAxeY();
    return Array.from({ length: 10 }, (_, i) => Math.round((max * (9 - i)) / 9));
  });

  // Points positionnés selon l'échelle réelle
  readonly pointsGraphiqueSemaine = computed<PointDonneeGraphique[]>(() => {
    const donnees = this.donneesBrutesSemaine();
    const max = this.maxAxeY();
    return donnees.map((p, idx) => ({
      jour: p.jour,
      date: p.date,
      valeur: p.valeur,
      xPourcentage: this.X_POINTS[idx] ?? 35 + idx * 100,
      yPourcentage: this.HAUTEUR_SVG - (p.valeur / max) * this.HAUTEUR_SVG
    }));
  });

  // Tracé SVG dynamique de la ligne de commande
  readonly cheminLigneSvg = computed(() => {
    const pts = this.pointsGraphiqueSemaine();
    if (!pts.length) return `M 35 ${this.HAUTEUR_SVG} L 635 ${this.HAUTEUR_SVG}`;
    let d = `M ${pts[0].xPourcentage} ${pts[0].yPourcentage}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cpx = prev.xPourcentage + (cur.xPourcentage - prev.xPourcentage) / 2;
      d += ` C ${cpx} ${prev.yPourcentage}, ${cpx} ${cur.yPourcentage}, ${cur.xPourcentage} ${cur.yPourcentage}`;
    }
    return d;
  });

  // Surface remplie sous la courbe
  readonly cheminSurfaceSvg = computed(() => {
    const pts = this.pointsGraphiqueSemaine();
    const bas = this.HAUTEUR_SVG;
    if (!pts.length) return `M 35 ${bas} L 635 ${bas} Z`;
    const ligne = this.cheminLigneSvg();
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${ligne} L ${last.xPourcentage} ${bas} L ${first.xPourcentage} ${bas} Z`;
  });

  // Liste des dernières validations réelles (provenant de la base de données)
  readonly dernieresValidations = signal<ValidationRecenteSuperadmin[]>([]);

  // Horodatage de la dernière synchronisation avec l'API
  readonly derniereMiseAJour = signal<Date | null>(null);

  constructor() {
    this.chargerStatistiques();
    // Rafraîchissement en temps réel toutes les 15 secondes
    const intervalle = setInterval(() => this.chargerStatistiques(), 15000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalle));
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
      },
      error: () => {}
    });
  }

  /**
   * Ouvre la page complète des validations en attente.
   */
  voirToutesLesValidations(): void {
    this.routeur.navigate(['/administration/validations']);
  }

  /**
   * Ouvre l'examen détaillé d'une validation spécifique.
   */
  examinerPartenaire(identifiant: string): void {
    this.routeur.navigate(['/administration/validations'], {
      queryParams: { cible: identifiant }
    });
  }
}
