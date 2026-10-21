import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoleUtilisateur } from '../../../socle/modeles/utilisateur.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import { ErreursChamps, estCourrielValide, lireErreursServeur } from '../../../socle/outils/erreurs-formulaire';

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
  // Erreurs affichées sous chaque champ (champ entouré en rouge)
  protected readonly erreursChamps = signal<ErreursChamps>({});

  protected erreur(champ: string): string | undefined {
    return this.erreursChamps()[champ];
  }

  protected effacerErreur(champ: string): void {
    if (!this.erreursChamps()[champ]) return;
    const { [champ]: _, ...autres } = this.erreursChamps();
    this.erreursChamps.set(autres);
    this.serviceAuthentification.messageErreur.set(null);
  }

  protected basculerVisibiliteMotDePasse(): void {
    this.motDePasseVisible.update((valeur) => !valeur);
  }

  protected soumettreConnexion(): void {
    const courriel = this.courrielSaisi().trim();
    const motDePasse = this.motDePasseSaisi().trim();

    // Le champ accepte l'e-mail ou le numéro de téléphone
    const erreurs: ErreursChamps = {};
    if (!courriel) {
      erreurs['courriel'] = 'Indiquez votre adresse e-mail.';
    } else if (courriel.includes('@') && !estCourrielValide(courriel)) {
      erreurs['courriel'] = 'Adresse e-mail invalide (ex. : fatou@gmail.com).';
    }
    if (!motDePasse) erreurs['motDePasse'] = 'Indiquez votre mot de passe.';
    this.erreursChamps.set(erreurs);
    if (Object.keys(erreurs).length > 0) {
      this.serviceAuthentification.messageErreur.set(null);
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
          const { message, champs } = lireErreursServeur(
            erreur,
            { identifiant: 'courriel', mot_de_passe: 'motDePasse' },
            'Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.'
          );
          // Identifiants refusés : les deux champs passent en rouge, le message reste dans le bandeau
          this.erreursChamps.set(
            erreur?.error?.code === 'identifiants_invalides' ? { courriel: ' ', motDePasse: ' ' } : champs
          );
          this.serviceAuthentification.messageErreur.set(message);
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
