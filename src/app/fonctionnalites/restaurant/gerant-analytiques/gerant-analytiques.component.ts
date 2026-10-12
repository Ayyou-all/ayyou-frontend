import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-gerant-analytiques',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="space-y-6 pb-20">
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
            <i class="fa-solid fa-chart-simple"></i>
          </div>
          <div>
            <h1 class="text-xl font-black text-gray-900 tracking-tight">Performances & Analytiques</h1>
            <p class="text-xs text-gray-500">Statistiques de vente du restaurant Le Teranga</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <select
            [ngModel]="periodeSelectionnee()"
            (ngModelChange)="periodeSelectionnee.set($event)"
            class="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
          >
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
            <option value="annee">Cette année</option>
          </select>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div class="text-xs font-semibold text-gray-500">Chiffre d'Affaires Hebdo</div>
          <div class="text-2xl font-black text-gray-900">718 500 <span class="text-xs font-bold text-gray-400">FCFA</span></div>
          <div class="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <i class="fa-solid fa-arrow-trend-up"></i> +14.2% vs semaine passée
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div class="text-xs font-semibold text-gray-500">Commandes Totales</div>
          <div class="text-2xl font-black text-gray-900">84 <span class="text-xs font-bold text-gray-400">commandes</span></div>
          <div class="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <i class="fa-solid fa-arrow-trend-up"></i> +8.5%
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div class="text-xs font-semibold text-gray-500">Temps Moyen Préparation</div>
          <div class="text-2xl font-black text-gray-900">14 <span class="text-xs font-bold text-gray-400">min</span></div>
          <div class="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <i class="fa-solid fa-bolt"></i> Excellent (Objectif < 20 min)
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div class="text-xs font-semibold text-gray-500">Note Moyenne Clients</div>
          <div class="text-2xl font-black text-amber-500 flex items-center gap-1">
            <span>4.9</span>
            <i class="fa-solid fa-star text-base"></i>
          </div>
          <div class="text-xs text-gray-400 font-semibold">Basé sur 138 avis</div>
        </div>
      </div>

      <!-- Top Plats Vendus -->
      <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h2 class="text-base font-black text-gray-900">Plats les plus populaires</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-xs">1</span>
              <span class="font-bold text-sm text-gray-900">Thieboudienne Rouge</span>
            </div>
            <div class="text-xs font-black text-gray-700">342 portions vendues</div>
          </div>
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">2</span>
              <span class="font-bold text-sm text-gray-900">Yassa Poulet</span>
            </div>
            <div class="text-xs font-black text-gray-700">215 portions vendues</div>
          </div>
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-black text-xs">3</span>
              <span class="font-bold text-sm text-gray-900">Bissap Maison</span>
            </div>
            <div class="text-xs font-black text-gray-700">198 verres vendus</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GerantAnalytiquesComponent {
  readonly periodeSelectionnee = signal<string>('7j');
}
