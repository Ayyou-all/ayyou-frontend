import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { ServiceRestaurantCommandesService } from '../../../socle/services/service-restaurant-commandes.service';

@Component({
  selector: 'app-validation-code',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './validation-code.component.html'
})
export class ValidationCodeComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
  private readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);
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
    if (!articles || articles.length === 0) return 'Articles de la commande';
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
   * Valide la livraison avec le code saisi et vérifie sa conformité.
   * En cas de code incorrect, la livraison n'est PAS clôturée et une alerte explicite est affichée.
   */
  /**
   * Valide la livraison avec le code saisi et vérifie sa conformité auprès du backend Django.
   * En cas de code incorrect, la livraison n'est PAS clôturée et une alerte explicite est affichée.
   */
  confirmerLivraison(): void {
    if (this.validationEnCours() || this.livraisonReussie()) return;

    const courseActive = this.serviceLivreur.courseEnCours();
    if (!courseActive) {
      this.messageErreur.set('Aucune commande active à valider.');
      return;
    }

    if (this.codeSaisi().length !== 4) {
      this.messageErreur.set('Veuillez saisir un code PIN à 4 chiffres.');
      return;
    }

    this.validationEnCours.set(true);
    this.messageErreur.set(null);

    this.serviceLivreur
      .validerCodeAsync(this.codeSaisi(), courseActive.identifiantCommande)
      .subscribe({
        next: (verification) => {
          this.validationEnCours.set(false);
          if (!verification.valide) {
            this.messageErreur.set(verification.message);
            return;
          }

          // Propagation du statut LIVRÉE à l'historique restaurant si applicable
          this.serviceRestaurant.marquerCommandeLivreeParLivreur(
            courseActive.identifiantCommande
          );

          // Affichage visuel du succès puis transition maîtrisée
          this.livraisonReussie.set(true);
          setTimeout(() => {
            this.routeur.navigate(['/livreur/fin-livraison']);
          }, 1200);
        },
        error: (err) => {
          this.validationEnCours.set(false);
          const detail =
            err.error?.detail ||
            err.error?.message ||
            'Code PIN de confirmation incorrect. Demandez le code affiché sur l\'application du client.';
          this.messageErreur.set(detail);
        }
      });
  }

  /**
   * Retourne au trajet client.
   */
  retourner(): void {
    this.routeur.navigate(['/livreur/trajet-client']);
  }
}
