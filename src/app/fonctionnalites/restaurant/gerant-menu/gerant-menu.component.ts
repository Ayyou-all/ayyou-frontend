import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type CategorieMenuGerant = 'PLATS_PRINCIPAUX' | 'BOISSONS' | 'DESSERTS';

export interface PlatGerant {
  identifiant: string;
  nom: string;
  description: string;
  prix: number;
  categorie: CategorieMenuGerant;
  estDisponible: boolean;
  photoUrl: string;
  badges?: string[]; // ex: ['BEST-SELLER', 'POPULAIRE']
}

@Component({
  selector: 'app-gerant-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-menu.component.html'
})
export class GerantMenuComponent {
  // Recherche textuelle
  readonly rechercheTexte = signal<string>('');

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  // Modale d'ajout de plat
  readonly modaleAjoutOuverte = signal<boolean>(false);
  readonly nouveauNom = signal<string>('');
  readonly nouvelleDescription = signal<string>('');
  readonly nouveauPrix = signal<number>(4500);
  readonly nouvelleCategorie = signal<CategorieMenuGerant>('PLATS_PRINCIPAUX');
  readonly nouvellePhoto = signal<string>('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300');

  // Modale d'édition de plat
  readonly platEnEdition = signal<PlatGerant | null>(null);
  readonly modaleEditionOuverte = signal<boolean>(false);

  // Modale Aperçu Menu Client
  readonly modaleApercuClientOuverte = signal<boolean>(false);

  // Liste des plats du menu (conformes à l'Image 2)
  readonly listePlats = signal<PlatGerant[]>([
    // PLATS PRINCIPAUX
    {
      identifiant: 'plat-01',
      nom: 'Thieboudienne Rouge',
      description: 'Riz au poisson à la sénégalaise, servi avec légumes du terroir et sauce nététou...',
      prix: 4500,
      categorie: 'PLATS_PRINCIPAUX',
      estDisponible: true,
      photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
      badges: ['BEST-SELLER', 'POPULAIRE']
    },
    {
      identifiant: 'plat-02',
      nom: 'Yassa Poulet',
      description: 'Poulet mariné au citron et oignons caramélisés, servi avec riz blanc parfumé...',
      prix: 3800,
      categorie: 'PLATS_PRINCIPAUX',
      estDisponible: false, // En rupture (Image 2)
      photoUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300'
    },
    {
      identifiant: 'plat-03',
      nom: 'Mafe Boeuf',
      description: 'Ragoût à la sauce d’arachide onctueuse, viande de bœuf tendre et légumes...',
      prix: 4200,
      categorie: 'PLATS_PRINCIPAUX',
      estDisponible: true,
      photoUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300'
    },
    {
      identifiant: 'plat-04',
      nom: 'Dibi d’Agneau Braisé',
      description: 'Morceaux d’agneau grillés au feu de bois, oignons marinés et moutarde piquante...',
      prix: 5500,
      categorie: 'PLATS_PRINCIPAUX',
      estDisponible: true,
      photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300',
      badges: ['POPULAIRE']
    },

    // BOISSONS
    {
      identifiant: 'bois-01',
      nom: 'Bissap Maison',
      description: 'Jus de fleurs d’hibiscus infusées, menthe fraîche et arôme naturel de vanille...',
      prix: 1000,
      categorie: 'BOISSONS',
      estDisponible: true,
      photoUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300'
    },
    {
      identifiant: 'bois-02',
      nom: 'Bouye (Baobab)',
      description: 'Jus onctueux au fruit du baobab, riche en vitamines et légèrement vanillé...',
      prix: 1500,
      categorie: 'BOISSONS',
      estDisponible: true,
      photoUrl: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=300'
    },
    {
      identifiant: 'bois-03',
      nom: 'Jus de Gingembre Citron',
      description: 'Pur gingembre frais pressé, jus de citron vert et sucre de canne...',
      prix: 1200,
      categorie: 'BOISSONS',
      estDisponible: false, // En rupture
      photoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300'
    }
  ]);

  // Plats principaux filtrés
  readonly platsPrincipaux = computed(() => {
    const q = this.rechercheTexte().trim().toLowerCase();
    return this.listePlats().filter(
      (p) => p.categorie === 'PLATS_PRINCIPAUX' && (!q || p.nom.toLowerCase().includes(q))
    );
  });

