import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface StatistiquesAbonnements {
  prix_fcfa: number;
  total_restaurants: number;
  en_essai: number;
  abonnes: number;
  suspendus: number;
  abonnements_actifs: number;
  abonnements_expires: number;
  nombre_paiements: number;
  revenus_aujourd_hui: number;
  revenus_semaine: number;
  revenus_mois: number;
  revenus_annee: number;
  revenus_cumules: number;
  montant_moyen: number;
}

interface PaiementResume {
  id: number;
  restaurant: string;
  montant_fcfa: number;
  statut: string;
  methode_paiement: string;
  date_confirmation: string | null;
  date_fin_periode: string | null;
}

interface AlerteAbonnement {
  id: number;
  titre: string;
  message: string;
  date_creation: string;
}

interface LigneRestaurant {
  id: number;
  nom: string;
  statut_abonnement: 'ESSAI' | 'ACTIF' | 'SUSPENDU';
  date_abonnement: string | null;
  date_expiration: string | null;
  jours_restants: number;
  total_paye_fcfa: number;
  dernier_paiement: { date: string; montant_fcfa: number; statut: string } | null;
}

/**
 * Abonnements des restaurants (modèle économique) : indicateurs, revenus, derniers paiements,
 * alertes et liste filtrable. Tous les chiffres viennent du backend (paiements CONFIRMÉS uniquement).
 */
@Component({
  selector: 'app-abonnements-admin',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './abonnements-admin.component.html'
})
export class AbonnementsAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/administration/abonnements/`;

  readonly statistiques = signal<StatistiquesAbonnements | null>(null);
  readonly derniersPaiements = signal<PaiementResume[]>([]);
  readonly alertes = signal<AlerteAbonnement[]>([]);
  readonly erreur = signal<string | null>(null);

  // Liste des restaurants
  readonly restaurants = signal<LigneRestaurant[]>([]);
  readonly chargementListe = signal(true);
  readonly page = signal(1);
  readonly nombrePages = signal(1);
  readonly recherche = signal('');
  readonly filtreStatut = signal('');
  readonly filtrePeriode = signal('');
  private delaiRecherche: ReturnType<typeof setTimeout> | null = null;

  readonly statuts = [
    { valeur: '', libelle: 'Tous les statuts' },
    { valeur: 'ACTIF', libelle: 'Abonnés' },
    { valeur: 'ESSAI', libelle: 'En essai' },
    { valeur: 'SUSPENDU', libelle: 'Suspendus' }
  ];
  readonly periodes = [
    { valeur: '', libelle: 'Toutes périodes' },
    { valeur: 'jour', libelle: "Payé aujourd'hui" },
    { valeur: 'semaine', libelle: 'Payé cette semaine' },
    { valeur: 'mois', libelle: 'Payé ce mois' },
    { valeur: 'annee', libelle: 'Payé cette année' }
  ];

  ngOnInit(): void {
    this.http.get<any>(`${this.url}statistiques/`).subscribe({
      next: (reponse) => {
        this.statistiques.set(reponse.statistiques);
        this.derniersPaiements.set(reponse.derniers_paiements);
        this.alertes.set(reponse.alertes);
      },
      error: () => this.erreur.set('Impossible de charger les statistiques des abonnements. Vérifiez votre connexion.')
    });
    this.chargerRestaurants();
  }

  chargerRestaurants(): void {
    this.chargementListe.set(true);
    let parametres = new HttpParams().set('page', this.page());
    if (this.recherche().trim()) parametres = parametres.set('recherche', this.recherche().trim());
    if (this.filtreStatut()) parametres = parametres.set('statut', this.filtreStatut());
    if (this.filtrePeriode()) parametres = parametres.set('periode', this.filtrePeriode());

    this.http.get<any>(this.url, { params: parametres }).subscribe({
      next: (reponse) => {
        this.restaurants.set(reponse.results);
        this.nombrePages.set(Math.max(1, Math.ceil(reponse.count / 20)));
        this.chargementListe.set(false);
      },
      error: () => {
        this.chargementListe.set(false);
        this.erreur.set('Impossible de charger la liste des restaurants.');
      }
    });
  }

  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
    if (this.delaiRecherche) clearTimeout(this.delaiRecherche);
    this.delaiRecherche = setTimeout(() => this.appliquerFiltres(), 350);
  }

  appliquerFiltres(): void {
    this.page.set(1);
    this.chargerRestaurants();
  }

  allerPage(page: number): void {
    if (page < 1 || page > this.nombrePages()) return;
    this.page.set(page);
    this.chargerRestaurants();
  }

  libelleStatut(statut: string): string {
    const libelles: Record<string, string> = { ESSAI: 'Essai gratuit', ACTIF: 'Abonné', SUSPENDU: 'Suspendu' };
    return libelles[statut] || statut;
  }

  classeStatut(statut: string): string {
    if (statut === 'ACTIF') return 'bg-emerald-50 text-emerald-700';
    if (statut === 'ESSAI') return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-[#E51824]';
  }

  libellePaiement(statut: string): string {
    const libelles: Record<string, string> = {
      CONFIRME: 'Confirmé',
      EN_ATTENTE: 'En attente',
      ECHOUE: 'Échoué',
      ANNULE: 'Annulé',
      REMBOURSE: 'Remboursé'
    };
    return libelles[statut] || statut;
  }
}
