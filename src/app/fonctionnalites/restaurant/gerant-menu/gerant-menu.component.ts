import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

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
  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);

  // Nom dynamique du restaurant
  readonly nomRestaurant = signal<string>('Mon Restaurant');

  // Recherche textuelle
  readonly rechercheTexte = signal<string>('');
  readonly chargementEnCours = signal<boolean>(false);
  readonly messageErreur = signal<string | null>(null);

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  surEchap(): void {
    this.modaleAjoutOuverte.set(false);
    this.modaleEditionOuverte.set(false);
    this.modaleApercuClientOuverte.set(false);
  }

  // Modale d'ajout de plat
  readonly modaleAjoutOuverte = signal<boolean>(false);
  readonly nouveauNom = signal<string>('');
  readonly nouvelleDescription = signal<string>('');
  readonly nouveauPrix = signal<number>(4500);
  readonly nouvelleCategorie = signal<CategorieMenuGerant>('PLATS_PRINCIPAUX');
  readonly nouvellePhoto = signal<string>('');
  readonly nomFichierPhoto = signal<string>('');
  readonly fichierPhotoChoisi = signal<File | null>(null);

  // Modale d'édition de plat
  readonly platEnEdition = signal<PlatGerant | null>(null);
  readonly modaleEditionOuverte = signal<boolean>(false);
  readonly fichierPhotoEditionChoisi = signal<File | null>(null);

  // Modale Aperçu Menu Client
  readonly modaleApercuClientOuverte = signal<boolean>(false);

  // Logo et Couverture réels de l'établissement
  readonly logoRestaurant = signal<string | null>(null);
  readonly couvertureRestaurant = signal<string | null>(null);
  readonly adresseRestaurant = signal<string>('');
  readonly specialiteRestaurant = signal<string>('');

  // Liste des plats réels du restaurant
  readonly listePlats = signal<PlatGerant[]>([]);

  constructor() {
    const user = this.serviceAuth.utilisateurConnecte();
    if (user?.nomEtablissement) {
      this.nomRestaurant.set(user.nomEtablissement);
    }
    this.rafraichirEtablissement();
    this.chargerMesPlats();
  }

  rafraichirEtablissement(): void {
    this.http.get<any>(`${environment.apiUrl}/etablissements/mon-etablissement/`).subscribe({
      next: (etab) => {
        if (etab?.nom) this.nomRestaurant.set(etab.nom);
        if (etab?.adresse_logo) this.logoRestaurant.set(etab.adresse_logo);
        if (etab?.adresse_couverture) this.couvertureRestaurant.set(etab.adresse_couverture);
        if (etab?.adresse) this.adresseRestaurant.set(etab.adresse);
        if (etab?.specialite) this.specialiteRestaurant.set(etab.specialite);
      },
      error: () => {}
    });
  }



  chargerMesPlats(): void {
    this.chargementEnCours.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/catalogue/mes-plats/`).pipe(
      map((plats) =>
        plats.map((item) => ({
          identifiant: String(item.id),
          nom: item.nom,
          description: item.description || '',
          prix: Number(item.prix_fcfa),
          categorie: (item.section_menu || 'PLATS_PRINCIPAUX') as CategorieMenuGerant,
          estDisponible: Boolean(item.est_disponible),
          photoUrl: item.adresse_image || '/images/plat-accueil.jpg',
          badges: []
        }))
      )
    ).subscribe({
      next: (plats) => {
        this.listePlats.set(plats);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.messageErreur.set('Impossible de charger les données. Vérifiez votre connexion puis réessayez.');
      }
    });
  }

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

  // Métriques de la barre inférieure calculées sur les données réelles
  readonly totalPlatsNombre = computed(() => this.listePlats().length);
  readonly enRuptureNombre = computed(
    () => this.listePlats().filter((p) => !p.estDisponible).length
  );

  /**
   * Bascule la disponibilité d'un plat dans la base Django.
   */
  basculerDisponibilite(plat: PlatGerant): void {
    const nouvelEtat = !plat.estDisponible;
    this.http.patch(`${environment.apiUrl}/catalogue/mes-plats/${plat.identifiant}/disponibilite/`, {
      est_disponible: nouvelEtat
    }).subscribe({
      next: () => {
        this.listePlats.update((liste) =>
          liste.map((p) => (p.identifiant === plat.identifiant ? { ...p, estDisponible: nouvelEtat } : p))
        );
        const texteEtat = nouvelEtat ? 'disponible' : 'en rupture';
        this.notificationSucces.set(`Le plat "${plat.nom}" est désormais marqué comme ${texteEtat}.`);
        setTimeout(() => this.notificationSucces.set(null), 2500);
      },
      error: () => {
        this.notificationSucces.set(`Erreur lors de la modification de "${plat.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
  }

  /**
   * Ouvre la modale d'ajout.
   */
  ouvrirAjoutPlat(): void {
    this.nouveauNom.set('');
    this.nouvelleDescription.set('');
    this.nouvellePhoto.set('');
    this.nomFichierPhoto.set('');
    this.modaleAjoutOuverte.set(true);
  }

  /**
   * Gère le fichier image sélectionné lors de l'ajout d'un plat (limité à 5 Mo).
   */
  surFichierPhotoChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fichier = input.files[0];
      const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo

      if (fichier.size > TAILLE_MAX_OCTETS) {
        this.notificationSucces.set("⚠️ L'image sélectionnée dépasse la taille maximale autorisée de 5 Mo.");
        input.value = '';
        setTimeout(() => this.notificationSucces.set(null), 4000);
        return;
      }

      this.fichierPhotoChoisi.set(fichier);
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        if (e.target?.result) {
          this.nouvellePhoto.set(e.target.result as string);
          this.nomFichierPhoto.set(fichier.name);
        }
      };
      lecteur.readAsDataURL(fichier);
    }
  }

  /**
   * Réinitialise la photo sélectionnée pour l'ajout.
   */
  reinitialiserPhoto(): void {
    this.nouvellePhoto.set('');
    this.nomFichierPhoto.set('');
    this.fichierPhotoChoisi.set(null);
  }

  /**
   * Gère le fichier image lors de l'édition d'un plat (limité à 5 Mo).
   */
  surFichierPhotoEdition(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fichier = input.files[0];
      const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo

      if (fichier.size > TAILLE_MAX_OCTETS) {
        this.notificationSucces.set("⚠️ L'image sélectionnée dépasse la taille maximale autorisée de 5 Mo.");
        input.value = '';
        setTimeout(() => this.notificationSucces.set(null), 4000);
        return;
      }

      this.fichierPhotoEditionChoisi.set(fichier);
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        if (e.target?.result && this.platEnEdition()) {
          this.platEnEdition.update((p) =>
            p ? { ...p, photoUrl: e.target?.result as string } : null
          );
        }
      };
      lecteur.readAsDataURL(fichier);
    }
  }

  /**
   * Crée un nouveau plat dans la carte réelle via l'API Django.
   */
  creerPlat(): void {
    const nom = this.nouveauNom().trim();
    if (!nom) return;

    const desc = this.nouvelleDescription() || 'Plat fait maison avec des ingrédients frais du terroir sénégalais.';
    const prix = this.nouveauPrix();
    const cat = this.nouvelleCategorie();

    let requete: any;
    if (this.fichierPhotoChoisi()) {
      const formData = new FormData();
      formData.append('nom', nom);
      formData.append('description', desc);
      formData.append('prix_fcfa', String(prix));
      formData.append('section_menu', cat);
      formData.append('est_disponible', 'true');
      formData.append('image', this.fichierPhotoChoisi()!);
      requete = this.http.post<any>(`${environment.apiUrl}/catalogue/mes-plats/`, formData);
    } else {
      const payload = {
        nom: nom,
        description: desc,
        prix_fcfa: prix,
        section_menu: cat,
        est_disponible: true
      };
      requete = this.http.post<any>(`${environment.apiUrl}/catalogue/mes-plats/`, payload);
    }

    requete.subscribe({
      next: (item: any) => {
        const nouveau: PlatGerant = {
          identifiant: String(item.id),
          nom: item.nom,
          description: item.description || desc,
          prix: Number(item.prix_fcfa),
          categorie: (item.section_menu || cat) as CategorieMenuGerant,
          estDisponible: true,
          photoUrl: item.adresse_image || this.nouvellePhoto() || '/images/plat-accueil.jpg'
        };

        this.listePlats.update((liste) => [nouveau, ...liste]);
        this.notificationSucces.set(`Le plat "${nouveau.nom}" a été ajouté à la carte avec succès.`);
        this.modaleAjoutOuverte.set(false);
        this.reinitialiserPhoto();
        this.nouveauNom.set('');
        this.nouvelleDescription.set('');
        setTimeout(() => this.notificationSucces.set(null), 3000);
      },
      error: () => {
        this.notificationSucces.set(`Erreur lors de l'enregistrement de "${nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
  }

  /**
   * Ouvre la modale d'édition d'un plat.
   */
  editerPlat(plat: PlatGerant): void {
    this.platEnEdition.set({ ...plat });
    this.fichierPhotoEditionChoisi.set(null);
    this.modaleEditionOuverte.set(true);
  }

  /**
   * Sauvegarde les modifications d'un plat via l'API Django.
   */
  sauvegarderPlat(): void {
    const p = this.platEnEdition();
    if (!p) return;

    let requete: any;
    if (this.fichierPhotoEditionChoisi()) {
      const formData = new FormData();
      formData.append('nom', p.nom);
      formData.append('description', p.description);
      formData.append('prix_fcfa', String(p.prix));
      formData.append('section_menu', p.categorie);
      formData.append('image', this.fichierPhotoEditionChoisi()!);
      requete = this.http.patch<any>(`${environment.apiUrl}/catalogue/mes-plats/${p.identifiant}/`, formData);
    } else {
      const payload = {
        nom: p.nom,
        description: p.description,
        prix_fcfa: p.prix,
        section_menu: p.categorie
      };
      requete = this.http.patch<any>(`${environment.apiUrl}/catalogue/mes-plats/${p.identifiant}/`, payload);
    }

    requete.subscribe({
      next: (item: any) => {
        const photoUrl = item?.adresse_image || p.photoUrl;
        this.listePlats.update((liste) =>
          liste.map((elem) => (elem.identifiant === p.identifiant ? { ...p, photoUrl } : elem))
        );

        this.notificationSucces.set(`Le plat "${p.nom}" a été mis à jour.`);
        this.modaleEditionOuverte.set(false);
        this.platEnEdition.set(null);
        this.fichierPhotoEditionChoisi.set(null);
        setTimeout(() => this.notificationSucces.set(null), 2500);
      },
      error: () => {
        this.notificationSucces.set(`Erreur lors de la mise à jour de "${p.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
  }

  /**
   * Supprime / archive un plat de la carte via l'API Django.
   */
  supprimerPlat(plat: PlatGerant): void {
    if (!confirm(`Supprimer définitivement "${plat.nom}" de la carte ?`)) return;

    this.http.delete(`${environment.apiUrl}/catalogue/mes-plats/${plat.identifiant}/`).subscribe({
      next: () => {
        this.listePlats.update((liste) => liste.filter((p) => p.identifiant !== plat.identifiant));
        this.notificationSucces.set(`Le plat "${plat.nom}" a été supprimé de la carte.`);
        setTimeout(() => this.notificationSucces.set(null), 2500);
      },
      error: () => {
        this.notificationSucces.set(`Erreur lors de la suppression de "${plat.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
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
    window.print();
  }
}
