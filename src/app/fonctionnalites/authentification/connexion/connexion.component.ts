import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoleUtilisateur } from '../../../socle/modeles/utilisateur.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

export interface IndicatifPays {
  code: string;
  indicatif: string;
  pays: string;
  drapeau: string;
}

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './connexion.component.html',
  styleUrl: './connexion.component.css'
})
export class ConnexionComponent {
  protected readonly serviceAuthentification = inject(ServiceAuthentification);
  private readonly routeur = inject(Router);

  // Valeurs du formulaire réactives (Saisie réelle par l'utilisateur)
  protected readonly courrielSaisi = signal<string>('');
  protected readonly motDePasseSaisi = signal<string>('');
  protected readonly motDePasseVisible = signal<boolean>(false);

  protected basculerVisibiliteMotDePasse(): void {
    this.motDePasseVisible.update((valeur) => !valeur);
  }

  protected soumettreConnexion(): void {
    const courriel = this.courrielSaisi().trim();
    const motDePasse = this.motDePasseSaisi().trim();

    if (!courriel || !motDePasse) {
      this.serviceAuthentification.messageErreur.set(
        'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
      );
      return;
    }

    this.serviceAuthentification
      .connecter({
        courriel,
        motDePasse,
        seSouvenirDeMoi: true
      })
      .subscribe({
        next: (utilisateur) => {
          this.redirigerSelonRole(utilisateur.role);
        },
        error: (erreur) => {
          if (erreur?.status === 0) {
            this.serviceAuthentification.messageErreur.set(
              'Impossible de contacter le serveur Django. Veuillez vérifier que le backend est démarré sur le port 8000.'
            );
          } else if (erreur?.status === 429) {
            this.serviceAuthentification.messageErreur.set(
              'Trop de tentatives de connexion. Veuillez patienter une minute avant de réessayer.'
            );
          } else {
            const message =
              erreur?.error?.message ||
              erreur?.error?.detail ||
              'Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.';
            this.serviceAuthentification.messageErreur.set(message);
          }
        }
      });
  }

  private redirigerSelonRole(role: RoleUtilisateur): void {
    switch (role) {
      case 'RESTAURANT':
        this.routeur.navigate(['/gerant']);
        break;
      case 'LIVREUR':
        this.routeur.navigate(['/livreur']);
        break;
      case 'ADMINISTRATEUR':
        this.routeur.navigate(['/administration']);
        break;
      case 'CLIENT':
      default:
        this.routeur.navigate(['/accueil']);
        break;
    }
  }
}
