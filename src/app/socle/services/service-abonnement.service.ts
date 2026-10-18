import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** État de l'abonnement du restaurant, calculé par le backend (le frontend ne fait que l'afficher). */
export interface EtatAbonnement {
  statut: 'ESSAI' | 'ACTIF' | 'SUSPENDU';
  date_fin_essai: string | null;
  date_fin_abonnement: string | null;
  date_echeance: string | null;
  jours_restants: number;
  prix_fcfa: number;
}

export interface PaiementAbonnement {
  id: number;
  reference: string;
  montant_fcfa: number;
  statut: 'EN_ATTENTE' | 'CONFIRME' | 'ECHOUE' | 'ANNULE' | 'REMBOURSE';
  methode_paiement: string;
  date_creation: string;
  date_confirmation: string | null;
  date_debut_periode: string | null;
  date_fin_periode: string | null;
}

interface ReponseAbonnement {
  abonnement: EtatAbonnement;
  historique: PaiementAbonnement[];
}

/**
 * Abonnement mensuel du restaurant (14 jours d'essai puis 15 000 FCFA / mois via PayTech).
 * Utilisé par la bannière du layout gérant, la page « Mon abonnement » et la garde des pages gérant.
 */
@Injectable({ providedIn: 'root' })
export class ServiceAbonnement {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/paiements/abonnement/`;

  readonly etat = signal<EtatAbonnement | null>(null);
  readonly historique = signal<PaiementAbonnement[]>([]);

  /** Recharge l'état depuis le backend. */
  charger(): Observable<ReponseAbonnement> {
    return this.http.get<ReponseAbonnement>(this.url).pipe(tap((reponse) => this.memoriser(reponse)));
  }

  /** Retour de PayTech : le backend demande le statut réel à PayTech avant de répondre. */
  verifier(): Observable<ReponseAbonnement> {
    return this.http.post<ReponseAbonnement>(`${this.url}verifier/`, {}).pipe(tap((reponse) => this.memoriser(reponse)));
  }

  /** Demande le lien de paiement PayTech (l'abonnement n'est activé qu'après confirmation de PayTech). */
  payer(): Observable<{ reference: string; url_redirection: string }> {
    return this.http.post<{ reference: string; url_redirection: string }>(`${this.url}payer/`, {});
  }

  private memoriser(reponse: ReponseAbonnement): void {
    this.etat.set(reponse.abonnement);
    this.historique.set(reponse.historique);
  }
}
