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

  // Valeurs du formulaire réactives (Connexion sécurisée par e-mail)
  protected readonly courrielSaisi = signal<string>('fatou.diop@ayyou.sn');
  protected readonly motDePasseSaisi = signal<string>('AYYOU2026!');
  protected readonly motDePasseVisible = signal<boolean>(false);
  protected readonly afficherComptesDemo = signal<boolean>(false);

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
        error: () => {
          this.serviceAuthentification.messageErreur.set(
            'Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.'
          );
        }
      });
  }

  protected connexionRapideDemonstration(role: RoleUtilisateur): void {
    this.serviceAuthentification.connecterAvecRolePredefini(role).subscribe({
      next: (utilisateur) => {
        this.redirigerSelonRole(utilisateur.role);
      }
    });
  }

  private redirigerSelonRole(role: RoleUtilisateur): void {
    switch (role) {
      case 'RESTAURANT':
        this.routeur.navigate(['/restaurant']);
        break;
      case 'VENDEUR':
        this.routeur.navigate(['/vendeur']);
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
