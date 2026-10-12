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
  readonly telephoneSaisi = signal<string>('77 000 00 00');
  readonly indicatifTelephone = signal<string>('+221');
  readonly menuIndicatifsOuvert = signal<boolean>(false);
  readonly courrielSaisi = signal<string>('fatou.diop@ayyou.sn');
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
  readonly chiffresCode = signal<string[]>(['4', '8', '2', '']);
  readonly secondesRestantes = signal<number>(30);
  readonly peutRenvoyerCode = signal<boolean>(false);
  private identifiantMinuteur: any = null;

  // Texte du destinataire pour l'étape de vérification (Adresse e-mail)
  readonly destinataireVerification = computed(() => {
    return this.courrielSaisi() ? this.courrielSaisi().trim() : 'fatou.diop@ayyou.sn';
  });

  readonly minuteurFormate = computed(() => {
    const s = this.secondesRestantes();
    return s < 10 ? `00:0${s}` : `00:${s}`;
  });

  // Spécifique restaurant (Étape 3 Infos Restaurant)
  readonly nomRestaurantSaisi = signal<string>('Le Teranga Food');
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
  readonly adresseCompleteRestaurantSaisie = signal<string>('Almadies, Route de la Corniche Ouest, Dakar');
  readonly tempsPreparationMoyenSaisi = signal<string>('20-30 min');
  readonly logoRestaurantUrl = signal<string | null>(null);
  readonly photoCouvertureRestaurantUrl = signal<string | null>(null);
  readonly documentJustificatifNom = signal<string | null>(null);
  readonly heureOuvertureDebut = signal<string>('09:00 AM');
  readonly heureOuvertureFin = signal<string>('10:00 PM');
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
  readonly numeroPlaqueSaisi = signal<string>('AA-123-BB');
  readonly zoneActiviteSaisie = signal<string>('Dakar - Almadies / Plateau');
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
  readonly numeroMobileMoneySaisi = signal<string>('77 000 00 00');
  readonly operateurPaiementChoisi = signal<'WAVE' | 'ORANGE_MONEY'>('WAVE');
  readonly nomEtablissementSaisi = signal<string>('Le Teranga Food');
  readonly typeVehiculeSaisi = signal<'MOTO' | 'VELO' | 'VOITURE' | 'SCOOTER'>('MOTO');

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

  utiliserMaPositionActuelle(): void {
    this.positionEnCours.set(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.positionEnCours.set(false);
          this.adresseLivraisonSaisie.set('Almadies, Dakar, Sénégal (Position GPS)');
        },
        () => {
          this.positionEnCours.set(false);
          this.adresseLivraisonSaisie.set('Plateau, Dakar, Sénégal');
        }
      );
    } else {
      this.positionEnCours.set(false);
      this.adresseLivraisonSaisie.set('Point E, Dakar, Sénégal');
    }
  }

  selectionnerPhotoProfil(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        this.photoProfilUrl.set(e.target?.result as string);
      };
      lecteur.readAsDataURL(champFichier.files[0]);
    }
  }

  selectionnerLogoRestaurant(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        this.logoRestaurantUrl.set(e.target?.result as string);
      };
      lecteur.readAsDataURL(champFichier.files[0]);
    }
  }

  selectionnerPhotoCouvertureRestaurant(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      const lecteur = new FileReader();
      lecteur.onload = (e) => {
        this.photoCouvertureRestaurantUrl.set(e.target?.result as string);
      };
      lecteur.readAsDataURL(champFichier.files[0]);
    }
  }

  selectionnerDocumentJustificatif(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      this.documentJustificatifNom.set(champFichier.files[0].name);
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
      this.permisRectoNom.set(champFichier.files[0].name);
    }
  }

  selectionnerPermisVerso(evenement: Event): void {
    const champFichier = evenement.target as HTMLInputElement;
    if (champFichier.files && champFichier.files[0]) {
      this.permisVersoNom.set(champFichier.files[0].name);
    }
  }

  selectionnerOperateurPaiement(operateur: 'WAVE' | 'ORANGE_MONEY'): void {
    this.operateurPaiementChoisi.set(operateur);
  }

  soumettreInscription(): void {
    this.serviceAuthentification.chargementEnCours.set(true);

    setTimeout(() => {
      this.serviceAuthentification.chargementEnCours.set(false);
      // Étape 4 : Affichage de la page de Vérification de sécurité
      this.etapeActuelle.set(4);
      this.demarrerMinuteurVerification();
    }, 500);
  }

  demarrerMinuteurVerification(): void {
    if (this.identifiantMinuteur) {
      clearInterval(this.identifiantMinuteur);
    }
    this.secondesRestantes.set(30);
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
    this.demarrerMinuteurVerification();
    this.messageErreur.set(null);
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
    this.serviceAuthentification.chargementEnCours.set(true);

    setTimeout(() => {
      this.serviceAuthentification.chargementEnCours.set(false);
      // Étape 5 : Affichage de la page Succès "Compte créé !"
      this.etapeActuelle.set(5);
      this.inscriptionReussie.set(true);
    }, 600);
  }

  allerVersDecouvrirRestaurants(): void {
    this.serviceAuthentification
      .connecterAvecRolePredefini(this.roleChoisi() as RoleUtilisateur)
      .subscribe({
        next: () => {
          this.routeur.navigate(['/accueil']);
        }
      });
  }

  retournerAccueil(): void {
    this.routeur.navigate(['/accueil']);
  }
}
