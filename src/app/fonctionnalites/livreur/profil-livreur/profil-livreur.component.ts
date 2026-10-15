import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

@Component({
  selector: 'app-profil-livreur',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profil-livreur.component.html'
})
export class ProfilLivreurComponent implements OnInit {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly serviceAuth = inject(ServiceAuthentification);
  private readonly router = inject(Router);

  // Onglet actif : 'coordonnees' | 'vehicule' | 'securite'
  readonly ongletActif = signal<'coordonnees' | 'vehicule' | 'securite'>('coordonnees');

  // Coordonnées personnelles
  readonly prenom = signal<string>('');
  readonly nom = signal<string>('');
  readonly courriel = signal<string>('');
  readonly telephone = signal<string>('');
  readonly adresse = signal<string>('');

  // Véhicule & Logistique
  readonly typeVehicule = signal<string>('MOTO');
  readonly nomVehicule = signal<string>('');
  readonly immatriculation = signal<string>('');
  readonly zonePrincipale = signal<string>('');

  // Sécurité
  readonly ancienMotDePasse = signal<string>('');
  readonly nouveauMotDePasse = signal<string>('');
  readonly confirmationMotDePasse = signal<string>('');

  // Gestion de la photo
  readonly fichierPhoto = signal<File | null>(null);
  readonly apercuPhoto = signal<string | null>(null);

  // Liste des zones de livraison disponibles
  readonly listeZones: string[] = [
    'Dakar - Almadies / Ngor / Ouakam',
    'Dakar - Plateau / Médina / Point E',
    'Dakar - Mermoz / Sacré-Cœur / Fann',
    'Dakar - Parcelles Assainies / Grand Yoff',
    'Pikine / Guédiawaye',
    'Rufisque / Diamniadio',
    'Thiès Ville',
    'Mbour / Saly Portudal',
    'Saint-Louis'
  ];

  // Types de véhicules
  readonly listeTypesVehicule = [
    { valeur: 'MOTO', libelle: 'Moto', icone: 'fa-solid fa-motorcycle' },
    { valeur: 'SCOOTER', libelle: 'Scooter', icone: 'fa-solid fa-moped' },
    { valeur: 'VELO', libelle: 'Vélo', icone: 'fa-solid fa-bicycle' },
    { valeur: 'VOITURE', libelle: 'Voiture', icone: 'fa-solid fa-car' }
  ];

