import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { SignalerProblemeComponent } from '../signaler-probleme/signaler-probleme.component';

@Component({
  selector: 'app-validation-code',
  standalone: true,
  imports: [CommonModule, RouterModule, SignalerProblemeComponent],
  templateUrl: './validation-code.component.html'
})
export class ValidationCodeComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);

  // Chiffres saisis par le livreur
  readonly codeSaisi = signal<string>('');

  // État de validation en cours pour bloquer les clics multiples
  readonly validationEnCours = signal<boolean>(false);

  // État de succès de la livraison
  readonly livraisonReussie = signal<boolean>(false);

  // Message d'erreur si code invalide
  readonly messageErreur = signal<string | null>(null);

  // Boîtes d'affichage des 4 chiffres
  readonly casesCode = computed(() => {
    const code = this.codeSaisi();
    return [
      code[0] || null,
      code[1] || null,
      code[2] || null,
      code[3] || null
    ];
  });

  // Résumé réel des articles commandés
  readonly articlesResume = computed(() => {
    const articles = this.serviceLivreur.courseEnCours()?.articles;
    if (!articles || articles.length === 0) return '';
    return articles.map((a) => `${a.quantite}x ${a.nom}`).join(', ');
  });

  // Clavier numérique
  readonly touchesClavier = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'EFFACER']
  ];

  /**
   * Appui sur une touche numérique.
   */
  appuyerTouche(touche: string): void {
    if (this.validationEnCours() || this.livraisonReussie()) return;
    this.messageErreur.set(null);
    if (!touche) return;

    if (touche === 'EFFACER') {
      const codeActuel = this.codeSaisi();
      if (codeActuel.length > 0) {
        this.codeSaisi.set(codeActuel.slice(0, -1));
      }
      return;
    }

    if (this.codeSaisi().length < 4) {
      this.codeSaisi.set(this.codeSaisi() + touche);
    }
  }

  /**
   * Envoie le PIN au serveur, seul juge du code (nombre d'essais limité).
   * La livraison n'est terminée que si le serveur répond OK.
   */
  confirmerLivraison(): void {
    if (this.validationEnCours() || this.livraisonReussie()) return;
    if (this.codeSaisi().length !== 4) {
      this.messageErreur.set('Veuillez saisir un code PIN à 4 chiffres.');
      return;
    }
    this.validationEnCours.set(true);
    this.messageErreur.set(null);
    this.serviceLivreur.validerCode(this.codeSaisi()).subscribe({
      next: () => {
        this.validationEnCours.set(false);
        this.livraisonReussie.set(true);
        this.routeur.navigate(['/livreur/fin-livraison']);
      },
      error: (erreur) => {
        this.validationEnCours.set(false);
        this.codeSaisi.set('');
        if (erreur?.error?.code === 'livraison_bloquee') this.serviceLivreur.livraisonBloquee.set(true);
        this.messageErreur.set(erreur?.error?.message || 'Validation impossible. Vérifiez votre connexion et réessayez.');
      }
    });
  }

  retourAccueil(): void {
    this.routeur.navigate(['/livreur']);
  }

  /**
   * Retourne au trajet client.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur/trajet-client']);
  }
}
