import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
  codeId: string; // ex: 'ID: REST-2045'
  categorie: string; // ex: 'Cuisine Marocaine', 'Fast Food Local', 'Boulangerie', 'Asiatique'
  tagCategorieFiltre: 'FAST_FOOD' | 'LOCAL' | 'ASIATIQUE' | 'DESSERTS' | 'AUTRE';
  localisation: string; // ex: 'Plateau, Dakar'
  note: number; // ex: 4.8
  statut: StatutRestaurantAdmin;
  logoIcone: string;
  fondLogo: string;
  telephone: string;
  platsMenu?: PlatMenuApercu[];
}

@Component({
  selector: 'app-restaurants-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './restaurants-admin.component.html'
})
export class RestaurantsAdminComponent {
  // Onglet catégorie
  readonly ongletActif = signal<OngletCategorieRestaurant>('TOUS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 4;

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);

  // Modale de consultation du menu
  readonly restaurantEnConsultation = signal<RestaurantAdministration | null>(null);
  readonly modaleMenuOuverte = signal<boolean>(false);

  // Modale d'édition
  readonly restaurantEnEdition = signal<RestaurantAdministration | null>(null);
  readonly modaleEditionOuverte = signal<boolean>(false);

  // Modale d'ajout
  readonly modaleAjoutOuverte = signal<boolean>(false);
  readonly nouveauNom = signal<string>('');
  readonly nouvelleCategorie = signal<string>('Fast Food Local');
  readonly nouvelleLocalisation = signal<string>('Almadies, Dakar');
  readonly nouveauTelephone = signal<string>('+221 77 123 45 67');

  // Statistiques KPI (conformes à l'Image 3)
  readonly statsKpi = {
    actifs: { valeur: 84, evolution: '+4' },
    enAttente: { valeur: 12, evolution: 'New' },
    inactifs: { valeur: '08', evolution: '-1' },
    moyenneNotes: { valeur: '4.7/5', evolution: 'Top' }
  };

  // Liste des restaurants (conformes à l'Image 3)
  readonly listeRestaurants = signal<RestaurantAdministration[]>([
    {
      identifiant: 'rest-01',
      nom: 'Le Ryad Dakar',
      codeId: 'ID: REST-2045',
      categorie: 'Cuisine Marocaine',
      tagCategorieFiltre: 'AUTRE',
      localisation: 'Plateau, Dakar',
      note: 4.8,
      statut: 'ACTIF',
      logoIcone: 'fa-solid fa-utensils',
      fondLogo: 'bg-amber-100 text-amber-700',
      telephone: '+221 33 821 40 50',
      platsMenu: [
        { nom: 'Couscous Royal aux Sept Légumes', description: 'Agneau fondant, poulet fermier, merguez artisanale', prix: 8500 },
        { nom: 'Tajine d’Agneau aux Pruneaux', description: 'Amandes effilées grillées, sauce miel safranée', prix: 7200 },
        { nom: 'Pastilla Traditionnelle au Poulet', description: 'Pâte phyllo croustillante, cannelle et amandes', prix: 4500 }
      ]
    },
    {
      identifiant: 'rest-02',
      nom: 'Griot Express',
      codeId: 'ID: REST-2089',
      categorie: 'Fast Food Local',
      tagCategorieFiltre: 'LOCAL',
      localisation: 'Almadies, Dakar',
      note: 4.5,
      statut: 'ACTIF',
      logoIcone: 'fa-solid fa-burger',
      fondLogo: 'bg-amber-900/80 text-amber-200',
      telephone: '+221 77 444 88 22',
      platsMenu: [
        { nom: 'Burger Dibi Spécial', description: 'Agneau braisé au feu de bois, oignons caramélisés et moutarde de Dijon', prix: 4500 },
        { nom: 'Plateau Dibi d’Agneau (500g)', description: 'Servi avec frites maison et piment vert doux', prix: 6000 },
        { nom: 'Pastels au Poisson (Portion de 10)', description: 'Sauce tomate pimentée maison', prix: 2000 }
      ]
    },
    {
      identifiant: 'rest-03',
      nom: 'Pâtisserie La Rose',
      codeId: 'ID: REST-2101',
      categorie: 'Boulangerie',
      tagCategorieFiltre: 'DESSERTS',
      localisation: 'Point E, Dakar',
      note: 4.9,
      statut: 'EN_ATTENTE',
      logoIcone: 'fa-solid fa-bread-slice',
      fondLogo: 'bg-rose-100 text-rose-600',
      telephone: '+221 33 825 12 34',
      platsMenu: [
        { nom: 'Croissant Pur Beurre AOP', description: 'Feuilletage artisanal français', prix: 1200 },
        { nom: 'Tartelette Framboise Pistache', description: 'Crème diplomate à la pistache d’Iran', prix: 2800 },
        { nom: 'Millefeuille Vanille Bourbon', description: 'Caramélisé au sucre roux', prix: 2500 }
      ]
    },
    {
      identifiant: 'rest-04',
      nom: 'Osaka Sushi',
      codeId: 'ID: REST-1982',
      categorie: 'Asiatique',
      tagCategorieFiltre: 'ASIATIQUE',
      localisation: 'Sea Plaza, Dakar',
      note: 4.2,
      statut: 'INACTIF',
      logoIcone: 'fa-solid fa-bowl-rice',
      fondLogo: 'bg-orange-100 text-orange-700',
      telephone: '+221 33 869 90 90',
      platsMenu: [
        { nom: 'Plateau Moriawase (24 pièces)', description: 'Saumon d’Écosse, thon rouge local de Dakar, avocat', prix: 16500 },
        { nom: 'Dragon Roll Crispy', description: 'Crevette tempura, anguille grillée et sésame', prix: 7500 },
        { nom: 'Soupe Miso Traditionnelle', description: 'Tofu bio, algues wakamé et ciboule', prix: 2200 }
      ]
    },
    {
      identifiant: 'rest-05',
      nom: 'Burger Master',
      codeId: 'ID: REST-2150',
      categorie: 'Fast Food',
      tagCategorieFiltre: 'FAST_FOOD',
      localisation: 'Mermoz, Dakar',
      note: 4.6,
      statut: 'ACTIF',
      logoIcone: 'fa-solid fa-burger',
      fondLogo: 'bg-amber-100 text-amber-700',
      telephone: '+221 77 333 44 55',
      platsMenu: [
        { nom: 'Double Cheeseburger Master', description: 'Deux steaks pur bœuf, cheddar affiné', prix: 4800 }
      ]
    }
  ]);

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
        const nomMatch = r.nom.toLowerCase().includes(recherche);
        const catMatch = r.categorie.toLowerCase().includes(recherche);
        const locMatch = r.localisation.toLowerCase().includes(recherche);
        const codeMatch = r.codeId.toLowerCase().includes(recherche);
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