  // Statuts d'interaction
  readonly chargement = signal<boolean>(false);
  readonly messageSucces = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);

  ngOnInit(): void {
    // 1. Initialisation immédiate depuis les données en cache pour affichage instantané
    this.synchroniserDonneesProfil();

    // 2. Chargement des données fraîches depuis l'API Django
    this.chargement.set(true);
    this.serviceLivreur.recupererProfilLivreur().subscribe({
      next: (data) => {
        this.chargement.set(false);
        if (data) {
          this.appliquerDonneesProfil(data);
        }
      },
      error: () => {
        this.chargement.set(false);
      }
    });
  }

  synchroniserDonneesProfil(): void {
    const profil = this.serviceLivreur.profilLivreur();
    const user = this.serviceAuth.utilisateurConnecte();

    this.prenom.set(profil.prenom || user?.prenom || '');
    this.nom.set(profil.nom || user?.nom || '');
    this.courriel.set(profil.courriel || user?.courriel || '');
    this.telephone.set(profil.telephone || user?.telephone || '');
    this.adresse.set(profil.adresse || user?.adresse || '');

    this.typeVehicule.set(profil.typeVehicule || 'MOTO');
    this.nomVehicule.set(profil.nomVehicule || '');
    this.immatriculation.set(profil.immatriculation || '');
    this.zonePrincipale.set(profil.zonePrincipale || '');

    if (profil.adressePhoto) {
      this.apercuPhoto.set(profil.adressePhoto);
    } else if (user?.adressePhoto) {
      this.apercuPhoto.set(user.adressePhoto);
    }
  }

  private appliquerDonneesProfil(data: any): void {
    const user = this.serviceAuth.utilisateurConnecte();
    if (data.prenom || user?.prenom) {
      this.prenom.set(data.prenom || user?.prenom || '');
    }
    if (data.nom || user?.nom) {
      this.nom.set(data.nom || user?.nom || '');
    }
    if (data.courriel || user?.courriel) {
      this.courriel.set(data.courriel || user?.courriel || '');
    }
    if (data.telephone || user?.telephone) {
      this.telephone.set(data.telephone || user?.telephone || '');
    }
    if (data.adresse || user?.adresse) {
      this.adresse.set(data.adresse || user?.adresse || '');
    }
    if (data.type_vehicule) {
      this.typeVehicule.set(data.type_vehicule);
    }
    if (data.nom_vehicule) {
      this.nomVehicule.set(data.nom_vehicule);
    }
    if (data.immatriculation) {
      this.immatriculation.set(data.immatriculation);
    }
    if (data.zone_principale) {
      this.zonePrincipale.set(data.zone_principale);
    }
    if (data.adresse_photo || user?.adressePhoto) {
      this.apercuPhoto.set(data.adresse_photo || user?.adressePhoto || null);
    }
  }

  changerOnglet(onglet: 'coordonnees' | 'vehicule' | 'securite'): void {
    this.ongletActif.set(onglet);
    this.messageSucces.set(null);
    this.messageErreur.set(null);
  }

  surSelectionPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fichier = input.files[0];
      this.fichierPhoto.set(fichier);

      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        this.apercuPhoto.set(e.target?.result as string);
      };
      lecteur.readAsDataURL(fichier);
    }
  }

  enregistrerCoordonnees(): void {
    this.messageSucces.set(null);
    this.messageErreur.set(null);

    if (!this.prenom().trim() || !this.nom().trim()) {
      this.messageErreur.set('Le prénom et le nom sont obligatoires.');
      return;
    }

    if (!this.telephone().trim()) {
      this.messageErreur.set('Le numéro de téléphone est obligatoire.');
      return;
    }

    this.chargement.set(true);

    const formData = new FormData();
    formData.append('prenom', this.prenom().trim());
    formData.append('nom', this.nom().trim());
    formData.append('telephone', this.telephone().trim());
    formData.append('adresse', this.adresse().trim());

    if (this.fichierPhoto()) {
      formData.append('photo', this.fichierPhoto()!);
    }

    this.serviceLivreur.mettreAJourProfilLivreur(formData).subscribe({
      next: () => {
        this.chargement.set(false);
        this.messageSucces.set('Vos informations personnelles ont été mises à jour avec succès.');
        this.serviceAuth.utilisateurConnecte.update((u) =>
          u
            ? {
                ...u,
                prenom: this.prenom().trim(),
                nom: this.nom().trim(),
                telephone: this.telephone().trim(),
                adresse: this.adresse().trim(),
                nomComplet: `${this.prenom().trim()} ${this.nom().trim()}`
              }
            : null
        );
      },
      error: (err) => {
        this.chargement.set(false);
        this.messageErreur.set(
          err.error?.message || err.error?.detail || 'Une erreur est survenue lors de la mise à jour.'
        );
      }
    });
  }

  enregistrerVehicule(): void {
    this.messageSucces.set(null);
    this.messageErreur.set(null);

    this.chargement.set(true);

    const formData = new FormData();
    formData.append('type_vehicule', this.typeVehicule());
    formData.append('nom_vehicule', this.nomVehicule().trim());
    formData.append('immatriculation', this.immatriculation().trim());
    formData.append('zone_principale', this.zonePrincipale().trim());

    this.serviceLivreur.mettreAJourProfilLivreur(formData).subscribe({
      next: () => {
        this.chargement.set(false);
        this.messageSucces.set('Vos informations de véhicule et zone ont été enregistrées.');
      },
      error: (err) => {
        this.chargement.set(false);
        this.messageErreur.set(
          err.error?.message || err.error?.detail || 'Une erreur est survenue lors de la mise à jour.'
        );
      }
    });
  }

  changerMotDePasse(): void {
    this.messageSucces.set(null);
    this.messageErreur.set(null);

    const nouveau = this.nouveauMotDePasse().trim();
    const confirmation = this.confirmationMotDePasse().trim();
    const ancien = this.ancienMotDePasse().trim();

    if (!ancien) {
      this.messageErreur.set('Veuillez renseigner votre mot de passe actuel.');
      return;
    }

    if (!nouveau || nouveau.length < 6) {
      this.messageErreur.set('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (nouveau !== confirmation) {
      this.messageErreur.set('Les deux mots de passe ne correspondent pas.');
      return;
    }

    this.chargement.set(true);

    const payload = {
      ancien_mot_de_passe: ancien,
      nouveau_mot_de_passe: nouveau
    };

    this.serviceLivreur.mettreAJourProfilLivreur(payload).subscribe({
      next: () => {
        this.chargement.set(false);
        this.messageSucces.set('Votre mot de passe a été modifié avec succès.');
        this.ancienMotDePasse.set('');
        this.nouveauMotDePasse.set('');
        this.confirmationMotDePasse.set('');
      },
      error: (err) => {
        this.chargement.set(false);
        this.messageErreur.set(
          err.error?.message || err.error?.detail || 'Ancien mot de passe invalide.'
        );
      }
    });
  }

  seDeconnecter(): void {
    this.serviceAuth.deconnecter();
    this.router.navigate(['/connexion']);
  }
}
