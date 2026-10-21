import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

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

  protected demanderCode(): void {
    const courriel = this.courriel().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) {
      this.messageErreur.set('Veuillez saisir une adresse e-mail valide.');
      return;
    }
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
    if (!/^\d{6}$/.test(this.code().trim())) {
      this.messageErreur.set('Le code reçu par e-mail contient 6 chiffres.');
      return;
    }
    if (this.nouveauMotDePasse().length < 6) {
      this.messageErreur.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (this.nouveauMotDePasse() !== this.confirmation()) {
      this.messageErreur.set('Les deux mots de passe ne correspondent pas.');
      return;
    }
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
    this.messageInfo.set(null);
    this.etape.set('COURRIEL');
  }

  protected basculerVisibiliteMotDePasse(): void {
    this.motDePasseVisible.update((valeur) => !valeur);
  }

  private afficherErreur(erreur: any): void {
    this.chargement.set(false);
    if (erreur?.status === 0) {
      this.messageErreur.set('Impossible de contacter le serveur. Vérifiez votre connexion.');
      return;
    }
    if (erreur?.status === 429) {
      this.messageErreur.set('Trop de tentatives. Veuillez patienter une minute avant de réessayer.');
      return;
    }
    const corps = erreur?.error;
    let message = 'Une erreur est survenue. Veuillez réessayer.';
    if (corps?.message) {
      message = corps.message;
    } else if (corps && typeof corps === 'object') {
      const premierChamp = Object.keys(corps)[0];
      if (premierChamp) {
        const detail = corps[premierChamp];
        message = Array.isArray(detail) ? detail[0] : String(detail);
      }
    }
    this.messageErreur.set(message);
  }
}
