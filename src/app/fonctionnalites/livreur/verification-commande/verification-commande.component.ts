import { CommonModule } from '@angular/common';
import { MenuLivreurComponent } from '../../../partages/composants/menu-livreur/menu-livreur.component';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { SignalerProblemeComponent } from '../signaler-probleme/signaler-probleme.component';

/**
 * Au comptoir du restaurant : le livreur vérifie chaque article (enregistré par le serveur),
 * attend que le restaurant confirme la remise, puis part chez le client.
 */
@Component({
  selector: 'app-verification-commande',
  standalone: true,
  imports: [MenuLivreurComponent, CommonModule, RouterModule, SignalerProblemeComponent],
  templateUrl: './verification-commande.component.html'
})
export class VerificationCommandeComponent implements OnInit, OnDestroy {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);
  readonly departEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);
  private intervalleRemise?: any;

  ngOnInit(): void {
    // Tant que le restaurant n'a pas confirmé la remise, on relit la course toutes les 5 secondes.
    this.intervalleRemise = setInterval(() => {
      if (!this.serviceLivreur.remiseConfirmee()) this.serviceLivreur.chargerMissionEnCours();
    }, 5000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalleRemise);
  }

  basculerArticle(index: number): void {
    this.serviceLivreur.basculerArticleVerifie(index);
  }

  /** Démarre le trajet : l'écran change seulement si le serveur accepte le départ. */
  confirmerRecuperation(): void {
    this.departEnCours.set(true);
    this.messageErreur.set(null);
    this.serviceLivreur.partirVersClient().subscribe({
      next: () => {
        this.departEnCours.set(false);
        this.routeur.navigate(['/livreur/trajet-client']);
      },
      error: (erreur) => {
        this.departEnCours.set(false);
        this.messageErreur.set(erreur?.error?.message || 'Départ impossible. Vérifiez votre connexion et réessayez.');
      }
    });
  }

  retourAccueil(): void {
    this.routeur.navigate(['/livreur']);
  }

  retourner(): void {
    this.routeur.navigate(['/livreur/navigation']);
  }
}
