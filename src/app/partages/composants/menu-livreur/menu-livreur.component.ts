import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

/**
 * Menu latéral de l'espace livreur, affiché uniquement sur ordinateur et tablette (>= 768px).
 * Simple navigation (Accueil, Gains, Profil) : aucune logique métier.
 * Sur mobile, chaque écran garde sa barre d'onglets du bas.
 */
@Component({
  selector: 'app-menu-livreur',
  standalone: true,
  imports: [RouterModule],
  template: `
    <aside class="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col justify-between bg-white border-r border-slate-200/70">
      <div class="px-5 pt-7 space-y-8">
        <a routerLink="/livreur" class="flex items-center gap-2 px-3 cursor-pointer" aria-label="Accueil livreur">
          <img src="/images/logo-ayyou.png" alt="Ayyou" class="h-9 w-auto object-contain" />
        </a>

        <nav class="space-y-1.5" aria-label="Navigation livreur">
          @for (lien of liens; track lien.chemin) {
            <a
              [routerLink]="lien.chemin"
              routerLinkActive="bg-[#FFF1F2] !text-[#E51824] font-bold"
              [routerLinkActiveOptions]="{ exact: lien.exact }"
              class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E51824]"
            >
              <i [class]="lien.icone + ' w-5 text-center text-base'"></i>
              <span>{{ lien.libelle }}</span>
            </a>
          }
        </nav>
      </div>

      <div class="p-5 border-t border-slate-100">
        <a
          routerLink="/livreur/profil"
          class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors cursor-pointer"
        >
          <div class="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            @if (serviceLivreur.profilLivreur().adressePhoto) {
              <img [src]="serviceLivreur.profilLivreur().adressePhoto" alt="" class="w-full h-full object-cover" />
            } @else {
              <i class="fa-solid fa-user text-sm text-slate-400"></i>
            }
          </div>
          <div class="min-w-0 leading-tight">
            <div class="text-xs text-slate-400">Livreur</div>
            <div class="text-sm font-bold text-slate-900 truncate">{{ serviceLivreur.profilLivreur().nomComplet }}</div>
          </div>
        </a>
      </div>
    </aside>
  `
})
export class MenuLivreurComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);

  readonly liens = [
    { libelle: 'Accueil', chemin: '/livreur', icone: 'fa-solid fa-house', exact: true },
    { libelle: 'Gains', chemin: '/livreur/gains', icone: 'fa-solid fa-wallet', exact: false },
    { libelle: 'Profil', chemin: '/livreur/profil', icone: 'fa-solid fa-user', exact: false }
  ];
}
