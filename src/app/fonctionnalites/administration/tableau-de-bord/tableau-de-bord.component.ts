import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
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

  // Données de la courbe des commandes (7 jours de la semaine) - Alimentées par l'API réelle
  readonly pointsGraphiqueSemaine = signal<PointDonneeGraphique[]>([
    { jour: 'Lun', valeur: 0, xPourcentage: 35, yPourcentage: 220 },
    { jour: 'Mar', valeur: 0, xPourcentage: 135, yPourcentage: 220 },
    { jour: 'Mer', valeur: 0, xPourcentage: 235, yPourcentage: 220 },
    { jour: 'Jeu', valeur: 0, xPourcentage: 335, yPourcentage: 220 },
    { jour: 'Ven', valeur: 0, xPourcentage: 435, yPourcentage: 220 },
    { jour: 'Sam', valeur: 0, xPourcentage: 535, yPourcentage: 220 },
    { jour: 'Dim', valeur: 0, xPourcentage: 635, yPourcentage: 220 }
  ]);

  // Tracé SVG dynamique de la ligne de commande
  readonly cheminLigneSvg = computed(() => {
    const pts = this.pointsGraphiqueSemaine();
    if (!pts.length) return 'M 35 220 L 635 220';
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
    if (!pts.length) return 'M 35 220 L 635 220 L 635 260 L 35 260 Z';
    const ligne = this.cheminLigneSvg();
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${ligne} L ${last.xPourcentage} 260 L ${first.xPourcentage} 260 Z`;
  });

  // Liste des dernières validations réelles (provenant de la base de données)
  readonly dernieresValidations = signal<ValidationRecenteSuperadmin[]>([]);

  constructor() {
    this.chargerStatistiques();
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

        if (Array.isArray(stats.commandesParJour) && stats.commandesParJour.length > 0) {
          this.pointsGraphiqueSemaine.set(stats.commandesParJour);
        }

        if (Array.isArray(stats.dernieresValidations)) {
          this.dernieresValidations.set(stats.dernieresValidations);
        }
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
