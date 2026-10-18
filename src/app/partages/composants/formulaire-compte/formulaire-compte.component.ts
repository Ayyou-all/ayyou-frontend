import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

/**
 * Modification du compte avec les routes existantes de l'API :
 * - PATCH /api/utilisateurs/moi/ : prénom, nom, e-mail, téléphone (+ adresse et photo pour le client) ;
 * - POST /api/utilisateurs/changer-mot-de-passe/ : mot de passe.
 * Aucun autre champ n'est proposé (seuls ceux saisis à l'inscription).
 */
@Component({
  selector: 'app-formulaire-compte',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Informations du compte -->
    <form (ngSubmit)="enregistrerInformations()" class="bg-white rounded-3xl border border-slate-100 p-5 md:p-7 space-y-4">
      <h2 class="text-base md:text-lg font-bold text-slate-900 font-['Outfit']">Mes informations</h2>

      @if (avecPhoto) {
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full overflow-hidden bg-[#FFF1F2] border border-slate-100 flex items-center justify-center shrink-0">
            @if (apercuPhoto()) {
              <img [src]="apercuPhoto()" alt="" class="w-full h-full object-cover" />
            } @else {
              <i class="fa-solid fa-user text-[#E51824]"></i>
            }
          </div>
          <label class="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
            Changer la photo
            <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" (change)="choisirPhoto($event)" />
          </label>
        </div>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label class="block space-y-1.5">
          <span class="text-sm font-semibold text-slate-700">Prénom</span>
          <input name="prenom" [ngModel]="prenom()" (ngModelChange)="prenom.set($event)" required autocomplete="given-name" [class]="classeChamp" />
        </label>
        <label class="block space-y-1.5">
          <span class="text-sm font-semibold text-slate-700">Nom</span>
          <input name="nom" [ngModel]="nom()" (ngModelChange)="nom.set($event)" required autocomplete="family-name" [class]="classeChamp" />
        </label>
        <label class="block space-y-1.5">
          <span class="text-sm font-semibold text-slate-700">E-mail</span>
          <input name="courriel" type="email" [ngModel]="courriel()" (ngModelChange)="courriel.set($event)" required autocomplete="email" [class]="classeChamp" />
        </label>
        <label class="block space-y-1.5">
          <span class="text-sm font-semibold text-slate-700">Téléphone</span>
          <input name="telephone" type="tel" [ngModel]="telephone()" (ngModelChange)="telephone.set($event)" required autocomplete="tel" [class]="classeChamp" />
        </label>
        @if (avecAdresse) {
          <label class="block space-y-1.5 sm:col-span-2">
            <span class="text-sm font-semibold text-slate-700">Adresse de livraison habituelle</span>
            <input name="adresse" [ngModel]="adresse()" (ngModelChange)="adresse.set($event)" autocomplete="street-address" [class]="classeChamp" />
          </label>
        }
      </div>

      @if (messageInformations()) {
        <p [class]="erreurInformations() ? 'text-red-600' : 'text-emerald-700'" class="text-sm font-semibold">{{ messageInformations() }}</p>
      }
      <button
        type="submit"
        [disabled]="envoiInformations()"
        class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#E51824] hover:bg-red-700 text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
      >
        {{ envoiInformations() ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </form>

    <!-- Mot de passe -->
    <form (ngSubmit)="changerMotDePasse()" class="bg-white rounded-3xl border border-slate-100 p-5 md:p-7 space-y-4">
      <h2 class="text-base md:text-lg font-bold text-slate-900 font-['Outfit']">Mot de passe</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label class="block space-y-1.5">
          <span class="text-sm font-semibold text-slate-700">Mot de passe actuel</span>
          <input name="ancien" type="password" [ngModel]="ancienMotDePasse()" (ngModelChange)="ancienMotDePasse.set($event)" autocomplete="current-password" [class]="classeChamp" />
        </label>
        <label class="block space-y-1.5">
          <span class="text-sm font-semibold text-slate-700">Nouveau</span>
          <input name="nouveau" type="password" [ngModel]="nouveauMotDePasse()" (ngModelChange)="nouveauMotDePasse.set($event)" autocomplete="new-password" [class]="classeChamp" />
        </label>
        <label class="block space-y-1.5">
          <span class="text-sm font-semibold text-slate-700">Confirmation</span>
          <input name="confirmation" type="password" [ngModel]="confirmationMotDePasse()" (ngModelChange)="confirmationMotDePasse.set($event)" autocomplete="new-password" [class]="classeChamp" />
        </label>
      </div>
      <p class="text-xs text-slate-400">8 caractères minimum.</p>
      @if (messageMotDePasse()) {
        <p [class]="erreurMotDePasse() ? 'text-red-600' : 'text-emerald-700'" class="text-sm font-semibold">{{ messageMotDePasse() }}</p>
      }
      <button
        type="submit"
        [disabled]="envoiMotDePasse() || !ancienMotDePasse() || !nouveauMotDePasse()"
        class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-40"
      >
        {{ envoiMotDePasse() ? 'Modification…' : 'Changer le mot de passe' }}
      </button>
    </form>
  `,
  host: { class: 'block space-y-5' }
})
export class FormulaireCompteComponent implements OnInit {
  /** Client : adresse de livraison et photo (saisies à son inscription). */
  @Input() avecAdresse = false;
  @Input() avecPhoto = false;

  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);
  private readonly urlCompte = `${environment.apiUrl}/utilisateurs/`;

  readonly classeChamp =
    'w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#E51824] transition-colors';

  readonly prenom = signal('');
  readonly nom = signal('');
  readonly courriel = signal('');
  readonly telephone = signal('');
  readonly adresse = signal('');
  private photo: File | null = null;
  readonly apercuPhoto = signal<string | null>(null);

  readonly ancienMotDePasse = signal('');
  readonly nouveauMotDePasse = signal('');
  readonly confirmationMotDePasse = signal('');

  readonly envoiInformations = signal(false);
  readonly messageInformations = signal<string | null>(null);
  readonly erreurInformations = signal(false);
  readonly envoiMotDePasse = signal(false);
  readonly messageMotDePasse = signal<string | null>(null);
  readonly erreurMotDePasse = signal(false);

  ngOnInit(): void {
    this.http.get<any>(`${this.urlCompte}moi/`).subscribe({
      next: (compte) => {
        this.prenom.set(compte.prenom || '');
        this.nom.set(compte.nom || '');
        this.courriel.set(compte.courriel || '');
        this.telephone.set(compte.telephone || '');
        this.adresse.set(compte.adresse || '');
        this.apercuPhoto.set(compte.adresse_photo || null);
      },
      error: () => this.afficherInformations('Impossible de charger vos informations. Vérifiez votre connexion.', true)
    });
  }

  choisirPhoto(evenement: Event): void {
    const fichier = (evenement.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    this.photo = fichier;
    this.apercuPhoto.set(URL.createObjectURL(fichier));
  }

  enregistrerInformations(): void {
    if (!this.prenom().trim() || !this.nom().trim() || !this.courriel().trim() || !this.telephone().trim()) {
      this.afficherInformations('Prénom, nom, e-mail et téléphone sont obligatoires.', true);
      return;
    }
    const donnees = new FormData();
    donnees.append('prenom', this.prenom().trim());
    donnees.append('nom', this.nom().trim());
    donnees.append('courriel', this.courriel().trim().toLowerCase());
    donnees.append('telephone', this.telephone().trim());
    if (this.avecAdresse) donnees.append('adresse', this.adresse().trim());
    if (this.avecPhoto && this.photo) donnees.append('photo', this.photo);

    this.envoiInformations.set(true);
    this.http.patch<any>(`${this.urlCompte}moi/`, donnees).subscribe({
      next: (compte) => {
        this.envoiInformations.set(false);
        this.photo = null;
        this.serviceAuth.mettreAJourUtilisateur(compte);
        this.afficherInformations('Vos informations ont été enregistrées.', false);
      },
      error: (erreur) => {
        this.envoiInformations.set(false);
        this.afficherInformations(this.lireErreur(erreur, "L'enregistrement a échoué. Vérifiez votre connexion."), true);
      }
    });
  }

  changerMotDePasse(): void {
    if (this.nouveauMotDePasse() !== this.confirmationMotDePasse()) {
      this.afficherMotDePasse('La confirmation ne correspond pas au nouveau mot de passe.', true);
      return;
    }
    this.envoiMotDePasse.set(true);
    this.http
      .post<any>(`${this.urlCompte}changer-mot-de-passe/`, {
        ancien_mot_de_passe: this.ancienMotDePasse(),
        nouveau_mot_de_passe: this.nouveauMotDePasse(),
        confirmation_mot_de_passe: this.confirmationMotDePasse()
      })
      .subscribe({
        next: (reponse) => {
          this.envoiMotDePasse.set(false);
          this.ancienMotDePasse.set('');
          this.nouveauMotDePasse.set('');
          this.confirmationMotDePasse.set('');
          this.afficherMotDePasse(reponse?.message || 'Mot de passe modifié.', false);
        },
        error: (erreur) => {
          this.envoiMotDePasse.set(false);
          this.afficherMotDePasse(this.lireErreur(erreur, 'La modification a échoué. Vérifiez votre connexion.'), true);
        }
      });
  }

  /** Message d'erreur du serveur : { message } ou { champ: [erreur] }. */
  private lireErreur(erreur: any, parDefaut: string): string {
    const corps = erreur?.error;
    if (corps?.message) return corps.message;
    if (corps && typeof corps === 'object') {
      const premiere = Object.values(corps)[0];
      if (Array.isArray(premiere) && premiere.length) return String(premiere[0]);
    }
    return parDefaut;
  }

  private afficherInformations(message: string, estErreur: boolean): void {
    this.messageInformations.set(message);
    this.erreurInformations.set(estErreur);
  }

  private afficherMotDePasse(message: string, estErreur: boolean): void {
    this.messageMotDePasse.set(message);
    this.erreurMotDePasse.set(estErreur);
  }
}
