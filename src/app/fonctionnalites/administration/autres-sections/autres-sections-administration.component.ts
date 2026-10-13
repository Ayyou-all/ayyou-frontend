import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-utilisateurs-administration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          Gestion des Utilisateurs
        </h1>
        <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">8 432 inscrits</span>
      </div>

      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <p class="text-sm text-slate-500">
          Supervision de l'ensemble des comptes clients, restaurants, livreurs et administrateurs de la plateforme AYYOU.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div class="text-xs font-semibold text-slate-400">Clients actifs</div>
            <div class="text-xl font-black text-slate-900 mt-1 font-['Outfit']">7 820</div>
          </div>
          <div class="p-4 rounded-2xl bg-sky-50 border border-sky-100">
            <div class="text-xs font-semibold text-sky-600">Restaurants partenaires</div>
            <div class="text-xl font-black text-slate-900 mt-1 font-['Outfit']">142</div>
          </div>
          <div class="p-4 rounded-2xl bg-purple-50 border border-purple-100">
            <div class="text-xs font-semibold text-purple-600">Livreurs vérifiés</div>
            <div class="text-xl font-black text-slate-900 mt-1 font-['Outfit']">470</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UtilisateursAdministrationComponent {}

@Component({
  selector: 'app-commandes-administration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          Commandes de la Plateforme
        </h1>
        <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-red-50 text-[#E51824] border border-red-100">142 actives</span>
      </div>

      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <p class="text-sm text-slate-500">
          Suivi en temps réel de tous les flux de commandes et de livraisons sur la région de Dakar.
        </p>
      </div>
    </div>
  `
})
export class CommandesAdministrationComponent {}

@Component({
  selector: 'app-restaurants-administration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <h1 class="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
        Réseau des Restaurants
      </h1>
      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <p class="text-sm text-slate-500">
          Gestion des enseignes partenaires, de leurs menus, horaires et taux de satisfaction client.
        </p>
      </div>
    </div>
  `
})
export class RestaurantsAdministrationComponent {}

@Component({
  selector: 'app-livreurs-administration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <h1 class="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
        Flotte des Livreurs
      </h1>
      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <p class="text-sm text-slate-500">
          Suivi de la disponibilité des coursiers, des temps moyens de livraison et des vérifications de véhicules.
        </p>
      </div>
    </div>
  `
})
export class LivreursAdministrationComponent {}

@Component({
  selector: 'app-statistiques-administration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <h1 class="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
        Statistiques & Croissance
      </h1>
      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <p class="text-sm text-slate-500">
          Rapports financiers, volumes de ventes par quartier et KPIs clés d'AYYOU.
        </p>
      </div>
    </div>
  `
})
export class StatistiquesAdministrationComponent {}

@Component({
  selector: 'app-parametres-administration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <h1 class="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
        Paramètres Système
      </h1>
      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <p class="text-sm text-slate-500">
          Configuration des commissions de livraison, des zones de couverture à Dakar et des notifications.
        </p>
      </div>
    </div>
  `
})
export class ParametresAdministrationComponent {}
