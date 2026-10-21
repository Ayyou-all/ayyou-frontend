import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import {
  ErreursChamps,
  estCourrielValide,
  lireErreursServeur,
  MESSAGE_CHAMPS_EN_ROUGE
} from '../../../socle/outils/erreurs-formulaire';

type EtapeReinitialisation = 'COURRIEL' | 'NOUVEAU_MOT_DE_PASSE' | 'TERMINE';

/**
 * Mot de passe oublié en deux étapes :
 * 1. l'utilisateur saisit son e-mail et reçoit un code à 6 chiffres ;
 * 2. il saisit ce code et choisit un nouveau mot de passe.
 */
@Component({
  selector: 'app-reinitialisation-mot-de-passe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reinitialisation-mot-de-passe.component.html'
})
export class ReinitialisationMotDePasseComponent {
  private readonly serviceAuthentification = inject(ServiceAuthentification);

  protected readonly etape = signal<EtapeReinitialisation>('COURRIEL');
  protected readonly courriel = signal<string>('');
  protected readonly code = signal<string>('');
  protected readonly nouveauMotDePasse = signal<string>('');
  protected readonly confirmation = signal<string>('');
  protected readonly motDePasseVisible = signal<boolean>(false);
  protected readonly dureeValiditeMinutes = signal<number>(10);

  protected readonly chargement = signal<boolean>(false);
  protected readonly messageErreur = signal<string | null>(null);
  protected readonly messageInfo = signal<string | null>(null);
  // Erreurs affichées sous chaque champ (champ entouré en rouge)
  protected readonly erreursChamps = signal<ErreursChamps>({});

  protected erreur(champ: string): string | undefined {
    return this.erreursChamps()[champ];
  }

  protected effacerErreur(champ: string): void {
    if (!this.erreursChamps()[champ]) return;
    const { [champ]: _, ...autres } = this.erreursChamps();
    this.erreursChamps.set(autres);
    if (Object.keys(autres).length === 0) this.messageErreur.set(null);
  }

  private afficherErreursChamps(erreurs: ErreursChamps): boolean {
    this.erreursChamps.set(erreurs);
    const messages = Object.values(erreurs);
    this.messageErreur.set(messages.length === 0 ? null : messages.length === 1 ? messages[0] : MESSAGE_CHAMPS_EN_ROUGE);
    return messages.length > 0;
  }

  protected demanderCode(): void {
    const courriel = this.courriel().trim();
    if (this.afficherErreursChamps(
      !courriel ? { courriel: "Indiquez l'adresse e-mail de votre compte." }
        : !estCourrielValide(courriel) ? { courriel: 'Adresse e-mail invalide (ex. : fatou@gmail.com).' } : {}
    )) return;
    this.chargement.set(true);
    this.messageErreur.set(null);
    this.serviceAuthentification.demanderReinitialisationMotDePasse(courriel).subscribe({
      next: (reponse) => {
        this.chargement.set(false);
        this.dureeValiditeMinutes.set(reponse.expiration_minutes);
        this.messageInfo.set(reponse.message);
        this.code.set('');
        this.etape.set('NOUVEAU_MOT_DE_PASSE');
      },
      error: (erreur) => this.afficherErreur(erreur)
    });
  }

  protected enregistrerNouveauMotDePasse(): void {
    const erreurs: ErreursChamps = {};
    if (!/^\d{6}$/.test(this.code().trim())) erreurs['code'] = 'Le code reçu par e-mail contient 6 chiffres.';
    if (this.nouveauMotDePasse().length < 6) {
      erreurs['nouveau_mot_de_passe'] = 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    if (!this.confirmation()) erreurs['confirmation_mot_de_passe'] = 'Retapez le nouveau mot de passe.';
    else if (this.nouveauMotDePasse() !== this.confirmation()) {
      erreurs['confirmation_mot_de_passe'] = 'Les deux mots de passe ne sont pas identiques.';
    }
    if (this.afficherErreursChamps(erreurs)) return;
    this.chargement.set(true);
    this.messageErreur.set(null);
    this.serviceAuthentification
      .reinitialiserMotDePasse(this.courriel(), this.code(), this.nouveauMotDePasse(), this.confirmation())
      .subscribe({
        next: () => {
          this.chargement.set(false);
          this.etape.set('TERMINE');
        },
        error: (erreur) => this.afficherErreur(erreur)
      });
  }

  protected renvoyerCode(): void {
    this.messageInfo.set(null);
    this.demanderCode();
  }

  protected changerAdresse(): void {
    this.messageErreur.set(null);
    this.erreursChamps.set({});
    this.messageInfo.set(null);
    this.etape.set('COURRIEL');
  }

  protected basculerVisibiliteMotDePasse(): void {
    this.motDePasseVisible.update((valeur) => !valeur);
  }

  private afficherErreur(erreur: any): void {
    this.chargement.set(false);
    const { message, champs } = lireErreursServeur(erreur);
    // Code expiré ou faux : le champ du code passe en rouge
    if (['code_expire', 'code_incorrect'].includes(erreur?.error?.code)) champs['code'] = message;
    this.erreursChamps.set(champs);
    this.messageErreur.set(message);
  }
}
