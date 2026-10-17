import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MOTIFS_ECHEC_LIVRAISON, ServiceLivreurService } from '../../../socle/services/service-livreur.service';

/**
 * Bouton + petit formulaire pour signaler un problème pendant une course.
 *
 * - mode « ANNULATION » : avant d'avoir récupéré la commande, le livreur annule (raison libre) ;
 *   la course est reproposée à un autre livreur.
 * - mode « ECHEC » : en route ou chez le client, le livreur déclare un échec (raison dans une liste) ;
 *   le support AYYOU prend le relais.
 * Le parent est prévenu (événement `termine`) seulement si le serveur a accepté.
 */
@Component({
  selector: 'app-signaler-probleme',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (!ouvert()) {
      <button
        type="button"
        (click)="ouvert.set(true)"
        class="w-full py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
      >
        {{ mode === 'ECHEC' ? 'Signaler un problème de livraison' : 'Annuler la course' }}
      </button>
    } @else {
      <div class="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
        @if (mode === 'ECHEC') {
          <label class="block text-xs font-bold text-slate-700">Que se passe-t-il ?</label>
          <select [(ngModel)]="motif" class="w-full p-3 rounded-xl border border-slate-200 text-sm">
            <option value="">Choisir une raison</option>
            @for (choix of motifsEchec; track choix.valeur) {
              <option [value]="choix.valeur">{{ choix.libelle }}</option>
            }
          </select>
        } @else {
          <label class="block text-xs font-bold text-slate-700">Pourquoi annulez-vous ?</label>
          <input [(ngModel)]="motif" class="w-full p-3 rounded-xl border border-slate-200 text-sm" placeholder="Ex : panne de moto" />
        }
        @if (erreur()) {
          <p class="text-xs font-semibold text-red-600">{{ erreur() }}</p>
        }
        <div class="flex gap-2">
          <button
            type="button"
            (click)="confirmer()"
            [disabled]="!motif || enCours()"
            class="flex-1 py-3 rounded-xl bg-[#E51824] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {{ enCours() ? 'Envoi...' : 'Confirmer' }}
          </button>
          <button
            type="button"
            (click)="ouvert.set(false)"
            class="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
          >
            Retour
          </button>
        </div>
      </div>
    }
  `
})
export class SignalerProblemeComponent {
  @Input() mode: 'ECHEC' | 'ANNULATION' = 'ECHEC';
  @Output() termine = new EventEmitter<void>();

  private readonly serviceLivreur = inject(ServiceLivreurService);
  readonly motifsEchec = MOTIFS_ECHEC_LIVRAISON;
  readonly ouvert = signal<boolean>(false);
  readonly enCours = signal<boolean>(false);
  readonly erreur = signal<string | null>(null);
  motif = '';

  confirmer(): void {
    this.enCours.set(true);
    this.erreur.set(null);
    const action = this.mode === 'ECHEC' ? this.serviceLivreur.declarerEchec(this.motif) : this.serviceLivreur.annulerCourse(this.motif);
    action.subscribe({
      next: () => {
        this.enCours.set(false);
        this.termine.emit();
      },
      error: (erreur) => {
        this.enCours.set(false);
        this.erreur.set(erreur?.error?.message || 'Envoi impossible. Vérifiez votre connexion et réessayez.');
      }
    });
  }
}