  // Boissons filtrées
  readonly boissons = computed(() => {
    const q = this.rechercheTexte().trim().toLowerCase();
    return this.listePlats().filter(
      (p) => p.categorie === 'BOISSONS' && (!q || p.nom.toLowerCase().includes(q))
    );
  });

  // Métriques de la barre inférieure (Image 2)
  readonly totalPlatsNombre = computed(() => 24);
  readonly enRuptureNombre = computed(
    () => this.listePlats().filter((p) => !p.estDisponible).length
  );

  /**
   * Bascule la disponibilité d'un plat (Disponible <-> Rupture).
   */
  basculerDisponibilite(plat: PlatGerant): void {
    const nouvelEtat = !plat.estDisponible;
    this.listePlats.update((liste) =>
      liste.map((p) => (p.identifiant === plat.identifiant ? { ...p, estDisponible: nouvelEtat } : p))
    );

    const texteEtat = nouvelEtat ? 'disponible' : 'en rupture';
    this.notificationSucces.set(`Le plat "${plat.nom}" est désormais marqué comme ${texteEtat}.`);
    setTimeout(() => this.notificationSucces.set(null), 2500);
  }

  /**
   * Ouvre la modale d'ajout.
   */
  ouvrirAjoutPlat(): void {
    this.nouveauNom.set('');
    this.nouvelleDescription.set('');
    this.modaleAjoutOuverte.set(true);
  }

  /**
   * Crée un nouveau plat dans la carte.
   */
  creerPlat(): void {
    const nom = this.nouveauNom().trim();
    if (!nom) return;

    const nouveau: PlatGerant = {
      identifiant: `plat-${Date.now()}`,
      nom: nom,
      description: this.nouvelleDescription() || 'Plat fait maison avec des ingrédients frais du terroir sénégalais.',
      prix: this.nouveauPrix(),
      categorie: this.nouvelleCategorie(),
      estDisponible: true,
      photoUrl: this.nouvellePhoto()
    };

    this.listePlats.update((liste) => [nouveau, ...liste]);
    this.notificationSucces.set(`Le plat "${nouveau.nom}" a été ajouté à la carte avec succès.`);
    this.modaleAjoutOuverte.set(false);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale d'édition d'un plat.
   */
  editerPlat(plat: PlatGerant): void {
    this.platEnEdition.set({ ...plat });
    this.modaleEditionOuverte.set(true);
  }

  /**
   * Sauvegarde les modifications d'un plat.
   */
  sauvegarderPlat(): void {
    const p = this.platEnEdition();
    if (!p) return;

    this.listePlats.update((liste) =>
      liste.map((item) => (item.identifiant === p.identifiant ? { ...p } : item))
    );

    this.notificationSucces.set(`Le plat "${p.nom}" a été mis à jour.`);
    this.modaleEditionOuverte.set(false);
    this.platEnEdition.set(null);
    setTimeout(() => this.notificationSucces.set(null), 2500);
  }

  /**
   * Supprime un plat de la carte.
   */
  supprimerPlat(plat: PlatGerant): void {
    if (!confirm(`Supprimer définitivement "${plat.nom}" de la carte ?`)) return;

    this.listePlats.update((liste) => liste.filter((p) => p.identifiant !== plat.identifiant));
    this.notificationSucces.set(`Le plat "${plat.nom}" a été supprimé de la carte.`);
    setTimeout(() => this.notificationSucces.set(null), 2500);
  }

  /**
   * Ouvre l'aperçu du menu client.
   */
  ouvrirApercuMenuClient(): void {
    this.modaleApercuClientOuverte.set(true);
  }

  /**
   * Exporte la carte au format PDF / Imprimable.
   */
  exporterCarte(): void {
    this.notificationSucces.set('Génération du menu PDF prêt à imprimer pour "Le Teranga"...');
    setTimeout(() => {
      this.notificationSucces.set('Menu "carte-le-teranga.pdf" téléchargé.');
      setTimeout(() => this.notificationSucces.set(null), 3000);
    }, 1500);
  }
}
