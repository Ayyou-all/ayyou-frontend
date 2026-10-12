import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

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

  // Période sélectionnée pour le graphique (Semaine ou Mois)
  readonly periodeSelectionnee = signal<'SEMAINE' | 'MOIS'>('SEMAINE');

  // Point survolé sur le graphique
  readonly pointSurvole = signal<PointDonneeGraphique | null>(null);

  // 4 Cartes d'indicateurs (KPIs) conformes à la maquette Superadmin
  readonly listeIndicateurs: CarteIndicateurSuperadmin[] = [
    {
      titre: "Chiffre d'affaires",
      valeur: '24 850,00 €',
      icone: 'fa-solid fa-coins',
      classeCouleurIcone: 'text-emerald-500',
      classeFondIcone: 'bg-emerald-50',
      badgeTexte: '+12.5%',
      classeBadge: 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    },
    {
      titre: 'Commandes actives',
      valeur: '142',
      icone: 'fa-solid fa-bag-shopping',
      classeCouleurIcone: 'text-[#E51824]',
      classeFondIcone: 'bg-red-50',
      badgeTexte: '+4.2%',
      classeBadge: 'bg-red-50 text-[#E51824] border border-red-100'
    },
    {
      titre: 'Nouveaux partenaires',
      valeur: '28',
      icone: 'fa-solid fa-clock-rotate-left',
      classeCouleurIcone: 'text-amber-500',
      classeFondIcone: 'bg-amber-50',
      badgeTexte: '5 en attente',
      classeBadge: 'bg-amber-50 text-amber-700 border border-amber-200'
    },
    {
      titre: 'Utilisateurs totaux',
      valeur: '8 432',
      icone: 'fa-solid fa-users',
      classeCouleurIcone: 'text-slate-700',
      classeFondIcone: 'bg-slate-100',
      badgeTexte: 'Stable',
      classeBadge: 'bg-slate-100 text-slate-600 border border-slate-200'
    }
  ];

  // Données de la courbe des commandes (7 jours de la semaine)
  readonly pointsGraphiqueSemaine: PointDonneeGraphique[] = [
    { jour: 'Lun', valeur: 420, xPourcentage: 35, yPourcentage: 220 },
    { jour: 'Mar', valeur: 380, xPourcentage: 135, yPourcentage: 235 },
    { jour: 'Mer', valeur: 510, xPourcentage: 235, yPourcentage: 185 },
    { jour: 'Jeu', valeur: 480, xPourcentage: 335, yPourcentage: 195 },
    { jour: 'Ven', valeur: 620, xPourcentage: 435, yPourcentage: 145 },
    { jour: 'Sam', valeur: 820, xPourcentage: 535, yPourcentage: 65 },
    { jour: 'Dim', valeur: 720, xPourcentage: 635, yPourcentage: 105 }
  ];

  // Liste des dernières validations en attente (conforme à l'Image 1)
  readonly dernieresValidations: ValidationRecenteSuperadmin[] = [
    {
      identifiant: 'val-01',
      nom: 'La Trattoria',
      specialiteOuVehicule: 'Cuisine Italienne',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-pizza-slice',
      estPhoto: false,
      classeFondIcone: 'bg-rose-50 text-[#E51824]',
      dateInscription: '24 Oct. 2023',
      statut: 'EN_ATTENTE'
    },
    {
      identifiant: 'val-02',
      nom: 'Thomas Dupont',
      specialiteOuVehicule: 'Scooter Électrique',
      type: 'LIVREUR',
      iconeOuPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      estPhoto: true,
      dateInscription: '25 Oct. 2023',
      statut: 'EN_ATTENTE'
    },
    {
      identifiant: 'val-03',
      nom: 'Burger Master',
      specialiteOuVehicule: 'Fast Food',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-burger',
      estPhoto: false,
      classeFondIcone: 'bg-amber-50 text-amber-600',
      dateInscription: '25 Oct. 2023',
      statut: 'EN_ATTENTE'
    }
  ];

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
