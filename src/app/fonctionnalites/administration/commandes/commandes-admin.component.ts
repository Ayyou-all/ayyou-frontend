import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

export type OngletStatutCommande = 'TOUS' | 'EN_ATTENTE' | 'EN_COURS' | 'LIVREES' | 'ANNULEES' | 'SANS_LIVREUR' | 'A_REMBOURSER';
export type StatutCommandeAdmin = 'EN_ATTENTE' | 'EN_COURS' | 'LIVREE' | 'ANNULEE';
export type ActionSupport = 'annuler' | 'rembourser' | 'assigner-livreur' | 'retirer-livreur';

export interface ArticleCommandeAdmin {
  nom: string;
  quantite: number;
  prixUnitaire: number;
}

export interface EtapeHistorique {
  date: string;
  ancienStatut: string;
  nouveauStatut: string;
  auteur: string;
  commentaire: string;
}

/** Commande telle que renvoyée par GET /api/administration/commandes/ (aucune valeur inventée). */
export interface CommandeAdministration {
  id: number;
  identifiantCommande: string;
  clientNom: string;
  clientPhoto: string | null;
  clientTelephone: string;
  restaurantNom: string;
  restaurantAdresse: string;
  coursierNom: string | null;
  coursierPhoto: string | null;
  coursierTelephone: string | null;
  estCoursierAssigne: boolean;
  totalMontant: string;
  totalValeurNumerique: number;
  sousTotalFcfa: number;
  fraisLivraisonFcfa: number;
  statut: StatutCommandeAdmin;
  statutDetaille: string;
  libelleStatut: string;
  libelleStatutDetaille: string;
  classeStatut: string;
  dateAffichage: string;
  adresseLivraison: string;
  repereLivraison: string;
  motif: string;
  methodePaiement: string;
  paiementConfirme: boolean;
  paiementARembourser: boolean;
  remiseConfirmee: boolean;
  articles: ArticleCommandeAdmin[];
  historique: EtapeHistorique[];
}

/**
 * Supervision des commandes par le support.
 * Pagination, filtres et recherche sont faits par le serveur ; chaque action est confirmée
 * par le serveur puis la commande est rechargée (succès ou erreur réelle affichés).
 */
