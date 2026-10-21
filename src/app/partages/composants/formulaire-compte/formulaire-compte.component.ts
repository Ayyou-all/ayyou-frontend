import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import {
  ErreursChamps,
  estCourrielValide,
  estTelephoneValide,
  lireErreursServeur,
  MESSAGE_CHAMPS_EN_ROUGE
} from '../../../socle/outils/erreurs-formulaire';

/**
 * Modification du compte avec les routes existantes de l'API :
 * - PATCH /api/utilisateurs/moi/ : prénom, nom, e-mail, téléphone (+ adresse et photo pour le client) ;
 * - POST /api/utilisateurs/changer-mot-de-passe/ : mot de passe.
 * Aucun autre champ n'est proposé (seuls ceux saisis à l'inscription).
 */
const CHAMPS_INFORMATIONS = ['prenom', 'nom', 'courriel', 'telephone', 'adresse'];
const CHAMPS_MOT_DE_PASSE = ['ancien_mot_de_passe', 'nouveau_mot_de_passe', 'confirmation_mot_de_passe'];

@Component({
  selector: 'app-formulaire-compte',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulaire-compte.component.html',
  host: { class: 'block space-y-5' }
})
export class FormulaireCompteComponent implements OnInit {
  /** Client : adresse de livraison et photo (saisies à son inscription). */
  @Input() avecAdresse = false;
  @Input() avecPhoto = false;

  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);
  private readonly urlCompte = `${environment.apiUrl}/utilisateurs/`;

  readonly classeChamp =
    'w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#E51824] transition-colors';

  readonly prenom = signal('');
  readonly nom = signal('');
  readonly courriel = signal('');
  readonly telephone = signal('');
  readonly adresse = signal('');
  private photo: File | null = null;
  readonly apercuPhoto = signal<string | null>(null);

  readonly ancienMotDePasse = signal('');
  readonly nouveauMotDePasse = signal('');
  readonly confirmationMotDePasse = signal('');

  readonly envoiInformations = signal(false);
  readonly messageInformations = signal<string | null>(null);
  readonly erreurInformations = signal(false);
  readonly envoiMotDePasse = signal(false);
  readonly messageMotDePasse = signal<string | null>(null);
  readonly erreurMotDePasse = signal(false);

  ngOnInit(): void {
    this.http.get<any>(`${this.urlCompte}moi/`).subscribe({
      next: (compte) => {
        this.prenom.set(compte.prenom || '');
        this.nom.set(compte.nom || '');
        this.courriel.set(compte.courriel || '');
        this.telephone.set(compte.telephone || '');
        this.adresse.set(compte.adresse || '');
        this.apercuPhoto.set(compte.adresse_photo || null);
      },
      error: () => this.afficherInformations('Impossible de charger vos informations. Vérifiez votre connexion.', true)
    });
  }

  choisirPhoto(evenement: Event): void {
    const fichier = (evenement.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    this.photo = fichier;
    this.apercuPhoto.set(URL.createObjectURL(fichier));
  }

  // Erreurs affichées sous chaque champ (champ entouré en rouge)
  readonly erreursChamps = signal<ErreursChamps>({});

  erreur(champ: string): string | undefined {
    return this.erreursChamps()[champ];
  }

  effacerErreur(champ: string): void {
    if (!this.erreursChamps()[champ]) return;
    const { [champ]: _, ...autres } = this.erreursChamps();
    this.erreursChamps.set(autres);
  }

  private remplacerErreurs(champs: string[], erreurs: ErreursChamps): void {
    const autres = Object.fromEntries(Object.entries(this.erreursChamps()).filter(([champ]) => !champs.includes(champ)));
    this.erreursChamps.set({ ...autres, ...erreurs });
  }

  enregistrerInformations(): void {
    const erreurs: ErreursChamps = {};
    if (!this.prenom().trim()) erreurs['prenom'] = 'Le prénom est obligatoire.';
    if (!this.nom().trim()) erreurs['nom'] = 'Le nom est obligatoire.';
    if (!this.courriel().trim()) erreurs['courriel'] = "L'adresse e-mail est obligatoire.";
    else if (!estCourrielValide(this.courriel())) erreurs['courriel'] = 'Adresse e-mail invalide (ex. : fatou@gmail.com).';
    if (!this.telephone().trim()) erreurs['telephone'] = 'Le numéro de téléphone est obligatoire.';
    else if (!estTelephoneValide(this.telephone())) erreurs['telephone'] = 'Numéro invalide (ex. : +221 77 123 45 67).';
    this.remplacerErreurs(CHAMPS_INFORMATIONS, erreurs);
    if (Object.keys(erreurs).length > 0) {
      this.afficherInformations(MESSAGE_CHAMPS_EN_ROUGE, true);
      return;
    }
    const donnees = new FormData();
    donnees.append('prenom', this.prenom().trim());
    donnees.append('nom', this.nom().trim());
    donnees.append('courriel', this.courriel().trim().toLowerCase());
    donnees.append('telephone', this.telephone().trim());
    if (this.avecAdresse) donnees.append('adresse', this.adresse().trim());
    if (this.avecPhoto && this.photo) donnees.append('photo', this.photo);

    this.envoiInformations.set(true);
    this.afficherInformations('', false);
    this.http.patch<any>(`${this.urlCompte}moi/`, donnees).subscribe({
      next: (compte) => {
        this.envoiInformations.set(false);
        this.photo = null;
        this.serviceAuth.mettreAJourUtilisateur(compte);
        this.afficherInformations('Vos informations ont été enregistrées.', false);
      },
      error: (erreur) => {
        this.envoiInformations.set(false);
        const { message, champs } = lireErreursServeur(erreur, {}, "L'enregistrement a échoué. Vérifiez votre connexion.");
        this.remplacerErreurs(CHAMPS_INFORMATIONS, champs);
        this.afficherInformations(message, true);
      }
    });
  }

  changerMotDePasse(): void {
    const erreurs: ErreursChamps = {};
    if (!this.ancienMotDePasse()) erreurs['ancien_mot_de_passe'] = 'Indiquez votre mot de passe actuel.';
    if (!this.nouveauMotDePasse()) erreurs['nouveau_mot_de_passe'] = 'Choisissez un nouveau mot de passe.';
    else if (this.nouveauMotDePasse().length < 6) erreurs['nouveau_mot_de_passe'] = 'Au moins 6 caractères.';
    if (this.nouveauMotDePasse() !== this.confirmationMotDePasse()) {
      erreurs['confirmation_mot_de_passe'] = 'Les deux mots de passe ne sont pas identiques.';
    }
    this.remplacerErreurs(CHAMPS_MOT_DE_PASSE, erreurs);
    if (Object.keys(erreurs).length > 0) {
      this.afficherMotDePasse(MESSAGE_CHAMPS_EN_ROUGE, true);
      return;
    }
    this.envoiMotDePasse.set(true);
    this.afficherMotDePasse('', false);
    this.http
      .post<any>(`${this.urlCompte}changer-mot-de-passe/`, {
        ancien_mot_de_passe: this.ancienMotDePasse(),
        nouveau_mot_de_passe: this.nouveauMotDePasse(),
        confirmation_mot_de_passe: this.confirmationMotDePasse()
      })
      .subscribe({
        next: (reponse) => {
          this.envoiMotDePasse.set(false);
          this.ancienMotDePasse.set('');
          this.nouveauMotDePasse.set('');
          this.confirmationMotDePasse.set('');
          this.afficherMotDePasse(reponse?.message || 'Mot de passe modifié.', false);
        },
        error: (erreur) => {
          this.envoiMotDePasse.set(false);
          const { message, champs } = lireErreursServeur(erreur, {}, 'La modification a échoué. Vérifiez votre connexion.');
          this.remplacerErreurs(CHAMPS_MOT_DE_PASSE, champs);
          this.afficherMotDePasse(message, true);
        }
      });
  }

  private afficherInformations(message: string, estErreur: boolean): void {
    this.messageInformations.set(message);
    this.erreurInformations.set(estErreur);
  }

  private afficherMotDePasse(message: string, estErreur: boolean): void {
    this.messageMotDePasse.set(message);
    this.erreurMotDePasse.set(estErreur);
  }
}
