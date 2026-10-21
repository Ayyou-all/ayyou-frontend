import { CommonModule } from '@angular/common';
import { MenuLivreurComponent } from '../../../partages/composants/menu-livreur/menu-livreur.component';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import {
  ErreursChamps,
  estTelephoneValide,
  lireErreursServeur,
  MESSAGE_CHAMPS_EN_ROUGE
} from '../../../socle/outils/erreurs-formulaire';

@Component({
  selector: 'app-profil-livreur',
  standalone: true,
  imports: [MenuLivreurComponent, CommonModule, FormsModule, RouterModule],
  templateUrl: './profil-livreur.component.html'
})
export class ProfilLivreurComponent implements OnInit {
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly serviceAuth = inject(ServiceAuthentification);
  private readonly router = inject(Router);

  // Onglet actif : 'coordonnees' | 'vehicule' | 'documents' | 'securite'
  readonly ongletActif = signal<'coordonnees' | 'vehicule' | 'documents' | 'securite'>('coordonnees');

  // Coordonnées personnelles
  readonly prenom = signal<string>('');
  readonly nom = signal<string>('');
  readonly courriel = signal<string>('');
  readonly telephone = signal<string>('');
  // Où le livreur reçoit ses gains (saisi à l'inscription)
  readonly numeroReversement = signal<string>('');
  readonly operateurReversement = signal<string>('');

  // Véhicule & Logistique
  readonly typeVehicule = signal<string>('MOTO');
  readonly nomVehicule = signal<string>('');
  readonly immatriculation = signal<string>('');
  readonly zonePrincipale = signal<string>('');

  // Documents & Permis
  readonly documents = signal<any[]>([]);
  readonly fichierPermisRecto = signal<File | null>(null);
  readonly fichierPermisVerso = signal<File | null>(null);
  readonly nomPermisRecto = signal<string | null>(null);
  readonly nomPermisVerso = signal<string | null>(null);

  // Sécurité
  readonly ancienMotDePasse = signal<string>('');
  readonly nouveauMotDePasse = signal<string>('');
  readonly confirmationMotDePasse = signal<string>('');

  // Gestion de la photo
  readonly fichierPhoto = signal<File | null>(null);
  readonly apercuPhoto = signal<string | null>(null);

  // Liste des zones de livraison disponibles (rigoureusement identique à l'inscription)
  readonly listeZones: string[] = [
    'Dakar - Almadies / Plateau',
    'Dakar - Point E / Mermoz',
    'Dakar - Parcelles / Grand Yoff',
    'Pikine / Guédiawaye',
    'Rufisque / Diamniadio',
    'Thiès',
    'Mbour / Saly',
    'Saint-Louis'
  ];

  // Types de véhicules rigoureusement identiques à l'inscription (Moto, Vélo, Voiture)
  readonly listeTypesVehicule = [
    { valeur: 'MOTO', libelle: 'Moto', icone: 'fa-solid fa-motorcycle' },
    { valeur: 'VELO', libelle: 'Vélo', icone: 'fa-solid fa-bicycle' },
    { valeur: 'VOITURE', libelle: 'Voiture', icone: 'fa-solid fa-car' }
  ];

