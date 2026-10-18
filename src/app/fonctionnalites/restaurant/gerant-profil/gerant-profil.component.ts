import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CATEGORIES_RESTAURANT } from '../../../socle/modeles/restaurant.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

@Component({
  selector: 'app-gerant-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gerant-profil.component.html'
})
// Profil conforme aux données strictes de l'inscription
export class GerantProfilComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly serviceAuth = inject(ServiceAuthentification);
  private readonly routeur = inject(Router);

  readonly chargementInitial = signal<boolean>(true);
  readonly chargementAction = signal<boolean>(false);
  readonly messageSucces = signal<string | null>(null);
  readonly messageErreur = signal<string | null>(null);

  // Modale de confirmation de déconnexion
  readonly modaleDeconnexionOuverte = signal<boolean>(false);

  // =========================================================================
  // INFORMATIONS DE L'INSCRIPTION
  // =========================================================================

  // Établissement (Restaurant)
  nomRestaurant = '';
  adresseRestaurant = '';
  readonly urlCouverture = signal<string | null>(null);
  readonly apercuCouverture = signal<string | null>(null);
  fichierCouverture: File | null = null;

  // Catégorie choisie à l'inscription (liste identique)
  specialite = '';
  readonly listeCategories = CATEGORIES_RESTAURANT;

  // Horaires d'ouverture (en dehors, les clients ne peuvent pas commander)
  heureOuverture = '';
  heureFermeture = '';
  readonly joursOuverture = signal<boolean[]>([true, true, true, true, true, true, true]);
  readonly nomsJours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly localisationEnCours = signal<boolean>(false);

  readonly urlLogo = signal<string | null>(null);
  readonly apercuLogo = signal<string | null>(null);
  fichierLogo: File | null = null;

  // Gérant (Coordonnées personnelles)
  prenom = '';
  nom = '';
  telephone = '';
  courriel = '';

  // Sécurité (Mot de passe)
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  confirmationMotDePasse = '';
  readonly masquerAncienMdp = signal<boolean>(true);
  readonly masquerNouveauMdp = signal<boolean>(true);
  readonly masquerConfirmationMdp = signal<boolean>(true);

  ngOnInit(): void {
    this.chargerDonneesInscription();
  }

  /**
   * Récupère uniquement les informations saisies lors de l'inscription.
   */
  chargerDonneesInscription(): void {
    this.chargementInitial.set(true);
    this.messageErreur.set(null);

    const requeteUser = this.http.get<any>(`${environment.apiUrl}/utilisateurs/moi/`);
    const requeteEtab = this.http.get<any>(`${environment.apiUrl}/etablissements/mon-etablissement/`);

    forkJoin({ user: requeteUser, etab: requeteEtab }).subscribe({
      next: ({ user, etab }) => {
        if (user) {
          this.prenom = user.prenom || '';
          this.nom = user.nom || '';
          this.telephone = user.telephone || '';
          this.courriel = user.courriel || '';
          this.serviceAuth.mettreAJourUtilisateur(user);
        }
        if (etab) {
          this.nomRestaurant = etab.nom || '';
          this.adresseRestaurant = etab.adresse || '';
          this.urlLogo.set(etab.adresse_logo || null);
          this.urlCouverture.set(etab.adresse_couverture || null);
          this.specialite = etab.specialite || '';
          this.heureOuverture = etab.heure_ouverture ? String(etab.heure_ouverture).slice(0, 5) : '';
          this.heureFermeture = etab.heure_fermeture ? String(etab.heure_fermeture).slice(0, 5) : '';
          const jours = String(etab.jours_ouverture || '').split(',');
          this.joursOuverture.set(this.nomsJours.map((_, index) => jours.includes(String(index))));
          this.latitude.set(etab.latitude != null ? Number(etab.latitude) : null);
          this.longitude.set(etab.longitude != null ? Number(etab.longitude) : null);
        }
        this.chargementInitial.set(false);
      },
      error: () => {
        // Fallback session locale si besoin
        const u = this.serviceAuth.utilisateurConnecte();
        if (u) {
          this.prenom = u.prenom || '';
          this.nom = u.nom || '';
          this.telephone = u.telephone || '';
          this.courriel = u.courriel || '';
          if (u.nomEtablissement) {
            this.nomRestaurant = u.nomEtablissement;
          }
        }
        this.chargementInitial.set(false);
      }
    });
  }

  // =========================================================================
  // GESTION DU LOGO ET DE LA COUVERTURE
  // =========================================================================

  choisirCouverture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.fichierCouverture = file;
      const reader = new FileReader();
      reader.onload = () => this.apercuCouverture.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  choisirLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.fichierLogo = file;
      const reader = new FileReader();
      reader.onload = () => this.apercuLogo.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  basculerJour(index: number): void {
    this.joursOuverture.update((jours) => jours.map((actif, i) => (i === index ? !actif : actif)));
  }

  /** Ancienne catégorie hors liste : on la garde dans le choix pour ne pas la perdre. */
  categoriesProposees(): string[] {
    return this.specialite && !this.listeCategories.includes(this.specialite)
      ? [this.specialite, ...this.listeCategories]
      : this.listeCategories;
  }

  /**
   * Comme à l'inscription : prend la position actuelle (le gérant doit être au restaurant)
   * et remplit l'adresse complète si elle est vide.
   */
  localiserRestaurant(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.messageErreur.set("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    this.localisationEnCours.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        this.latitude.set(latitude);
        this.longitude.set(longitude);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((reponse) => reponse.json())
          .then((donnees) => {
            const a = donnees.address || {};
            const adresse = [a.road, a.suburb || a.neighbourhood, a.city || a.town].filter(Boolean).join(', ');
            if (!this.adresseRestaurant.trim() && adresse) this.adresseRestaurant = adresse;
          })
          .catch(() => {})
          .finally(() => this.localisationEnCours.set(false));
      },
      () => {
        this.localisationEnCours.set(false);
        this.messageErreur.set("Impossible d'obtenir la position. Autorisez la localisation puis réessayez.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // =========================================================================
  // ENREGISTREMENT DES INFORMATIONS
  // =========================================================================

  /**
   * Enregistre les informations du profil et de l'établissement.
   */
  enregistrer(): void {
    this.messageSucces.set(null);
    this.messageErreur.set(null);

    if (!this.nomRestaurant.trim()) {
      this.messageErreur.set("Le nom de l'établissement est obligatoire.");
      return;
    }
    if (!this.prenom.trim() || !this.nom.trim()) {
      this.messageErreur.set('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!this.telephone.trim()) {
      this.messageErreur.set('Le numéro de téléphone est obligatoire.');
      return;
    }
    if (!this.courriel.trim()) {
      this.messageErreur.set("L'adresse e-mail est obligatoire.");
      return;
    }

    // Validation mot de passe si l'utilisateur souhaite le modifier
    const souhaiteChangerMdp = !!(this.ancienMotDePasse || this.nouveauMotDePasse || this.confirmationMotDePasse);
    if (souhaiteChangerMdp) {
      if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
        this.messageErreur.set('Pour changer de mot de passe, renseignez votre ancien mot de passe et le nouveau.');
        return;
      }
      if (this.nouveauMotDePasse.length < 8) {
        this.messageErreur.set('Le nouveau mot de passe doit comporter au moins 8 caractères.');
        return;
      }
      if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
        this.messageErreur.set('La confirmation ne correspond pas au nouveau mot de passe.');
        return;
      }
    }

    this.chargementAction.set(true);

    // 1. Préparation mise à jour gérant
    const formUser = new FormData();
    formUser.append('prenom', this.prenom.trim());
    formUser.append('nom', this.nom.trim());
    formUser.append('telephone', this.telephone.trim());
    formUser.append('courriel', this.courriel.trim().toLowerCase());

    // 2. Préparation mise à jour restaurant
    const formEtab = new FormData();
    formEtab.append('nom', this.nomRestaurant.trim());
    if (this.adresseRestaurant) {
      formEtab.append('adresse', this.adresseRestaurant.trim());
    }
    if (this.specialite) formEtab.append('specialite', this.specialite);
    if (this.heureOuverture) formEtab.append('heure_ouverture', this.heureOuverture);
    if (this.heureFermeture) formEtab.append('heure_fermeture', this.heureFermeture);
    formEtab.append(
      'jours_ouverture',
      this.joursOuverture().map((actif, index) => (actif ? String(index) : '')).filter(Boolean).join(',')
    );
    if (this.latitude() !== null && this.longitude() !== null) {
      formEtab.append('latitude', String(this.latitude()));
      formEtab.append('longitude', String(this.longitude()));
    }
    if (this.fichierLogo) {
      formEtab.append('logo', this.fichierLogo);
    }
    if (this.fichierCouverture) {
      formEtab.append('couverture', this.fichierCouverture);
    }

    const patchUser = this.http.patch<any>(`${environment.apiUrl}/utilisateurs/moi/`, formUser);
    const patchEtab = this.http.patch<any>(`${environment.apiUrl}/etablissements/mon-etablissement/`, formEtab);

    forkJoin({ userRes: patchUser, etabRes: patchEtab }).subscribe({
      next: ({ userRes, etabRes }) => {
        if (userRes) {
          this.serviceAuth.mettreAJourUtilisateur(userRes);
        }
        if (etabRes) {
          if (etabRes.adresse_logo) {
            this.urlLogo.set(etabRes.adresse_logo);
            this.apercuLogo.set(null);
            this.fichierLogo = null;
          }
          if (etabRes.adresse_couverture) {
            this.urlCouverture.set(etabRes.adresse_couverture);
            this.apercuCouverture.set(null);
            this.fichierCouverture = null;
          }
        }

        // Si l'utilisateur a aussi demandé un changement de mot de passe
        if (souhaiteChangerMdp) {
          this.http.post<any>(`${environment.apiUrl}/utilisateurs/changer-mot-de-passe/`, {
            ancien_mot_de_passe: this.ancienMotDePasse,
            nouveau_mot_de_passe: this.nouveauMotDePasse,
            confirmation_mot_de_passe: this.confirmationMotDePasse
          }).subscribe({
            next: () => {
              this.chargementAction.set(false);
              this.ancienMotDePasse = '';
              this.nouveauMotDePasse = '';
              this.confirmationMotDePasse = '';
              this.messageSucces.set('Vos informations et votre mot de passe ont été mis à jour avec succès.');
              setTimeout(() => this.messageSucces.set(null), 4000);
            },
            error: (errMdp) => {
              this.chargementAction.set(false);
              const msg = errMdp?.error?.message || 'Informations enregistrées, mais l\'ancien mot de passe était incorrect.';
              this.messageErreur.set(msg);
            }
          });
        } else {
          this.chargementAction.set(false);
          this.messageSucces.set('Vos informations ont été enregistrées avec succès.');
          setTimeout(() => this.messageSucces.set(null), 4000);
        }
      },
      error: (err) => {
        this.chargementAction.set(false);
        let msg = 'Une erreur est survenue lors de l\'enregistrement.';
        if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.error && typeof err.error === 'object') {
          const firstKey = Object.keys(err.error)[0];
          msg = `${firstKey} : ${Array.isArray(err.error[firstKey]) ? err.error[firstKey][0] : err.error[firstKey]}`;
        }
        this.messageErreur.set(msg);
      }
    });
  }

  /**
   * Déconnexion sécurisée de la session du gérant.
   */
  confirmerDeconnexion(): void {
    this.modaleDeconnexionOuverte.set(false);
    this.serviceAuth.deconnecter();
    this.routeur.navigate(['/connexion']);
  }
}
