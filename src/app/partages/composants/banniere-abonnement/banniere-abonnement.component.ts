import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { ServiceAbonnement } from '../../../socle/services/service-abonnement.service';

/**
 * Bannière d'abonnement affichée en haut de toutes les pages de l'espace restaurant (layout gérant).
 * - Essai gratuit : nombre de jours restants + « S'abonner ».
 * - Abonnement actif : seulement dans les 3 derniers jours, avec « Renouveler ».
 * - Suspendu : message clair + « Réactiver ».
 * Les données viennent du backend (ServiceAbonnement, rechargé à chaque changement de page).
 */
@Component({
  selector: 'app-banniere-abonnement',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    @if (message(); as contenu) {
      <div
        [class]="contenu.suspendu
          ? 'bg-red-50 border-red-200 text-red-900'
          : 'bg-white/70 backdrop-blur-sm border-amber-200 text-slate-800'"
        class="mb-4 sm:mb-6 rounded-2xl border px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3"
      >
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span
            [class]="contenu.suspendu ? 'bg-red-100 text-[#E51824]' : 'bg-amber-100 text-amber-700'"
            class="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center shrink-0"
          >
            <i [class]="contenu.suspendu ? 'fa-solid fa-lock' : 'fa-regular fa-clock'" class="text-sm"></i>
          </span>
          <p class="text-xs sm:text-sm font-semibold leading-snug">{{ contenu.texte }}</p>
        </div>
        <a
          routerLink="/gerant/abonnement"
          class="shrink-0 inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#E51824] hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-colors"
        >
          {{ contenu.bouton }}
          <span class="hidden md:inline font-semibold opacity-90">— {{ prix() | number: '1.0-0' }} FCFA/mois</span>
        </a>
      </div>
    }
  `
})
export class BanniereAbonnementComponent {
  private readonly serviceAbonnement = inject(ServiceAbonnement);
  private readonly routeur = inject(Router);

  private readonly urlCourante = toSignal(
    this.routeur.events.pipe(
      filter((evenement) => evenement instanceof NavigationEnd),
      map(() => this.routeur.url)
    ),
    { initialValue: this.routeur.url }
  );

  readonly prix = computed(() => this.serviceAbonnement.etat()?.prix_fcfa ?? 0);

  readonly message = computed(() => {
    const etat = this.serviceAbonnement.etat();
    // Inutile sur la page « Mon abonnement », qui affiche déjà tout
    if (!etat || this.urlCourante().startsWith('/gerant/abonnement')) {
      return null;
    }
    const quand = etat.jours_restants <= 1 ? 'demain' : `dans ${etat.jours_restants} jours`;
    if (etat.statut === 'SUSPENDU') {
      return {
        suspendu: true,
        texte: 'Votre espace restaurant est suspendu : activez votre abonnement pour continuer. Vos données sont conservées.',
        bouton: 'Réactiver'
      };
    }
    if (etat.statut === 'ESSAI') {
      return { suspendu: false, texte: `Votre période d'essai se termine ${quand}.`, bouton: "S'abonner" };
    }
    if (etat.jours_restants <= 3) {
      return { suspendu: false, texte: `Votre abonnement expire ${quand}.`, bouton: 'Renouveler' };
    }
    return null;
  });
}