  // Statuts d'interaction
  readonly chargement = signal<boolean>(false);
  readonly messageSucces = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);
  // Erreurs affichées sous chaque champ (champ entouré en rouge)
  readonly erreursChamps = signal<ErreursChamps>({});

  erreur(champ: string): string | undefined {
    return this.erreursChamps()[champ];
  }

  effacerErreur(champ: string): void {
    if (!this.erreursChamps()[champ]) return;
    const { [champ]: _, ...autres } = this.erreursChamps();
    this.erreursChamps.set(autres);
    if (Object.keys(autres).length === 0) this.messageErreur.set(null);
  }

  /** Affiche les erreurs d'une section ; renvoie vrai s'il y en a. */
  private afficherErreursChamps(erreurs: ErreursChamps): boolean {
    this.erreursChamps.set(erreurs);
    const messages = Object.values(erreurs);
    if (messages.length === 0) return false;
    this.messageErreur.set(messages.length === 1 ? messages[0] : MESSAGE_CHAMPS_EN_ROUGE);
    return true;
  }

  private afficherErreursServeur(err: any, messageParDefaut: string): void {
    this.chargement.set(false);
    const { message, champs } = lireErreursServeur(err, {}, messageParDefaut);
    this.erreursChamps.set(champs);
    this.messageErreur.set(message);
  }

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

    this.typeVehicule.set(profil.typeVehicule || user?.typeVehicule || 'MOTO');
    this.nomVehicule.set(profil.nomVehicule || user?.nomVehicule || '');
    this.immatriculation.set(profil.immatriculation || user?.immatriculation || '');
    this.zonePrincipale.set(profil.zonePrincipale || user?.zonePrincipale || '');

    if (profil.adressePhoto) {
      this.apercuPhoto.set(profil.adressePhoto);
    } else if (user?.adressePhoto) {
      this.apercuPhoto.set(user.adressePhoto);
    }
  }

  private appliquerDonneesProfil(data: any): void {
    const user = this.serviceAuth.utilisateurConnecte();
    if (data.prenom !== undefined || user?.prenom) {
      this.prenom.set(data.prenom || user?.prenom || '');
    }
    if (data.nom !== undefined || user?.nom) {
      this.nom.set(data.nom || user?.nom || '');
    }
    if (data.courriel !== undefined || user?.courriel) {
      this.courriel.set(data.courriel || user?.courriel || '');
    }
    if (data.telephone !== undefined || user?.telephone) {
      this.telephone.set(data.telephone || user?.telephone || '');
    }
    if (data.numero_reversement !== undefined) {
      this.numeroReversement.set(data.numero_reversement || '');
    }
    if (data.operateur_reversement !== undefined) {
      this.operateurReversement.set(data.operateur_reversement || '');
    }
    if (data.typeVehicule || data.type_vehicule) {
      this.typeVehicule.set(data.typeVehicule || data.type_vehicule);
    }
    if (data.nomVehicule !== undefined || data.nom_vehicule !== undefined) {
      this.nomVehicule.set(data.nomVehicule ?? data.nom_vehicule ?? '');
    }
    if (data.immatriculation !== undefined) {
      this.immatriculation.set(data.immatriculation ?? '');
    }
    if (data.zonePrincipale !== undefined || data.zone_principale !== undefined) {
      this.zonePrincipale.set(data.zonePrincipale ?? data.zone_principale ?? '');
    }
    if (data.adressePhoto || data.adresse_photo || user?.adressePhoto) {
      this.apercuPhoto.set(data.adressePhoto || data.adresse_photo || user?.adressePhoto || null);
    }
    if (data.documents && Array.isArray(data.documents)) {
      this.documents.set(data.documents);
    }
  }

  changerOnglet(onglet: 'coordonnees' | 'vehicule' | 'documents' | 'securite'): void {
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

    const erreurs: ErreursChamps = {};
    if (!this.prenom().trim()) erreurs['prenom'] = 'Le prénom est obligatoire.';
    if (!this.nom().trim()) erreurs['nom'] = 'Le nom est obligatoire.';
    if (!this.telephone().trim()) erreurs['telephone'] = 'Le numéro de téléphone est obligatoire.';
    else if (!estTelephoneValide(this.telephone())) erreurs['telephone'] = 'Numéro invalide (ex. : +221 77 123 45 67).';
    if (this.numeroReversement().trim() && !estTelephoneValide(this.numeroReversement())) {
      erreurs['numero_reversement'] = 'Numéro Mobile Money invalide (ex. : 77 123 45 67).';
    }
    if (this.afficherErreursChamps(erreurs)) return;

    this.chargement.set(true);

    const formData = new FormData();
    formData.append('prenom', this.prenom().trim());
    formData.append('nom', this.nom().trim());
    formData.append('telephone', this.telephone().trim());
    formData.append('numero_reversement', this.numeroReversement().replace(/\s+/g, ''));
    if (this.operateurReversement()) formData.append('operateur_reversement', this.operateurReversement());

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
                nomComplet: `${this.prenom().trim()} ${this.nom().trim()}`
              }
            : null
        );
      },
      error: (err) => this.afficherErreursServeur(err, 'Une erreur est survenue lors de la mise à jour.')
    });
  }

  enregistrerVehicule(): void {
    this.messageSucces.set(null);
    this.messageErreur.set(null);

    const erreurs: ErreursChamps = {};
    if (this.typeVehicule() !== 'VELO' && !this.immatriculation().trim()) {
      erreurs['immatriculation'] = "L'immatriculation est obligatoire pour une moto, un scooter ou une voiture.";
    }
    if (!this.zonePrincipale().trim()) erreurs['zone_principale'] = "Indiquez votre zone d'activité.";
    if (this.afficherErreursChamps(erreurs)) return;

    this.chargement.set(true);

    const formData = new FormData();
    formData.append('type_vehicule', this.typeVehicule());
    formData.append('immatriculation', this.immatriculation().trim());
    formData.append('zone_principale', this.zonePrincipale().trim());
    if (this.nomVehicule()) {
      formData.append('nom_vehicule', this.nomVehicule().trim());
    }

    this.serviceLivreur.mettreAJourProfilLivreur(formData).subscribe({
      next: (res) => {
        this.chargement.set(false);
        this.messageSucces.set('Vos informations de véhicule et zone ont été enregistrées.');
        this.serviceAuth.utilisateurConnecte.update((u) =>
          u
            ? {
                ...u,
                typeVehicule: this.typeVehicule() as any,
                nomVehicule: this.nomVehicule().trim(),
                immatriculation: this.immatriculation().trim(),
                zonePrincipale: this.zonePrincipale().trim()
              }
            : null
        );
      },
      error: (err) => this.afficherErreursServeur(err, 'Une erreur est survenue lors de la mise à jour.')
    });
  }

  selectionnerPermisRecto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fichier = input.files[0];
      this.fichierPermisRecto.set(fichier);
      this.nomPermisRecto.set(fichier.name);
    }
  }

  selectionnerPermisVerso(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fichier = input.files[0];
      this.fichierPermisVerso.set(fichier);
      this.nomPermisVerso.set(fichier.name);
    }
  }

  enregistrerDocuments(): void {
    this.messageSucces.set(null);
    this.messageErreur.set(null);

    if (!this.fichierPermisRecto() && !this.fichierPermisVerso()) {
      this.messageErreur.set('Veuillez sélectionner au moins un fichier pour votre permis.');
      return;
    }

    this.chargement.set(true);

    const formData = new FormData();
    if (this.fichierPermisRecto()) {
      formData.append('permis_recto', this.fichierPermisRecto()!);
    }
    if (this.fichierPermisVerso()) {
      formData.append('permis_verso', this.fichierPermisVerso()!);
    }

    this.serviceLivreur.mettreAJourProfilLivreur(formData).subscribe({
      next: (res) => {
        this.chargement.set(false);
        this.messageSucces.set('Vos documents justificatifs ont été téléversés avec succès.');
        this.fichierPermisRecto.set(null);
        this.fichierPermisVerso.set(null);
        this.nomPermisRecto.set(null);
        this.nomPermisVerso.set(null);
        if (res?.documents) {
          this.documents.set(res.documents);
        }
      },
      error: (err) => this.afficherErreursServeur(err, 'Erreur lors du téléversement des pièces justificatives.')
    });
  }

  changerMotDePasse(): void {
    this.messageSucces.set(null);
    this.messageErreur.set(null);

    const nouveau = this.nouveauMotDePasse().trim();
    const confirmation = this.confirmationMotDePasse().trim();
    const ancien = this.ancienMotDePasse().trim();

    const erreurs: ErreursChamps = {};
    if (!ancien) erreurs['ancien_mot_de_passe'] = 'Indiquez votre mot de passe actuel.';
    if (!nouveau) erreurs['nouveau_mot_de_passe'] = 'Choisissez un nouveau mot de passe.';
    else if (nouveau.length < 6) erreurs['nouveau_mot_de_passe'] = 'Au moins 6 caractères.';
    if (nouveau !== confirmation) erreurs['confirmation_mot_de_passe'] = 'Les deux mots de passe ne sont pas identiques.';
    if (this.afficherErreursChamps(erreurs)) return;

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
      error: (err) => this.afficherErreursServeur(err, 'Le mot de passe n\'a pas pu être modifié.')
    });
  }

  seDeconnecter(): void {
    this.serviceAuth.deconnecter();
    this.router.navigate(['/connexion']);
  }
}
