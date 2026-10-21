import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

export type OngletCategorieRestaurant =
  | 'TOUS'
  | 'FAST_FOOD'
  | 'LOCAL'
  | 'ASIATIQUE'
  | 'DESSERTS';

export type StatutRestaurantAdmin = 'ACTIF' | 'EN_ATTENTE' | 'INACTIF';

export interface PlatMenuApercu {
  nom: string;
  description: string;
  prix: number;
}

export interface RestaurantAdministration {
  identifiant: string;
  nom: string;
  codeId: string; // ex: 'ID: REST-2'
  categorie: string; // ex: 'Cuisine Sénégalaise', 'Fast Food', etc.
  tagCategorieFiltre: 'FAST_FOOD' | 'LOCAL' | 'ASIATIQUE' | 'DESSERTS' | 'AUTRE';
  localisation: string; // ex: 'Plateau, Dakar' // ex: 4.8
  statut: StatutRestaurantAdmin;
  logoIcone: string;
  fondLogo: string;
  telephone: string;
  adresseLogo?: string | null;
  adresseCouverture?: string | null;
  totalCommandes?: number;
  platsMenu?: PlatMenuApercu[];
}

@Component({
  selector: 'app-restaurants-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './restaurants-admin.component.html'
})
export class RestaurantsAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  // Onglet catégorie
  readonly ongletActif = signal<OngletCategorieRestaurant>('TOUS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 6;

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);
  readonly chargementEnCours = signal<boolean>(false);

  // Modale de consultation du menu
  readonly restaurantEnConsultation = signal<RestaurantAdministration | null>(null);
  readonly modaleMenuOuverte = signal<boolean>(false);

  // Modale d'édition
  readonly restaurantEnEdition = signal<RestaurantAdministration | null>(null);
  // Motif obligatoire quand le restaurant est suspendu : il est envoyé par e-mail au gérant
  readonly motifSuspension = signal<string>('');
  readonly modaleEditionOuverte = signal<boolean>(false);


  // Données dynamiques des restaurants
  readonly listeRestaurants = signal<RestaurantAdministration[]>([]);

  // Statistiques KPI dynamiques calculées depuis les données réelles
  readonly statsKpi = computed(() => {
    const restos = this.listeRestaurants();
    const nbActifs = restos.filter((r) => r.statut === 'ACTIF').length;
    const nbEnAttente = restos.filter((r) => r.statut === 'EN_ATTENTE').length;
    const nbInactifs = restos.filter((r) => r.statut === 'INACTIF').length;

    return {
      actifs: { valeur: nbActifs, evolution: '' },
      enAttente: { valeur: nbEnAttente, evolution: '' },
      inactifs: { valeur: nbInactifs, evolution: '' },
      commandesTotales: { valeur: restos.reduce((total, r) => total + (r.totalCommandes ?? 0), 0) }
    };
  });

  ngOnInit(): void {
    this.chargerRestaurants();
  }

  chargerRestaurants(): void {
    this.chargementEnCours.set(true);
    this.http.get<any>(`${environment.apiUrl}/administration/etablissements/`).subscribe({
      next: (donnees) => {
        const items: any[] = Array.isArray(donnees) ? donnees : (donnees?.results || []);
        const liste: RestaurantAdministration[] = items.map((e: any) => {
          const cat = e.specialite || 'Restauration';
          let tag: 'FAST_FOOD' | 'LOCAL' | 'ASIATIQUE' | 'DESSERTS' | 'AUTRE' = 'AUTRE';
          const catLower = cat.toLowerCase();
          if (catLower.includes('burger') || catLower.includes('fast') || catLower.includes('pizza')) {
            tag = 'FAST_FOOD';
          } else if (catLower.includes('local') || catLower.includes('senegal') || catLower.includes('thieb') || catLower.includes('afric')) {
            tag = 'LOCAL';
          } else if (catLower.includes('asia') || catLower.includes('sushi') || catLower.includes('chinois')) {
            tag = 'ASIATIQUE';
          } else if (catLower.includes('boulang') || catLower.includes('patiss') || catLower.includes('dessert')) {
            tag = 'DESSERTS';
          }

          let statut: StatutRestaurantAdmin = 'INACTIF';
          if (e.statut_validation === 'ACTIF') {
            statut = 'ACTIF';
          } else if (e.statut_validation === 'EN_ATTENTE_VALIDATION') {
            statut = 'EN_ATTENTE';
          }

          return {
            identifiant: String(e.id),
            nom: e.nom,
            codeId: `ID: REST-${e.id}`,
            categorie: cat,
            tagCategorieFiltre: tag,
            localisation: e.quartier_ville || e.adresse || '',
            statut: statut,
            logoIcone: 'fa-solid fa-utensils',
            fondLogo: statut === 'ACTIF' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
            telephone: e.telephone || e.telephoneGerant || '',
            adresseLogo: e.adresse_logo || e.logo || null,
            adresseCouverture: e.adresse_couverture || e.couverture || null,
            totalCommandes: e.totalCommandes || 0,
            platsMenu: e.platsMenu || []
          };
        });

        this.listeRestaurants.set(liste);
        this.chargementEnCours.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement restaurants:', err);
        this.chargementEnCours.set(false);
      }
    });
  }

  // Filtrage selon catégorie et recherche
  readonly restaurantsFiltres = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();

    return this.listeRestaurants().filter((r) => {
      // Filtre catégorie
      if (onglet === 'FAST_FOOD' && r.tagCategorieFiltre !== 'FAST_FOOD' && !r.categorie.toLowerCase().includes('fast food')) {
        return false;
      }
      if (onglet === 'LOCAL' && r.tagCategorieFiltre !== 'LOCAL' && !r.categorie.toLowerCase().includes('local')) {
        return false;
      }
      if (onglet === 'ASIATIQUE' && r.tagCategorieFiltre !== 'ASIATIQUE' && !r.categorie.toLowerCase().includes('asiatique')) {
        return false;
      }
      if (onglet === 'DESSERTS' && r.tagCategorieFiltre !== 'DESSERTS' && !r.categorie.toLowerCase().includes('boulangerie')) {
        return false;
      }

      // Filtre textuel
      if (recherche) {
        const nomMatch = (r.nom || '').toLowerCase().includes(recherche);
        const catMatch = (r.categorie || '').toLowerCase().includes(recherche);
        const locMatch = (r.localisation || '').toLowerCase().includes(recherche);
        const codeMatch = (r.codeId || '').toLowerCase().includes(recherche);
        if (!nomMatch && !catMatch && !locMatch && !codeMatch) {
          return false;
        }
      }

      return true;
    });
  });

  // Pagination dynamique
  readonly restaurantsAffiches = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.restaurantsFiltres().slice(debut, debut + this.elementsParPage);
  });

  readonly nombrePagesTotal = computed(() => {
    return Math.ceil(this.restaurantsFiltres().length / this.elementsParPage) || 1;
  });

  consulterMenu(r: RestaurantAdministration): void {
    this.restaurantEnConsultation.set(r);
    this.modaleMenuOuverte.set(true);
  }

  fermerModaleMenu(): void {
    this.modaleMenuOuverte.set(false);
    this.restaurantEnConsultation.set(null);
  }

  editerRestaurant(r: RestaurantAdministration): void {
    this.motifSuspension.set('');
    this.restaurantEnEdition.set({ ...r });
    this.modaleEditionOuverte.set(true);
  }

  fermerModaleEdition(): void {
    this.modaleEditionOuverte.set(false);
    this.restaurantEnEdition.set(null);
  }

  sauvegarderRestaurant(): void {
    const r = this.restaurantEnEdition();
    if (!r) return;

    const nouveauStatut = r.statut === 'ACTIF' ? 'ACTIF' : 'SUSPENDU';
    const motif = this.motifSuspension().trim();
    if (nouveauStatut === 'SUSPENDU' && !motif) {
      this.notificationSucces.set('Indiquez le motif de la suspension : il est envoyé par e-mail au gérant.');
      setTimeout(() => this.notificationSucces.set(null), 3000);
      return;
    }
    this.http.post<{ message: string }>(`${environment.apiUrl}/administration/etablissements/${r.identifiant}/decision/`, {
      nouveau_statut: nouveauStatut,
      motif_decision: motif
    }).subscribe({
      next: (reponse) => {
        this.notificationSucces.set(reponse?.message || `Le restaurant "${r.nom}" a été mis à jour avec succès.`);
        this.fermerModaleEdition();
        this.chargerRestaurants();
        setTimeout(() => this.notificationSucces.set(null), 4000);
      },
      error: (erreur) => {
        this.notificationSucces.set(erreur?.error?.message || `Erreur lors de la mise à jour de "${r.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 4000);
      }
    });
  }

  supprimerRestaurant(r: RestaurantAdministration): void {
    const motif = prompt(`Motif de la suspension de "${r.nom}" (envoyé par e-mail au gérant) :`)?.trim();
    if (!motif) return;

    this.http.post<{ message: string }>(`${environment.apiUrl}/administration/etablissements/${r.identifiant}/decision/`, {
      nouveau_statut: 'SUSPENDU',
      motif_decision: motif
    }).subscribe({
      next: (reponse) => {
        this.notificationSucces.set(reponse?.message || `Le restaurant "${r.nom}" a été suspendu.`);
        this.chargerRestaurants();
        setTimeout(() => this.notificationSucces.set(null), 4000);
      },
      error: () => {
        this.notificationSucces.set(`Erreur lors de la suspension de "${r.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
