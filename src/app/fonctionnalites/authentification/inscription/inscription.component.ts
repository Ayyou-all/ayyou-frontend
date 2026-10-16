import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoleUtilisateur } from '../../../socle/modeles/utilisateur.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

export type RoleInscription = 'CLIENT' | 'RESTAURANT' | 'LIVREUR';

export interface OptionProfilInscription {
  role: RoleInscription;
  titre: string;
  description: string;
  icone: string;
  classeFondIcone: string;
  classeCouleurIcone: string;
}

export interface IndicatifPays {
  code: string;
  indicatif: string;
  pays: string;
  drapeau: string;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inscription.component.html',
  styleUrl: './inscription.component.css'
})
export class InscriptionComponent {
  protected readonly serviceAuthentification = inject(ServiceAuthentification);
  private readonly routeur = inject(Router);

  // Étapes du parcours : 1=Rôle, 2=Infos, 3=Profil & Adresse, 4=Vérification Sécurité, 5=Succès
  readonly etapeActuelle = signal<number>(1);
  readonly totalEtapes = 3;

  // Choix du rôle (Étape 1)
  readonly roleChoisi = signal<RoleInscription>('CLIENT');

  // Coordonnées & Sécurité (Étape 2)
  readonly nomCompletSaisi = signal<string>('');
  readonly prenomSaisi = signal<string>('');
  readonly nomSaisi = signal<string>('');
  readonly telephoneSaisi = signal<string>('');
  readonly indicatifTelephone = signal<string>('+221');
  readonly menuIndicatifsOuvert = signal<boolean>(false);
  readonly courrielSaisi = signal<string>('');
  readonly motDePasseSaisi = signal<string>('');
  readonly confirmationMotDePasseSaisi = signal<string>('');
  readonly motDePasseVisible = signal<boolean>(false);
  readonly confirmationMotDePasseVisible = signal<boolean>(false);
  readonly conditionsAcceptees = signal<boolean>(true);

  // Profil & Adresse (Étape 3)
  readonly adresseLivraisonSaisie = signal<string>('');
  readonly photoProfilUrl = signal<string | null>(null);
  readonly positionEnCours = signal<boolean>(false);

  // Vérification de sécurité / Code OTP (Étape 4)
  readonly chiffresCode = signal<string[]>(['', '', '', '', '', '']);
  readonly secondesRestantes = signal<number>(120);
  readonly peutRenvoyerCode = signal<boolean>(false);
  private identifiantMinuteur: any = null;

  // Texte du destinataire pour l'étape de vérification (Adresse e-mail)
  readonly destinataireVerification = computed(() => {
    return this.courrielSaisi() ? this.courrielSaisi().trim() : '';
  });

  readonly minuteurFormate = computed(() => {
    const s = this.secondesRestantes();
    const minutes = Math.floor(s / 60);
    const secondes = s % 60;
    const strMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const strSec = secondes < 10 ? `0${secondes}` : `${secondes}`;
    return `${strMin}:${strSec}`;
  });

  // Spécifique restaurant (Étape 3 Infos Restaurant)
  readonly nomRestaurantSaisi = signal<string>('');
  readonly categorieRestaurantSaisie = signal<string>('Cuisine sénégalaise');
  readonly menuCategoriesOuvert = signal<boolean>(false);
  readonly listeCategories: string[] = [
    'Cuisine sénégalaise',
    'Fast Food',
    'Grillades & Barbecue',
    'Pâtisserie & Desserts',
    'Plats traditionnels',
    'Jus locaux & Boissons'
  ];
  readonly adresseCompleteRestaurantSaisie = signal<string>('');
  readonly tempsPreparationMoyenSaisi = signal<string>('20-30 min');
  readonly logoRestaurantUrl = signal<string | null>(null);
  readonly photoCouvertureRestaurantUrl = signal<string | null>(null);
  readonly documentJustificatifNom = signal<string | null>(null);
  readonly fichierDocumentJustificatif = signal<File | null>(null);
  readonly fichierLogo = signal<File | null>(null);
  readonly fichierCouverture = signal<File | null>(null);
  readonly fichierPermisRecto = signal<File | null>(null);
  readonly fichierPermisVerso = signal<File | null>(null);
  readonly heureOuvertureDebut = signal<string>('09:00'); // format HH:MM (champ <input type="time">)
  readonly heureOuvertureFin = signal<string>('22:00');
  // Position GPS réelle du restaurant (obligatoire : frais de livraison et dispatch des livreurs)
  readonly latitudeRestaurant = signal<number | null>(null);
  readonly longitudeRestaurant = signal<number | null>(null);
  readonly joursSemaine = signal<{ code: string; libelle: string; actif: boolean }[]>([
    { code: 'L', libelle: 'Lundi', actif: true },
    { code: 'M', libelle: 'Mardi', actif: true },
    { code: 'M', libelle: 'Mercredi', actif: true },
    { code: 'J', libelle: 'Jeudi', actif: true },
    { code: 'V', libelle: 'Vendredi', actif: true },
    { code: 'S', libelle: 'Samedi', actif: false },
    { code: 'D', libelle: 'Dimanche', actif: false }
  ]);

