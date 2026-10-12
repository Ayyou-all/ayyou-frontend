import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
export class LivreursAdminComponent {
  // Onglet sélectionné (Tous, Moto, Vélo, Voiture)
  readonly ongletActif = signal<OngletTypeVehicule>('TOUS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 4;

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);

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

  // Statistiques KPI (conformes à l'Image 1)
  readonly statsKpi = {
    enLigne: { valeur: 96, evolution: '62%' },
    enLivraison: { valeur: 42, evolution: 'Actif' },
    noteMoyenne: { valeur: '4.6/5', evolution: '+0.2' },
    livrAujourdhui: { valeur: 842 }
  };

  // Liste des livreurs (conformes à l'Image 1)
  readonly listeLivreurs = signal<LivreurAdministration[]>([
    {
      identifiant: 'liv-01',
      nom: 'Moussa Diop',
      telephone: '+221 77 123 45 67',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      vehiculeNom: 'Yamaha Crypton',
      vehiculeType: 'MOTO',
      iconeVehicule: 'fa-solid fa-motorcycle',
      statut: 'EN_LIGNE',
      libelleStatut: 'En ligne',
      couleurPastille: 'bg-emerald-500',
      couleurTexteStatut: 'text-emerald-600',
      note: 4.9,
      nombreLivraisons: '1,248',
      zonePrincipale: 'Dakar Plateau & Médina',
      dateInscription: '15 Jan. 2023'
    },
    {
      identifiant: 'liv-02',
      nom: 'Abdoulaye Wade',
      telephone: '+221 78 555 12 34',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      vehiculeNom: 'BTwin 500',
      vehiculeType: 'VELO',
      iconeVehicule: 'fa-solid fa-bicycle',
      statut: 'OCCUPE',
      libelleStatut: 'Occupé',
      couleurPastille: 'bg-sky-500',
      couleurTexteStatut: 'text-sky-600',
      note: 4.7,
      nombreLivraisons: '562',
      zonePrincipale: 'Almadies & Ngor',
      dateInscription: '02 Mars 2023'
    },
    {
      identifiant: 'liv-03',
      nom: 'Ibrahima Fall',
      telephone: '+221 70 888 44 22',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      vehiculeNom: 'Renault Clio',
      vehiculeType: 'VOITURE',
      iconeVehicule: 'fa-solid fa-car',
      statut: 'HORS_LIGNE',
      libelleStatut: 'Hors ligne',
      couleurPastille: 'bg-slate-400',
      couleurTexteStatut: 'text-slate-400',
      note: 4.2,
      nombreLivraisons: '2,104',
      zonePrincipale: 'Grand Dakar & Parcelles',
      dateInscription: '18 Nov. 2022'
    },
    {
      identifiant: 'liv-04',
      nom: 'Saliou Ndiaye',
      telephone: '+221 76 444 99 88',
      photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      vehiculeNom: 'TVS HLX 125',
      vehiculeType: 'MOTO',
      iconeVehicule: 'fa-solid fa-motorcycle',
      statut: 'EN_LIGNE',
      libelleStatut: 'En ligne',
      couleurPastille: 'bg-emerald-500',
      couleurTexteStatut: 'text-emerald-600',
      note: 5.0,
      nombreLivraisons: '315',
      zonePrincipale: 'Mermoz & Fann',
      dateInscription: '10 Août 2023'
    },
    {
      identifiant: 'liv-05',
      nom: 'Mamadou Diallo',
      telephone: '+221 77 666 77 88',
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      vehiculeNom: 'Vélo Cargo Électrique',
      vehiculeType: 'VELO',
      iconeVehicule: 'fa-solid fa-bicycle',
      statut: 'EN_LIGNE',
      libelleStatut: 'En ligne',
      couleurPastille: 'bg-emerald-500',
      couleurTexteStatut: 'text-emerald-600',
      note: 4.8,
      nombreLivraisons: '420',
      zonePrincipale: 'Parcelles Assainies',
      dateInscription: '27 Oct. 2023'
    }
  ]);

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
        const nomMatch = l.nom.toLowerCase().includes(recherche);
        const telMatch = l.telephone.toLowerCase().includes(recherche);
        const vehMatch = l.vehiculeNom.toLowerCase().includes(recherche);
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

  /**
   * Ouvre la modale d'historique d'un coursier.
   */
  consulterHistorique(livreur: LivreurAdministration): void {
    this.livreurHistorique.set(livreur);
    this.modaleHistoriqueOuverte.set(true);
  }

  /**
   * Ferme la modale d'historique.
   */
  fermerHistorique(): void {
    this.modaleHistoriqueOuverte.set(false);
    this.livreurHistorique.set(null);
  }

  /**
   * Ouvre la modale d'édition.
   */
  editerLivreur(livreur: LivreurAdministration): void {
    this.livreurEnEdition.set({ ...livreur });
    this.modaleEditionOuverte.set(true);
  }

  /**
   * Ferme la modale d'édition.
   */
  fermerModaleEdition(): void {
    this.modaleEditionOuverte.set(false);
    this.livreurEnEdition.set(null);
  }

  /**
   * Enregistre les modifications apportées à un livreur.
   */
  sauvegarderLivreur(): void {
    const l = this.livreurEnEdition();
    if (!l) return;

    this.listeLivreurs.update((liste) =>
      liste.map((item) => (item.identifiant === l.identifiant ? { ...l } : item))
    );

    this.notificationSucces.set(`Le profil de "${l.nom}" a été mis à jour avec succès.`);
    this.fermerModaleEdition();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale d'ajout d'un nouveau coursier.
   */
  ouvrirNouveauLivreur(): void {
    this.nouveauNom.set('');
    this.modaleAjoutOuverte.set(true);
  }

  /**
   * Ferme la modale d'ajout.
   */
  fermerNouveauLivreur(): void {
    this.modaleAjoutOuverte.set(false);
  }

  /**
   * Crée un nouveau livreur.
   */
  creerNouveauLivreur(): void {
    const nom = this.nouveauNom().trim();
    if (!nom) return;

    const typeVehicule = this.nouveauTypeVehicule();
    const nouveau: LivreurAdministration = {
      identifiant: `liv-${Math.floor(10 + Math.random() * 90)}`,
      nom: nom,
      telephone: this.nouveauTelephone(),
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      vehiculeNom: this.nouveauVehicule(),
      vehiculeType: typeVehicule,
      iconeVehicule: typeVehicule === 'VELO' ? 'fa-solid fa-bicycle' : typeVehicule === 'VOITURE' ? 'fa-solid fa-car' : 'fa-solid fa-motorcycle',
      statut: 'EN_LIGNE',
      libelleStatut: 'En ligne',
      couleurPastille: 'bg-emerald-500',
      couleurTexteStatut: 'text-emerald-600',
      note: 5.0,
      nombreLivraisons: '0',
      zonePrincipale: 'Dakar & Environs',
      dateInscription: 'Aujourd’hui'
    };

    this.listeLivreurs.update((liste) => [nouveau, ...liste]);
    this.notificationSucces.set(`Le coursier "${nouveau.nom}" a été ajouté à la flotte.`);
    this.fermerNouveauLivreur();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Navigation pagination.
   */
  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
