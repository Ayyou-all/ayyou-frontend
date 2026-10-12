import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuthentification } from '../../socle/services/service-authentification.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 class="text-2xl font-extrabold text-slate-900 font-['Outfit']">Mon Profil</h1>
      
      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex items-center gap-4">
        <div class="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-red-100 shrink-0">
          <img
            [src]="serviceAuthentification.utilisateurConnecte()?.adressePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'"
            alt="Avatar"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-extrabold text-slate-900 truncate">
            {{ serviceAuthentification.utilisateurConnecte()?.prenom }} {{ serviceAuthentification.utilisateurConnecte()?.nom }}
          </h2>
          <div class="text-xs text-slate-500">{{ serviceAuthentification.utilisateurConnecte()?.courriel }}</div>
          <div class="text-xs text-slate-500">{{ serviceAuthentification.utilisateurConnecte()?.telephone }}</div>
        </div>
      </div>

      <div class="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-2">
        <a
          routerLink="/livreur"
          class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer border border-slate-100"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-red-50 text-[#E51824] flex items-center justify-center">
              <i class="fa-solid fa-motorcycle"></i>
            </div>
            <div>
              <span class="block text-slate-900">Espace Livreur</span>
              <span class="block text-xs font-normal text-slate-400">Gérer mes courses et mes gains</span>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right text-xs text-slate-400"></i>
        </a>

        <button
          type="button"
          (click)="deconnecter()"
          class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Se déconnecter</span>
          </div>
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
      </div>
    </div>
  `
})
export class ProfilComponent {
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly routeur = inject(Router);

  deconnecter(): void {
    this.serviceAuthentification.deconnecter();
    this.routeur.navigate(['/connexion']);
  }
}