  // Spécifique livreur (Étape 3 Infos Livreur)
  readonly typeVehiculeChoisi = signal<'MOTO' | 'VELO' | 'VOITURE'>('MOTO');
  readonly numeroPlaqueSaisi = signal<string>('');
  readonly zoneActiviteSaisie = signal<string>('');
  readonly fichierPhotoProfil = signal<File | null>(null);
  readonly menuVillesOuvert = signal<boolean>(false);
  readonly listeVilles: string[] = [
    'Dakar - Almadies / Plateau',
    'Dakar - Point E / Mermoz',
    'Dakar - Parcelles / Grand Yoff',
    'Pikine / Guédiawaye',
    'Rufisque / Diamniadio',
    'Thiès',
    'Mbour / Saly',
    'Saint-Louis'
  ];
  readonly permisRectoNom = signal<string | null>(null);
  readonly permisVersoNom = signal<string | null>(null);
  readonly numeroMobileMoneySaisi = signal<string>('');
  readonly operateurPaiementChoisi = signal<'WAVE' | 'ORANGE_MONEY'>('WAVE');
  readonly nomEtablissementSaisi = signal<string>('');

  // Messages d'état
  readonly messageErreur = signal<string | null>(null);
  readonly inscriptionReussie = signal<boolean>(false);

  // Liste des indicatifs
  readonly listeIndicatifs: IndicatifPays[] = [
    { code: 'SN', indicatif: '+221', pays: 'Sénégal', drapeau: '🇸🇳' },
    { code: 'CI', indicatif: '+225', pays: 'Côte d’Ivoire', drapeau: '🇨🇮' },
    { code: 'ML', indicatif: '+223', pays: 'Mali', drapeau: '🇲🇱' },
    { code: 'GN', indicatif: '+224', pays: 'Guinée', drapeau: '🇬🇳' },
    { code: 'FR', indicatif: '+33', pays: 'France', drapeau: '🇫🇷' }
  ];

  // Options de l'étape 1
  readonly optionsProfil: OptionProfilInscription[] = [
    {
      role: 'CLIENT',
      titre: 'Client',
      description: 'Commandez vos plats préférés',
      icone: 'fa-solid fa-bag-shopping',
      classeFondIcone: 'bg-amber-50',
      classeCouleurIcone: 'text-red-600'
    },
    {
      role: 'RESTAURANT',
      titre: 'Restaurant',
      description: 'Recevez et gérez vos commandes',
      icone: 'fa-solid fa-utensils',
      classeFondIcone: 'bg-slate-100',
      classeCouleurIcone: 'text-slate-500'
    },
    {
      role: 'LIVREUR',
      titre: 'Livreur',
      description: 'Livrez et gagnez de l’argent',
      icone: 'fa-solid fa-motorcycle',
      classeFondIcone: 'bg-slate-100',
      classeCouleurIcone: 'text-slate-500'
    }
  ];

  selectionnerRole(role: RoleInscription): void {
    this.roleChoisi.set(role);
  }

  basculerMenuIndicatifs(): void {
    this.menuIndicatifsOuvert.update((ouvert) => !ouvert);
  }

  selectionnerIndicatif(indicatif: string): void {
    this.indicatifTelephone.set(indicatif);
    this.menuIndicatifsOuvert.set(false);
  }

