import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

export type OngletTypePartenaire = 'TOUS' | 'RESTAURANTS' | 'LIVREURS';

export interface DocumentPartenaire {
  nom: string;
  type: string;
  urlFichier: string;
  estValide: boolean;
}

export interface PartenaireAValider {
  identifiant: string;
  nom: string;
  specialiteOuVehicule: string;
  telephone: string;
  courriel: string;
  region: string;
  adresseComplete: string;
  type: 'RESTAURANT' | 'LIVREUR';
  iconeOuPhoto: string;
  estPhoto: boolean;
  classeFondIcone?: string;
  documentsFournis: number;
  documentsTotal: number;
  listeDocuments: DocumentPartenaire[];
  dateSoumission: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  noteInterne?: string;
}

@Component({
  selector: 'app-validations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './validations.component.html'
})
export class ValidationsComponent {
  private readonly route = inject(ActivatedRoute);

  // Onglet sélectionné (Tous, Restaurants, Livreurs)
  readonly ongletActif = signal<OngletTypePartenaire>('TOUS');

  // Filtres de recherche
  readonly rechercheTexte = signal<string>('');
  readonly filtreDate = signal<string>('TOUTES');
  readonly filtreRegion = signal<string>('TOUTES');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 4;

  // Modale de vérification détaillée du partenaire
  readonly partenaireSelectionne = signal<PartenaireAValider | null>(null);
  readonly modaleVerificationOuverte = signal<boolean>(false);
  readonly notificationSucces = signal<string | null>(null);

  // Données complètes des demandes de validation (conformes à l'Image 2)
  readonly listePartenaires = signal<PartenaireAValider[]>([
    {
      identifiant: 'val-01',
      nom: 'La Trattoria',
      specialiteOuVehicule: 'Cuisine Italienne',
      telephone: '+221 77 111 22 33',
      courriel: 'contact@latrattoria.sn',
      region: 'Dakar - Plateau',
      adresseComplete: '12 Rue Victor Hugo, Dakar Plateau',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-pizza-slice',
      estPhoto: false,
      classeFondIcone: 'bg-rose-50 text-[#E51824]',
      documentsFournis: 3,
      documentsTotal: 3,
      listeDocuments: [
        { nom: 'Registre de commerce (RCCM)', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: 'Attestation fiscale NINEA', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: "Carte d'identité du gérant", type: 'Image', urlFichier: '#', estValide: true }
      ],
      dateSoumission: '24 Oct. 2023, 14:30',
      statut: 'EN_ATTENTE'
    },
    {
      identifiant: 'val-02',
      nom: 'Thomas Dupont',
      specialiteOuVehicule: 'Scooter Électrique',
      telephone: '+221 77 222 33 44',
      courriel: 'thomas.dupont@ayyou.sn',
      region: 'Dakar - Almadies',
      adresseComplete: 'Route de la Corniche Ouest, Almadies',
      type: 'LIVREUR',
      iconeOuPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      estPhoto: true,
      documentsFournis: 3,
      documentsTotal: 3,
      listeDocuments: [
        { nom: 'Permis de conduire moto (A2)', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: "Carte Nationale d'Identité", type: 'Image', urlFichier: '#', estValide: true },
        { nom: 'Assurance professionnelle véhicule', type: 'PDF', urlFichier: '#', estValide: true }
      ],
      dateSoumission: '25 Oct. 2023, 09:12',
      statut: 'EN_ATTENTE'
    },
    {
      identifiant: 'val-03',
      nom: 'Burger Master',
      specialiteOuVehicule: 'Fast Food',
      telephone: '+221 77 333 44 55',
      courriel: 'commandes@burgermaster.sn',
      region: 'Dakar - Mermoz',
      adresseComplete: 'Avenue Cheikh Anta Diop, Mermoz',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-burger',
      estPhoto: false,
      classeFondIcone: 'bg-amber-50 text-amber-600',
      documentsFournis: 2,
      documentsTotal: 3,
      listeDocuments: [
        { nom: 'Registre de commerce (RCCM)', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: "Carte d'identité du représentant", type: 'Image', urlFichier: '#', estValide: true },
        { nom: 'Attestation de conformité sanitaire', type: 'En attente', urlFichier: '#', estValide: false }
      ],
      dateSoumission: '25 Oct. 2023, 11:45',
      statut: 'EN_ATTENTE'
    },
    {
      identifiant: 'val-04',
      nom: 'Kevin Miller',
      specialiteOuVehicule: 'Moto 150cc',
      telephone: '+221 77 444 55 66',
      courriel: 'kevin.miller@ayyou.sn',
      region: 'Dakar - Point E',
      adresseComplete: 'Rue 10 x Boulevard de l’Est, Point E',
      type: 'LIVREUR',
      iconeOuPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      estPhoto: true,
      documentsFournis: 3,
      documentsTotal: 3,
      listeDocuments: [
        { nom: 'Permis de conduire moto', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: "Carte Nationale d'Identité", type: 'Image', urlFichier: '#', estValide: true },
        { nom: 'Carte grise moto', type: 'PDF', urlFichier: '#', estValide: true }
      ],
      dateSoumission: '26 Oct. 2023, 08:20',
      statut: 'EN_ATTENTE'
    },
    {
      identifiant: 'val-05',
      nom: 'Dakar Wok Express',
      specialiteOuVehicule: 'Cuisine Asiatique & Fusion',
      telephone: '+221 77 555 66 77',
      courriel: 'contact@dakarwok.sn',
      region: 'Dakar - Plateau',
      adresseComplete: 'Place de l’Indépendance, Dakar',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-bowl-food',
      estPhoto: false,
      classeFondIcone: 'bg-emerald-50 text-emerald-600',
      documentsFournis: 3,
      documentsTotal: 3,
      listeDocuments: [
        { nom: 'Registre de commerce (RCCM)', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: 'Attestation NINEA', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: 'Contrat bail commercial', type: 'PDF', urlFichier: '#', estValide: true }
      ],
      dateSoumission: '26 Oct. 2023, 16:40',
      statut: 'EN_ATTENTE'
    },
    {
      identifiant: 'val-06',
      nom: 'Mamadou Diallo',
      specialiteOuVehicule: 'Vélo Cargo Électrique',
      telephone: '+221 77 666 77 88',
      courriel: 'mamadou.cargo@ayyou.sn',
      region: 'Dakar - Parcelles',
      adresseComplete: 'Unité 14, Parcelles Assainies',
      type: 'LIVREUR',
      iconeOuPhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      estPhoto: true,
      documentsFournis: 3,
      documentsTotal: 3,
      listeDocuments: [
        { nom: "Carte Nationale d'Identité", type: 'Image', urlFichier: '#', estValide: true },
        { nom: 'Certificat de résidence', type: 'PDF', urlFichier: '#', estValide: true },
        { nom: 'Attestation Mobile Money', type: 'Image', urlFichier: '#', estValide: true }
      ],
      dateSoumission: '27 Oct. 2023, 10:15',
      statut: 'EN_ATTENTE'
    }
  ]);