  /**
   * Ouvre la modale pour voir la carte et les menus du restaurant.
   */
  consulterMenu(r: RestaurantAdministration): void {
    this.restaurantEnConsultation.set(r);
    this.modaleMenuOuverte.set(true);
  }

  /**
   * Ferme la modale de carte/menu.
   */
  fermerModaleMenu(): void {
    this.modaleMenuOuverte.set(false);
    this.restaurantEnConsultation.set(null);
  }

  /**
   * Ouvre la modale d'édition.
   */
  editerRestaurant(r: RestaurantAdministration): void {
    this.restaurantEnEdition.set({ ...r });
    this.modaleEditionOuverte.set(true);
  }

  /**
   * Ferme la modale d'édition.
   */
  fermerModaleEdition(): void {
    this.modaleEditionOuverte.set(false);
    this.restaurantEnEdition.set(null);
  }

  /**
   * Enregistre les modifications apportées à un restaurant.
   */
  sauvegarderRestaurant(): void {
    const r = this.restaurantEnEdition();
    if (!r) return;

    this.listeRestaurants.update((liste) =>
      liste.map((item) => (item.identifiant === r.identifiant ? { ...r } : item))
    );

    this.notificationSucces.set(`Le restaurant "${r.nom}" a été mis à jour avec succès.`);
    this.fermerModaleEdition();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Supprime un restaurant de la plateforme.
   */
  supprimerRestaurant(r: RestaurantAdministration): void {
    if (!confirm(`Confirmez-vous la désactivation définitive de "${r.nom}" ?`)) return;

    this.listeRestaurants.update((liste) =>
      liste.filter((item) => item.identifiant !== r.identifiant)
    );

    this.notificationSucces.set(`Le restaurant "${r.nom}" a été retiré de la liste.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale pour enregistrer un nouveau restaurant partenaire.
   */
  ouvrirNouveauRestaurant(): void {
    this.nouveauNom.set('');
    this.modaleAjoutOuverte.set(true);
  }

  /**
   * Ferme la modale d'ajout.
   */
  fermerNouveauRestaurant(): void {
    this.modaleAjoutOuverte.set(false);
  }

  /**
   * Crée un nouveau restaurant partenaire.
   */
  creerNouveauRestaurant(): void {
    const nom = this.nouveauNom().trim();
    if (!nom) return;

    const nouveau: RestaurantAdministration = {
      identifiant: `rest-${Math.floor(100 + Math.random() * 900)}`,
      nom: nom,
      codeId: `ID: REST-${Math.floor(2150 + Math.random() * 100)}`,
      categorie: this.nouvelleCategorie(),
      tagCategorieFiltre: 'LOCAL',
      localisation: this.nouvelleLocalisation(),
      note: 5.0,
      statut: 'ACTIF',
      logoIcone: 'fa-solid fa-utensils',
      fondLogo: 'bg-emerald-100 text-emerald-700',
      telephone: this.nouveauTelephone(),
      platsMenu: [
        { nom: 'Plat Signature Maison', description: 'Préparé à base d’ingrédients frais locaux', prix: 5000 }
      ]
    };

    this.listeRestaurants.update((liste) => [nouveau, ...liste]);
    this.notificationSucces.set(`Le restaurant "${nouveau.nom}" a été ajouté avec succès.`);
    this.fermerNouveauRestaurant();
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