  basculerVisibiliteMotDePasse(): void {
    this.motDePasseVisible.update((visible) => !visible);
  }

  basculerVisibiliteConfirmation(): void {
    this.confirmationMotDePasseVisible.update((visible) => !visible);
  }

  passerEtapeSuivante(): void {
    this.messageErreur.set(null);

    // Étape 1 : Rôle
    if (this.etapeActuelle() === 1) {
      this.etapeActuelle.set(2);
      return;
    }

    // Étape 2 : Informations personnelles
    if (this.etapeActuelle() === 2) {
      if (!this.nomCompletSaisi().trim()) {
        this.messageErreur.set('Veuillez renseigner votre nom complet (Prénom et Nom).');
        return;
      }
      if (!this.courrielSaisi().trim() || !this.courrielSaisi().includes('@')) {
        this.messageErreur.set('Veuillez renseigner une adresse e-mail valide pour la sécurité et la vérification.');
        return;
      }
      if (!this.motDePasseSaisi().trim()) {
        this.messageErreur.set('Veuillez définir un mot de passe.');
        return;
      }
      if (this.motDePasseSaisi().trim().length < 6) {
        this.messageErreur.set('Le mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (this.motDePasseSaisi() !== this.confirmationMotDePasseSaisi()) {
        this.messageErreur.set('Les mots de passe ne correspondent pas.');
        return;
      }
      if (!this.conditionsAcceptees()) {
        this.messageErreur.set('Veuillez accepter les conditions d’utilisation.');
        return;
      }

      this.etapeActuelle.set(3);
      return;
    }

    // Étape 3 : Profil (Client) OU Infos Restaurant (Restaurant) OU Infos Livreur (Livreur)
    if (this.etapeActuelle() === 3) {
      if (this.roleChoisi() === 'RESTAURANT') {
        if (!this.nomRestaurantSaisi().trim()) {
          this.messageErreur.set('Veuillez renseigner le nom de votre établissement.');
          return;
        }
        if (!this.adresseCompleteRestaurantSaisie().trim()) {
          this.messageErreur.set("Veuillez renseigner l'adresse complète de votre restaurant.");
          return;
        }
        if (this.latitudeRestaurant() === null || this.longitudeRestaurant() === null) {
          this.messageErreur.set('Touchez « Localiser » pour enregistrer la position GPS de votre restaurant.');
          return;
        }
        if (!this.joursOuvertureEnTexte()) {
          this.messageErreur.set("Sélectionnez au moins un jour d'ouverture.");
          return;
        }
      } else if (this.roleChoisi() === 'LIVREUR') {
        if (this.typeVehiculeChoisi() !== 'VELO' && !this.numeroPlaqueSaisi().trim()) {
          this.messageErreur.set('Veuillez renseigner le numéro de plaque de votre véhicule.');
          return;
        }
        if (!this.zoneActiviteSaisie().trim()) {
          this.messageErreur.set("Veuillez sélectionner votre zone d'activité.");
          return;
        }
        if (!this.numeroMobileMoneySaisi().trim()) {
          this.messageErreur.set('Veuillez renseigner votre numéro Mobile Money pour recevoir vos paiements.');
          return;
        }
      }
      this.soumettreInscription();
      return;
    }

    // Étape 4 : Vérification du code
    if (this.etapeActuelle() === 4) {
      this.validerCodeVerification();
      return;
    }
  }

  revenirEtapePrecedente(): void {
    this.messageErreur.set(null);
    if (this.etapeActuelle() > 1 && this.etapeActuelle() <= 4) {
      this.etapeActuelle.update((etape) => etape - 1);
    } else {
      this.routeur.navigate(['/connexion']);
    }
  }

  /**
   * Adresse du client à partir de sa position GPS réelle (géocodage inverse OpenStreetMap).
   * Si la position n'est pas disponible, le client saisit son adresse à la main.
   */
  utiliserMaPositionActuelle(): void {
    this.localiserAppareil((adresse) => this.adresseLivraisonSaisie.set(adresse));
  }

  /** Position GPS réelle du restaurant (le gérant doit être sur place pendant l'inscription). */
  localiserRestaurant(): void {
    this.localiserAppareil((adresse, latitude, longitude) => {
      this.latitudeRestaurant.set(latitude);
      this.longitudeRestaurant.set(longitude);
      if (!this.adresseCompleteRestaurantSaisie().trim()) this.adresseCompleteRestaurantSaisie.set(adresse);
    });
  }

  private localiserAppareil(surPosition: (adresse: string, latitude: number, longitude: number) => void): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.messageErreur.set("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    this.positionEnCours.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((reponse) => reponse.json())
          .then((donnees) => {
            const a = donnees.address || {};
            const adresse = [a.road, a.suburb || a.neighbourhood, a.city || a.town].filter(Boolean).join(', ');
            surPosition(adresse, latitude, longitude);
          })
          .catch(() => surPosition('', latitude, longitude))
          .finally(() => this.positionEnCours.set(false));
      },
      () => {
        this.positionEnCours.set(false);
        this.messageErreur.set("Impossible d'obtenir votre position. Autorisez la localisation puis réessayez.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /** Jours actifs au format attendu par le serveur : "0,1,2" (0 = lundi). */
  private joursOuvertureEnTexte(): string {
    return this.joursSemaine()
      .map((jour, index) => (jour.actif ? String(index) : null))
      .filter((jour) => jour !== null)
      .join(',');
  }

  selectionnerPhotoProfil(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const fichier = champFichier.files[0];
      this.fichierPhotoProfil.set(fichier);
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        this.photoProfilUrl.set(e.target?.result as string);
      };
      lecteur.readAsDataURL(fichier);
    }
  }

  selectionnerLogoRestaurant(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const fichier = champFichier.files[0];
      this.fichierLogo.set(fichier);
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        this.logoRestaurantUrl.set(e.target?.result as string);
      };
      lecteur.readAsDataURL(fichier);
    }
  }

  selectionnerPhotoCouvertureRestaurant(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const fichier = champFichier.files[0];
      this.fichierCouverture.set(fichier);
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        this.photoCouvertureRestaurantUrl.set(e.target?.result as string);
      };
      lecteur.readAsDataURL(fichier);
    }
  }

  selectionnerDocumentJustificatif(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const fichier = champFichier.files[0];
      this.documentJustificatifNom.set(fichier.name);
      this.fichierDocumentJustificatif.set(fichier);
    }
  }

  basculerJourSemaine(index: number): void {
    const jours = [...this.joursSemaine()];
    jours[index] = { ...jours[index], actif: !jours[index].actif };
    this.joursSemaine.set(jours);
  }

  basculerMenuCategories(): void {
    this.menuCategoriesOuvert.update((ouvert) => !ouvert);
  }

  selectionnerCategorie(categorie: string): void {
    this.categorieRestaurantSaisie.set(categorie);
    this.menuCategoriesOuvert.set(false);
  }

  selectionnerTypeVehicule(type: 'MOTO' | 'VELO' | 'VOITURE'): void {
    this.typeVehiculeChoisi.set(type);
  }

  basculerMenuVilles(): void {
    this.menuVillesOuvert.update((ouvert) => !ouvert);
  }

  selectionnerZoneActivite(zone: string): void {
    this.zoneActiviteSaisie.set(zone);
    this.menuVillesOuvert.set(false);
  }

  selectionnerPermisRecto(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const fichier = champFichier.files[0];
      this.permisRectoNom.set(fichier.name);
      this.fichierPermisRecto.set(fichier);
    }
  }

  selectionnerPermisVerso(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const fichier = champFichier.files[0];
      this.permisVersoNom.set(fichier.name);
      this.fichierPermisVerso.set(fichier);
    }
  }

  selectionnerOperateurPaiement(operateur: 'WAVE' | 'ORANGE_MONEY'): void {
    this.operateurPaiementChoisi.set(operateur);
  }

  soumettreInscription(): void {
    const courriel = this.courrielSaisi().trim().toLowerCase();
    if (!courriel || !courriel.includes('@')) {
      this.messageErreur.set('Veuillez renseigner une adresse e-mail valide pour recevoir le code de sécurité.');
      return;
    }

    this.messageErreur.set(null);
    this.serviceAuthentification.chargementEnCours.set(true);

    this.serviceAuthentification.envoyerCodeVerification(courriel).subscribe({
      next: () => {
        this.serviceAuthentification.chargementEnCours.set(false);
        this.chiffresCode.set(['', '', '', '', '', '']);
        this.etapeActuelle.set(4);
        this.demarrerMinuteurVerification();
      },
      error: (err) => {
        this.serviceAuthentification.chargementEnCours.set(false);
        const msg = err?.error?.message || err?.error?.detail || "Impossible d'envoyer le code de vérification par e-mail. Veuillez vérifier votre adresse.";
        this.messageErreur.set(msg);
      }
    });
  }

  demarrerMinuteurVerification(): void {
    if (this.identifiantMinuteur) {
      clearInterval(this.identifiantMinuteur);
    }
    this.secondesRestantes.set(120);
    this.peutRenvoyerCode.set(false);

    this.identifiantMinuteur = setInterval(() => {
      const restant = this.secondesRestantes();
      if (restant > 1) {
        this.secondesRestantes.set(restant - 1);
      } else {
        this.secondesRestantes.set(0);
        this.peutRenvoyerCode.set(true);
        clearInterval(this.identifiantMinuteur);
      }
    }, 1000);
  }

  renvoyerCodeVerification(): void {
    const courriel = this.courrielSaisi().trim().toLowerCase();
    if (!courriel) {
      this.messageErreur.set('Adresse e-mail manquante.');
      return;
    }

    this.messageErreur.set(null);
    this.serviceAuthentification.chargementEnCours.set(true);

    this.serviceAuthentification.envoyerCodeVerification(courriel).subscribe({
      next: () => {
        this.serviceAuthentification.chargementEnCours.set(false);
        this.chiffresCode.set(['', '', '', '', '', '']);
        this.demarrerMinuteurVerification();
      },
      error: (err) => {
        this.serviceAuthentification.chargementEnCours.set(false);
        const msg = err?.error?.message || err?.error?.detail || 'Échec du renvoi du code de vérification.';
        this.messageErreur.set(msg);
      }
    });
  }

  saisirChiffre(index: number, evenement: Event, champSuivant?: HTMLInputElement): void {
    const champ = evenement.target as HTMLInputElement;
    const valeur = champ.value;
    const chiffre = valeur ? valeur.slice(-1) : '';
    const nouveauxChiffres = [...this.chiffresCode()];
    nouveauxChiffres[index] = chiffre;
    this.chiffresCode.set(nouveauxChiffres);
    champ.value = chiffre;

    if (chiffre && champSuivant) {
      champSuivant.focus();
      champSuivant.select();
    }
  }

  gererToucheCode(index: number, evenement: KeyboardEvent, champPrecedent?: HTMLInputElement): void {
    if (evenement.key === 'Backspace') {
      const champ = evenement.target as HTMLInputElement;
      if (!champ.value && champPrecedent) {
        champPrecedent.focus();
        champPrecedent.select();
      }
    }
  }

  validerCodeVerification(): void {
    this.messageErreur.set(null);
    const codeSaisi = this.chiffresCode().join('').trim();
    if (codeSaisi.length !== 6) {
      this.messageErreur.set('Veuillez renseigner le code complet à 6 chiffres reçu par e-mail.');
      return;
    }

    const courriel = this.courrielSaisi().trim().toLowerCase();
    if (!courriel) {
      this.messageErreur.set('Adresse e-mail introuvable.');
      return;
    }

    let prenom = this.prenomSaisi().trim();
    let nom = this.nomSaisi().trim();
    if (!prenom && this.nomCompletSaisi().trim()) {
      const parties = this.nomCompletSaisi().trim().split(' ');
      prenom = parties[0];
      nom = parties.slice(1).join(' ') || parties[0];
    }
    if (!nom || !prenom) {
      this.messageErreur.set('Veuillez renseigner votre prénom et nom.');
      return;
    }

    const motDePasse = this.motDePasseSaisi().trim();
    if (!motDePasse || motDePasse.length < 6) {
      this.messageErreur.set('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    const confirmation = this.confirmationMotDePasseSaisi().trim();
    if (motDePasse !== confirmation) {
      this.messageErreur.set('Les mots de passe ne correspondent pas.');
      return;
    }

    const tel = `${this.indicatifTelephone()}${this.telephoneSaisi()}`.replace(/\s+/g, '');
    if (!this.telephoneSaisi().trim()) {
      this.messageErreur.set('Veuillez renseigner un numéro de téléphone.');
      return;
    }

    this.serviceAuthentification.chargementEnCours.set(true);

    // 1. Vérification réelle du code OTP via l'API SMTP
    this.serviceAuthentification.verifierCodeVerification(courriel, codeSaisi).subscribe({
      next: () => {
        // 2. Inscription réelle de l'utilisateur
        this.serviceAuthentification
          .inscrire({
            prenom,
            nom,
            courriel,
            telephone: tel,
            motDePasse,
            confirmationMotDePasse: confirmation,
            role: this.roleChoisi() as RoleUtilisateur,
            nomEtablissement: this.roleChoisi() === 'RESTAURANT' ? this.nomRestaurantSaisi().trim() : undefined,
            typeVehicule: this.roleChoisi() === 'LIVREUR' ? (this.typeVehiculeChoisi() as any) : undefined,
            immatriculation: this.roleChoisi() === 'LIVREUR' ? this.numeroPlaqueSaisi().trim() : undefined,
            zonePrincipale: this.roleChoisi() === 'LIVREUR' ? this.zoneActiviteSaisie().trim() : undefined,
            photo: this.fichierPhotoProfil(),
            adresse: this.roleChoisi() === 'RESTAURANT' ? this.adresseCompleteRestaurantSaisie().trim() : this.adresseLivraisonSaisie().trim(),
            conditionsAcceptees: true,
            documentJustificatif: this.fichierDocumentJustificatif(),
            logo: this.fichierLogo(),
            couverture: this.fichierCouverture(),
            permisRecto: this.fichierPermisRecto(),
            permisVerso: this.fichierPermisVerso(),
            ...(this.roleChoisi() === 'RESTAURANT'
              ? {
                  latitude: this.latitudeRestaurant(),
                  longitude: this.longitudeRestaurant(),
                  specialite: this.categorieRestaurantSaisie(),
                  heureOuverture: this.heureOuvertureDebut(),
                  heureFermeture: this.heureOuvertureFin(),
                  joursOuverture: this.joursOuvertureEnTexte(),
                  delaiLivraisonTexte: this.tempsPreparationMoyenSaisi().trim()
                }
              : {}),
            ...(this.roleChoisi() === 'LIVREUR'
              ? {
                  numeroReversement: this.numeroMobileMoneySaisi().replace(/\s+/g, ''),
                  operateurReversement: this.operateurPaiementChoisi()
                }
              : {})
          })
          .subscribe({
            next: () => {
              this.serviceAuthentification.chargementEnCours.set(false);
              this.etapeActuelle.set(5);
              this.inscriptionReussie.set(true);
            },
            error: (err) => {
              this.serviceAuthentification.chargementEnCours.set(false);
              let detailErreur = '';
              if (err?.error?.mot_de_passe) {
                const mdpErr = Array.isArray(err.error.mot_de_passe) ? err.error.mot_de_passe.join(' ') : err.error.mot_de_passe;
                detailErreur = `Mot de passe : ${mdpErr}`;
              } else if (err?.error?.detail) {
                detailErreur = err.error.detail;
              } else if (err?.error?.message) {
                detailErreur = err.error.message;
              } else if (typeof err?.error === 'object' && err?.error !== null) {
                detailErreur = Object.values(err.error).flat().join(' ');
              }
              this.messageErreur.set(detailErreur || "Échec de la création du compte. Veuillez vérifier vos informations.");
            }
          });
      },
      error: (err) => {
        this.serviceAuthentification.chargementEnCours.set(false);
        const msg = err?.error?.message || err?.error?.detail || 'Code de vérification incorrect ou expiré. Veuillez vérifier votre boîte e-mail.';
        this.messageErreur.set(msg);
      }
    });
  }

  allerVersDecouvrirRestaurants(): void {
    this.routeur.navigate(['/connexion']);
  }

  retournerAccueil(): void {
    this.routeur.navigate(['/accueil']);
  }
}