  constructor() {
    // Vérifie si un identifiant a été passé via l'URL pour ouvrir la modale directement
    const cible = this.route.snapshot.queryParamMap.get('cible');
    if (cible) {
      const trouve = this.listePartenaires().find((p) => p.identifiant === cible);
      if (trouve) {
        this.ouvrirVerification(trouve);
      }
    }
  }

  // Filtrage selon l'onglet (Tous / Restaurants / Livreurs) et les critères de recherche
  readonly partenairesFiltres = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();
    const region = this.filtreRegion();

    return this.listePartenaires().filter((partenaire) => {
      // Filtre d'onglet
      if (onglet === 'RESTAURANTS' && partenaire.type !== 'RESTAURANT') {
        return false;
      }
      if (onglet === 'LIVREURS' && partenaire.type !== 'LIVREUR') {
        return false;
      }

      // Filtre textuel
      if (recherche) {
        const correspondNom = partenaire.nom.toLowerCase().includes(recherche);
        const correspondSpecialite = partenaire.specialiteOuVehicule.toLowerCase().includes(recherche);
        const correspondRegion = partenaire.region.toLowerCase().includes(recherche);
        if (!correspondNom && !correspondSpecialite && !correspondRegion) {
          return false;
        }
      }

      // Filtre région
      if (region !== 'TOUTES' && !partenaire.region.includes(region)) {
        return false;
      }

      return true;
    });
  });

  // Nombre par catégorie pour les badges d'onglets
  readonly totalTous = computed(() => this.listePartenaires().filter((p) => p.statut === 'EN_ATTENTE').length);
  readonly totalRestaurants = computed(
    () => this.listePartenaires().filter((p) => p.type === 'RESTAURANT' && p.statut === 'EN_ATTENTE').length
  );
  readonly totalLivreurs = computed(
    () => this.listePartenaires().filter((p) => p.type === 'LIVREUR' && p.statut === 'EN_ATTENTE').length
  );

  // Pagination dynamique
  readonly partenairesAffiches = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.partenairesFiltres().slice(debut, debut + this.elementsParPage);
  });

  readonly nombrePagesTotal = computed(() => {
    return Math.ceil(this.partenairesFiltres().length / this.elementsParPage) || 1;
  });

  /**
   * Ouvre la modale d'examen minutieux d'un partenaire.
   */
  ouvrirVerification(partenaire: PartenaireAValider): void {
    this.partenaireSelectionne.set({ ...partenaire });
    this.modaleVerificationOuverte.set(true);
  }

  /**
   * Ferme la modale d'examen.
   */
  fermerVerification(): void {
    this.modaleVerificationOuverte.set(false);
    this.partenaireSelectionne.set(null);
  }

  /**
   * Valide officiellement le partenaire et l'active sur AYYOU.
   */
  validerPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p) return;

    this.listePartenaires.update((liste) =>
      liste.map((item) => (item.identifiant === p.identifiant ? { ...item, statut: 'VALIDE' } : item))
    );

    this.notificationSucces.set(`Le compte de "${p.nom}" a été validé avec succès.`);
    this.fermerVerification();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Rejette la demande de partenariat.
   */
  rejeterPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p) return;

    this.listePartenaires.update((liste) =>
      liste.map((item) => (item.identifiant === p.identifiant ? { ...item, statut: 'REJETE' } : item))
    );

    this.notificationSucces.set(`La demande de "${p.nom}" a été rejetée.`);
    this.fermerVerification();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Changement de page.
   */
  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
