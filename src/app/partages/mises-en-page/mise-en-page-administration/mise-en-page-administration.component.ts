import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

export interface ElementMenuAdministration {
  code: string;
  libelle: string;
  icone: string;
  chemin: string;
}

@Component({
  selector: 'app-mise-en-page-administration',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mise-en-page-administration.component.html'
})
export class MiseEnPageAdministrationComponent {
  readonly routeur = inject(Router);
  readonly serviceAuthentification = inject(ServiceAuthentification);

  // État du menu mobile / repliable
  readonly menuMobileOuvert = signal<boolean>(false);

  // Recherche globale
  readonly texteRechercheGlobale = signal<string>('');

  // Liste des entrées de navigation principale (conforme aux maquettes Superadmin)
  readonly listeMenuPrincipal: ElementMenuAdministration[] = [
    {
      code: 'tableau-de-bord',
      libelle: 'Tableau de bord',
      icone: 'fa-solid fa-gauge-high',
      chemin: '/administration/tableau-de-bord'
    },
    {
      code: 'validations',
      libelle: 'Validations',
      icone: 'fa-solid fa-clipboard-check',
      chemin: '/administration/validations'
    },
    {
      code: 'utilisateurs',
      libelle: 'Utilisateurs',
      icone: 'fa-solid fa-users',
      chemin: '/administration/utilisateurs'
    },
    {
      code: 'commandes',
      libelle: 'Commandes',
      icone: 'fa-solid fa-bag-shopping',
      chemin: '/administration/commandes'
    },
    {
      code: 'restaurants',
      libelle: 'Restaurants',
      icone: 'fa-solid fa-utensils',
      chemin: '/administration/restaurants'
    },
    {
      code: 'livreurs',
      libelle: 'Coursiers',
      icone: 'fa-solid fa-bicycle',
      chemin: '/administration/livreurs'
    },
    {
      code: 'statistiques',
      libelle: 'Statistiques',
      icone: 'fa-solid fa-chart-line',
      chemin: '/administration/statistiques'
    }
  ];

  // Compte de l'administrateur, en bas de la barre latérale
  readonly lienParametres: ElementMenuAdministration = {
    code: 'parametres',
    libelle: 'Mon compte',
    icone: 'fa-solid fa-user-gear',
    chemin: '/administration/parametres'
  };

  /**
   * Vérifie si un chemin de navigation est actuellement actif.
   */
  estLienActif(chemin: string): boolean {
    return this.routeur.url.startsWith(chemin);
  }

  /**
   * Bascule le tiroir mobile.
   */
  basculerMenuMobile(): void {
    this.menuMobileOuvert.update((ouvert) => !ouvert);
  }

  /**
   * Ferme le tiroir mobile.
   */
  fermerMenuMobile(): void {
    this.menuMobileOuvert.set(false);
  }

  /**
   * Déconnexion de l'administrateur.
   */
  seDeconnecter(): void {
    this.serviceAuthentification.deconnecter();
    this.routeur.navigate(['/connexion']);
  }
}
