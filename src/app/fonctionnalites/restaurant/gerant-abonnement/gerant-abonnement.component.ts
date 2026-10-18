import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceAbonnement } from '../../../socle/services/service-abonnement.service';

/**
 * Page « Mon abonnement » du restaurant : statut, échéance, prix, paiement PayTech et historique.
 * Rien n'est considéré comme payé côté frontend : après le retour de PayTech, on demande au backend
 * de vérifier auprès de PayTech, et on affiche uniquement ce que le backend renvoie.
 */
@Component({
  selector: 'app-gerant-abonnement',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './gerant-abonnement.component.html'
})
export class GerantAbonnementComponent implements OnInit, OnDestroy {
  private readonly serviceAbonnement = inject(ServiceAbonnement);
  private readonly route = inject(ActivatedRoute);
  private readonly routeur = inject(Router);

  readonly etat = this.serviceAbonnement.etat;
  readonly historique = this.serviceAbonnement.historique;

  readonly chargement = signal(true);
  readonly paiementEnCours = signal(false);
  readonly erreur = signal<string | null>(null);
  /** Message affiché au retour de la page PayTech */
  readonly retourPaiement = signal<'verification' | 'confirme' | 'en_attente' | 'annule' | null>(null);

  private minuterie: ReturnType<typeof setTimeout> | null = null;

  /** « Renouveler » si le restaurant est déjà abonné, sinon « S'abonner ». */
  readonly libelleBouton = computed(() => (this.etat()?.statut === 'ACTIF' ? 'Renouveler' : "S'abonner"));

  readonly fonctionnalites = [
    'Gestion du menu et des plats',
    'Réception et suivi des commandes',
    'Studio vidéo pour vos publications',
    'Statistiques et analyses de votre restaurant'
  ];

  ngOnInit(): void {
    const retour = this.route.snapshot.queryParamMap.get('paiement');
    if (retour === 'succes') {
      this.retourPaiement.set('verification');
      this.verifierPaiement(0);
    } else {
      if (retour === 'annule') {
        this.retourPaiement.set('annule');
      }
      this.serviceAbonnement.charger().subscribe({
        next: () => this.chargement.set(false),
        error: () => {
          this.chargement.set(false);
          this.erreur.set('Impossible de charger votre abonnement. Vérifiez votre connexion.');
        }
      });
    }
    // Nettoie l'adresse (?paiement=...) sans recharger la page
    if (retour) {
      this.routeur.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    if (this.minuterie) clearTimeout(this.minuterie);
  }

  /**
   * Le backend interroge PayTech. La notification de PayTech peut avoir quelques secondes de retard :
   * on réessaie jusqu'à 6 fois (toutes les 5 s) tant que le paiement est en attente.
   */
  private verifierPaiement(essai: number): void {
    this.serviceAbonnement.verifier().subscribe({
      next: (reponse) => {
        this.chargement.set(false);
        const dernier = reponse.historique[0];
        if (dernier?.statut === 'CONFIRME') {
          this.retourPaiement.set('confirme');
        } else if (dernier?.statut === 'EN_ATTENTE' && essai < 5) {
          this.minuterie = setTimeout(() => this.verifierPaiement(essai + 1), 5000);
        } else if (dernier?.statut === 'EN_ATTENTE') {
          this.retourPaiement.set('en_attente');
        } else {
          this.retourPaiement.set('annule');
        }
      },
      error: () => {
        this.chargement.set(false);
        this.retourPaiement.set('en_attente');
      }
    });
  }

  payer(): void {
    this.erreur.set(null);
    this.paiementEnCours.set(true);
    this.serviceAbonnement.payer().subscribe({
      next: (reponse) => {
        if (reponse.url_redirection) {
          window.location.href = reponse.url_redirection; // page de paiement sécurisée PayTech
        } else {
          this.paiementEnCours.set(false);
          this.erreur.set("Le lien de paiement n'a pas pu être créé. Réessayez.");
        }
      },
      error: (erreur) => {
        this.paiementEnCours.set(false);
        this.erreur.set(erreur?.error?.message || 'Le paiement est momentanément indisponible. Réessayez plus tard.');
      }
    });
  }

  libelleStatutPaiement(statut: string): string {
    const libelles: Record<string, string> = {
      CONFIRME: 'Confirmé',
      EN_ATTENTE: 'En attente',
      ECHOUE: 'Échoué',
      ANNULE: 'Annulé',
      REMBOURSE: 'Remboursé'
    };
    return libelles[statut] || statut;
  }

  classeStatutPaiement(statut: string): string {
    if (statut === 'CONFIRME') return 'bg-emerald-50 text-emerald-700';
    if (statut === 'EN_ATTENTE') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }
}