@Component({
  selector: 'app-commandes-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './commandes-admin.component.html'
})
export class CommandesAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = `${environment.apiUrl}/administration/`;

  readonly ongletActif = signal<OngletStatutCommande>('TOUS');
  readonly rechercheTexte = signal<string>('');
  readonly dateSelectionnee = signal<string>(''); // AAAA-MM-JJ, vide = toutes les dates
  readonly pageActuelle = signal<number>(1);
  readonly nombrePagesTotal = signal<number>(1);
  readonly nombreTotal = signal<number>(0);

  readonly commandesAffichees = signal<CommandeAdministration[]>([]);
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);
  readonly notificationSucces = signal<string | null>(null);

  readonly statsKpi = signal({ enAttente: 0, enCours: 0, livrees: 0, annulees: 0, aRembourser: 0 });

  // Détail et actions
  readonly commandeEnDetail = signal<CommandeAdministration | null>(null);
  readonly modaleDetailOuverte = signal<boolean>(false);
  readonly livreurs = signal<any[]>([]);
  readonly livreurChoisi = signal<string>('');
  readonly motifAction = signal<string>('');
  readonly actionEnCours = signal<boolean>(false);
  readonly erreurAction = signal<string | null>(null);

  private minuterieRecherche?: any;

  ngOnInit(): void {
    this.chargerCommandes();
    this.chargerStatistiques();
    const intervalle = setInterval(() => {
      this.chargerCommandes(true);
      this.chargerStatistiques();
    }, 15000);
    this.destroyRef.onDestroy(() => clearInterval(intervalle));
  }

  chargerStatistiques(): void {
    this.http.get<any>(`${this.url}statistiques/`).subscribe({
      next: (s) =>
        this.statsKpi.set({
          enAttente: s.commandesEnAttente ?? 0,
          enCours: s.commandesActives ?? 0,
          livrees: s.commandesLivrees ?? 0,
          annulees: s.commandesAnnulees ?? 0,
          aRembourser: s.commandesARembourser ?? 0
        }),
      error: () => {
        // Les indicateurs sont secondaires : l'erreur de la liste suffit à prévenir.
      }
    });
  }

  chargerCommandes(silencieux: boolean = false): void {
    if (!silencieux) this.chargementEnCours.set(true);
    const params: Record<string, string> = { statut: this.ongletActif(), page: String(this.pageActuelle()) };
    if (this.rechercheTexte().trim()) params['recherche'] = this.rechercheTexte().trim();
    if (this.dateSelectionnee()) params['date'] = this.dateSelectionnee();

    this.http.get<any>(`${this.url}commandes/`, { params }).subscribe({
      next: (reponse) => {
        this.commandesAffichees.set(reponse.results || []);
        this.nombreTotal.set(reponse.count || 0);
        this.nombrePagesTotal.set(Math.max(1, Math.ceil((reponse.count || 0) / 20)));
        this.messageErreur.set(null);
        this.chargementEnCours.set(false);
        // Garder la fenêtre de détail à jour si elle est ouverte
        const ouverte = this.commandeEnDetail();
        const aJour = ouverte && (reponse.results || []).find((c: CommandeAdministration) => c.id === ouverte.id);
        if (aJour) this.commandeEnDetail.set(aJour);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.messageErreur.set('Impossible de charger les commandes. Vérifiez votre connexion.');
      }
    });
  }

  changerOnglet(onglet: OngletStatutCommande): void {
    this.ongletActif.set(onglet);
    this.pageActuelle.set(1);
    this.chargerCommandes();
  }

  changerRecherche(texte: string): void {
    this.rechercheTexte.set(texte);
    this.pageActuelle.set(1);
    clearTimeout(this.minuterieRecherche);
    this.minuterieRecherche = setTimeout(() => this.chargerCommandes(), 400);
  }

  changerDate(date: string): void {
    this.dateSelectionnee.set(date);
    this.pageActuelle.set(1);
    this.chargerCommandes();
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
      this.chargerCommandes();
    }
  }

  // ---------------------------------------------------------------------------
  // Détail et actions du support
  // ---------------------------------------------------------------------------

  ouvrirDetailCommande(commande: CommandeAdministration): void {
    this.commandeEnDetail.set(commande);
    this.modaleDetailOuverte.set(true);
    this.motifAction.set('');
    this.livreurChoisi.set('');
    this.erreurAction.set(null);
    if (commande.statutDetaille === 'PRETE_POUR_RETRAIT' && !commande.estCoursierAssigne) this.chargerLivreursDisponibles();
  }

  fermerDetailCommande(): void {
    this.modaleDetailOuverte.set(false);
    this.commandeEnDetail.set(null);
  }

  /** Livreurs validés et en ligne (seuls ceux-là peuvent recevoir une course). */
  private chargerLivreursDisponibles(): void {
    this.http.get<any>(`${this.url}livreurs/`, { params: { statut: 'ACTIF' } }).subscribe({
      next: (reponse) => {
        const liste = Array.isArray(reponse) ? reponse : reponse?.results || [];
        this.livreurs.set(liste.filter((l: any) => l.disponibilite === 'EN_LIGNE'));
      },
      error: () => this.livreurs.set([])
    });
  }

  peutAnnuler(c: CommandeAdministration): boolean {
    return !['LIVREE', 'REFUSEE_ANNULEE', 'ECHEC_LIVRAISON', 'EN_LIVRAISON', 'ARRIVE_CLIENT'].includes(c.statutDetaille);
  }

  peutRetirerLivreur(c: CommandeAdministration): boolean {
    return c.estCoursierAssigne && ['COURSE_ASSIGNEE', 'EN_VERIFICATION'].includes(c.statutDetaille) && !c.remiseConfirmee;
  }

  executerAction(action: ActionSupport): void {
    const commande = this.commandeEnDetail();
    if (!commande) return;
    const corps: Record<string, unknown> = {};
    if (action === 'annuler' || action === 'retirer-livreur') {
      if (!this.motifAction().trim()) {
        this.erreurAction.set('Indiquez un motif.');
        return;
      }
      corps['motif'] = this.motifAction().trim();
    }
    if (action === 'assigner-livreur') corps['livreur_id'] = Number(this.livreurChoisi());

    this.actionEnCours.set(true);
    this.erreurAction.set(null);
    this.http.post<CommandeAdministration>(`${this.url}commandes/${commande.id}/${action}/`, corps).subscribe({
      next: (miseAJour) => {
        this.actionEnCours.set(false);
        this.commandeEnDetail.set(miseAJour);
        this.motifAction.set('');
        this.afficherSucces(`Action effectuée sur ${miseAJour.identifiantCommande}.`);
        this.chargerCommandes(true);
        this.chargerStatistiques();
      },
      error: (erreur) => {
        this.actionEnCours.set(false);
        this.erreurAction.set(erreur?.error?.message || "L'action a échoué. Vérifiez votre connexion et réessayez.");
      }
    });
  }

  private afficherSucces(message: string): void {
    this.notificationSucces.set(message);
    setTimeout(() => this.notificationSucces.set(null), 3500);
  }
}
