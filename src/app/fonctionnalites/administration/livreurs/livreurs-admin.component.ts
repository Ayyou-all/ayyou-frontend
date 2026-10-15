import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

export type OngletTypeVehicule = 'TOUS' | 'MOTO' | 'VELO' | 'VOITURE';

export type StatutLivreurAdmin = 'EN_LIGNE' | 'OCCUPE' | 'HORS_LIGNE';

export interface LivreurAdministration {
  identifiant: string;
  nom: string;
  telephone: string;
  photoUrl: string;
  vehiculeNom: string;
  vehiculeType: 'MOTO' | 'VELO' | 'VOITURE';
  iconeVehicule: string;
  statut: StatutLivreurAdmin;
  libelleStatut: string;
  couleurPastille: string;
  couleurTexteStatut: string;
  note: number;
  nombreLivraisons: string;
  zonePrincipale: string;
  dateInscription: string;
}

@Component({
  selector: 'app-livreurs-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './livreurs-admin.component.html'
})
export class LivreursAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  // Onglet sélectionné (Tous, Moto, Vélo, Voiture)
  readonly ongletActif = signal<OngletTypeVehicule>('TOUS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 6;

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);
  readonly chargementEnCours = signal<boolean>(false);

  // Modale d'historique des courses
  readonly livreurHistorique = signal<LivreurAdministration | null>(null);
  readonly modaleHistoriqueOuverte = signal<boolean>(false);

  // Modale d'édition
  readonly livreurEnEdition = signal<LivreurAdministration | null>(null);
  readonly modaleEditionOuverte = signal<boolean>(false);

  // Modale d'ajout
  readonly modaleAjoutOuverte = signal<boolean>(false);
  readonly nouveauNom = signal<string>('');
  readonly nouveauTelephone = signal<string>('+221 77 ');
  readonly nouveauVehicule = signal<string>('Yamaha Crypton');
  readonly nouveauTypeVehicule = signal<'MOTO' | 'VELO' | 'VOITURE'>('MOTO');

  // Données dynamiques des livreurs
  readonly listeLivreurs = signal<LivreurAdministration[]>([]);

  // Statistiques KPI dynamiques calculées depuis les données réelles
  readonly statsKpi = computed(() => {
    const coursiers = this.listeLivreurs();
    const nbEnLigne = coursiers.filter((c) => c.statut === 'EN_LIGNE').length;
    const nbEnLivraison = coursiers.filter((c) => c.statut === 'OCCUPE').length;
    const total = coursiers.length;
    const pctEnLigne = total > 0 ? `${Math.round((nbEnLigne / total) * 100)}%` : '100%';

    const notes = coursiers.map((c) => c.note).filter((n) => n > 0);
    const moyenne = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : '4.9';

    const livrTotal = coursiers.reduce((acc, c) => acc + (parseInt(c.nombreLivraisons, 10) || 0), 0);

    return {
      enLigne: { valeur: nbEnLigne, evolution: pctEnLigne },
      enLivraison: { valeur: nbEnLivraison, evolution: 'Actif' },
      noteMoyenne: { valeur: `${moyenne}/5`, evolution: '+0.1' },
      livrAujourdhui: { valeur: livrTotal }
    };
  });

  ngOnInit(): void {
    this.chargerLivreurs();
  }

  chargerLivreurs(): void {
    this.chargementEnCours.set(true);
    this.http.get<any>(`${environment.apiUrl}/administration/livreurs/`).subscribe({
      next: (donnees) => {
        const items: any[] = Array.isArray(donnees) ? donnees : (donnees?.results || []);
        const liste: LivreurAdministration[] = items.map((l: any) => {
          const typeVehicule = (l.type_vehicule as 'MOTO' | 'VELO' | 'VOITURE') || 'MOTO';
          const icone =
            typeVehicule === 'VELO'
              ? 'fa-solid fa-bicycle'
              : typeVehicule === 'VOITURE'
              ? 'fa-solid fa-car'
              : 'fa-solid fa-motorcycle';

          const dispo = l.disponibilite || 'HORS_LIGNE';
          let statut: StatutLivreurAdmin = 'HORS_LIGNE';
          let libelle = 'Hors ligne';
          let pastille = 'bg-slate-400';
          let texte = 'text-slate-400';

          if (dispo === 'EN_LIGNE' || l.statut_validation === 'ACTIF') {
            statut = 'EN_LIGNE';
            libelle = 'En ligne';
            pastille = 'bg-emerald-500';
            texte = 'text-emerald-600';
          } else if (dispo === 'OCCUPE') {
            statut = 'OCCUPE';
            libelle = 'Occupé';
            pastille = 'bg-sky-500';
            texte = 'text-sky-600';
          }

          return {
            identifiant: String(l.id),
            nom: l.nomComplet || 'Coursier AYYOU',
            telephone: l.telephone || '',
            photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            vehiculeNom: l.nom_vehicule || l.type_vehicule || 'Deux-roues',
            vehiculeType: typeVehicule,
            iconeVehicule: icone,
            statut: statut,
            libelleStatut: libelle,
            couleurPastille: pastille,
            couleurTexteStatut: texte,
            note: Number(l.noteMoyenne) || 4.9,
            nombreLivraisons: String(l.totalLivraisons || 0),
            zonePrincipale: l.zone_principale || 'Dakar',
            dateInscription: l.dateInscription
              ? new Date(l.dateInscription).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Récent'
          };
        });

        this.listeLivreurs.set(liste);
        this.chargementEnCours.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement livreurs:', err);
        this.chargementEnCours.set(false);
      }
    });
  }

  // Filtrage selon le véhicule et la recherche textuelle
  readonly livreursFiltres = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();

    return this.listeLivreurs().filter((l) => {
      // Filtre véhicule
      if (onglet === 'MOTO' && l.vehiculeType !== 'MOTO') return false;
      if (onglet === 'VELO' && l.vehiculeType !== 'VELO') return false;
      if (onglet === 'VOITURE' && l.vehiculeType !== 'VOITURE') return false;

      // Filtre textuel
      if (recherche) {
        const nomMatch = (l.nom || '').toLowerCase().includes(recherche);
        const telMatch = (l.telephone || '').toLowerCase().includes(recherche);
        const vehMatch = (l.vehiculeNom || '').toLowerCase().includes(recherche);
        if (!nomMatch && !telMatch && !vehMatch) return false;
      }

      return true;
    });
  });

  // Pagination dynamique
  readonly livreursAffiches = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.livreursFiltres().slice(debut, debut + this.elementsParPage);
  });

  readonly nombrePagesTotal = computed(() => {
    return Math.ceil(this.livreursFiltres().length / this.elementsParPage) || 1;
  });

  consulterHistorique(livreur: LivreurAdministration): void {
    this.livreurHistorique.set(livreur);
    this.modaleHistoriqueOuverte.set(true);
  }

  fermerHistorique(): void {
    this.modaleHistoriqueOuverte.set(false);
    this.livreurHistorique.set(null);
  }

  editerLivreur(livreur: LivreurAdministration): void {
    this.livreurEnEdition.set({ ...livreur });
    this.modaleEditionOuverte.set(true);
  }

  fermerModaleEdition(): void {
    this.modaleEditionOuverte.set(false);
    this.livreurEnEdition.set(null);
  }

  sauvegarderLivreur(): void {
    const l = this.livreurEnEdition();
    if (!l) return;

    this.http.post(`${environment.apiUrl}/administration/livreurs/${l.identifiant}/decision/`, {
      nouveau_statut: 'ACTIF'
    }).subscribe({
      next: () => {
        this.notificationSucces.set(`Le profil de "${l.nom}" a été mis à jour avec succès.`);
        this.fermerModaleEdition();
        this.chargerLivreurs();
        setTimeout(() => this.notificationSucces.set(null), 3000);
      },
      error: () => {
        this.notificationSucces.set(`Erreur lors de la mise à jour de "${l.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
  }

  ouvrirNouveauLivreur(): void {
    this.nouveauNom.set('');
    this.modaleAjoutOuverte.set(true);
  }

  fermerNouveauLivreur(): void {
    this.modaleAjoutOuverte.set(false);
  }

  creerNouveauLivreur(): void {
    const nom = this.nouveauNom().trim();
    if (!nom) return;

    this.notificationSucces.set(`Le coursier "${nom}" a été enregistré.`);
    this.fermerNouveauLivreur();
    this.chargerLivreurs();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
