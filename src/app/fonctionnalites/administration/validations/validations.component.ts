import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type OngletTypePartenaire = 'TOUS' | 'RESTAURANTS' | 'LIVREURS';

export type TypeDocumentOfficiel =
  | 'RCCM'
  | 'NINEA'
  | 'CNI'
  | 'PERMIS'
  | 'ASSURANCE'
  | 'CARTE_GRISE'
  | 'SANITAIRE'
  | 'BAIL'
  | 'RESIDENCE'
  | 'PAIEMENT';

export interface DetailLigneDocument {
  libelle: string;
  valeur: string;
}

export interface DocumentPartenaire {
  identifiantDoc: string;
  nom: string;
  type: string;
  typeDocument: TypeDocumentOfficiel;
  tailleFichier: string;
  dateTeleversement: string;
  urlFichier: string;
  nomFichier: string;
  estImage: boolean;
  estPdf: boolean;
  estValide: boolean;
  statutVerification: 'VERIFIE' | 'A_VERIFIER' | 'REJETE';

  // Contenu informatif
  titreOfficiel?: string;
  sousTitreOfficiel?: string;
  numeroOfficiel?: string;
  autoriteEmettrice?: string;
  ministere?: string;
  dateDelivrance?: string;
  dateExpiration?: string;
  titulaireNom?: string;
  detailsChamps?: DetailLigneDocument[];
  mentionsLegales?: string[];
  lieuDelivrance?: string;
  signataireNom?: string;
  signataireFonction?: string;
  tamponTexte?: string;
  numeroSecuriteQr?: string;
  remarqueSuperadmin?: string;
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
export class ValidationsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  // Onglet sélectionné (Tous, Restaurants, Livreurs)
  readonly ongletActif = signal<OngletTypePartenaire>('TOUS');

  // Filtres de recherche
  readonly rechercheTexte = signal<string>('');
  readonly filtreRegion = signal<string>('TOUTES');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 6;

  // Données dynamiques des partenaires connectées au backend
  readonly listePartenaires = signal<PartenaireAValider[]>([]);
  readonly chargementEnCours = signal<boolean>(false);

  // Modale de vérification du partenaire
  readonly partenaireSelectionne = signal<PartenaireAValider | null>(null);
  readonly modaleVerificationOuverte = signal<boolean>(false);
  readonly notificationSucces = signal<string | null>(null);

  // Refus d'un dossier : le motif est obligatoire, il est envoyé par e-mail au partenaire
  readonly saisieMotifRejet = signal<boolean>(false);
  readonly motifRejet = signal<string>('');
  readonly decisionEnCours = signal<boolean>(false);

  // Modale d'inspection du document détaillé
  readonly documentEnConsultation = signal<DocumentPartenaire | null>(null);
  readonly indexDocumentEnCours = signal<number>(0);
  readonly modaleDocumentOuverte = signal<boolean>(false);
  readonly facteurZoom = signal<number>(100);

  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Les pièces justificatives sont privées : leur URL d'API exige le jeton JWT.
   * Une balise <img> ou <iframe> ne peut pas l'envoyer, donc on télécharge le fichier
   * avec HttpClient (l'intercepteur ajoute le jeton) puis on l'affiche via une URL locale « blob: ».
   */
  readonly urlFichierLocal = signal<string | null>(null);
  readonly erreurChargementDocument = signal<string | null>(null);

  readonly urlDocumentSecurisee = computed<SafeResourceUrl | null>(() => {
    const url = this.urlFichierLocal();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  constructor() {
    effect(() => {
      const doc = this.documentEnConsultation();
      untracked(() => this.chargerFichierProtege(doc));
    });
  }

  private chargerFichierProtege(doc: DocumentPartenaire | null): void {
    const ancienneUrl = this.urlFichierLocal();
    if (ancienneUrl) URL.revokeObjectURL(ancienneUrl);
    this.urlFichierLocal.set(null);
    this.erreurChargementDocument.set(null);
    if (!doc || !doc.urlFichier) return;

    this.http.get(doc.urlFichier, { responseType: 'blob' }).subscribe({
      next: (fichier) => this.urlFichierLocal.set(URL.createObjectURL(fichier)),
      error: () => this.erreurChargementDocument.set("Impossible d'ouvrir ce document. Vérifiez votre connexion.")
    });
  }

  ngOnInit(): void {
    this.chargerPartenaires();
  }

  chargerPartenaires(): void {
    this.chargementEnCours.set(true);
    forkJoin({
      etablissements: this.http.get<any>(`${environment.apiUrl}/administration/etablissements/`),
      livreurs: this.http.get<any>(`${environment.apiUrl}/administration/livreurs/`)
    }).subscribe({
      next: ({ etablissements, livreurs }) => {
        const listeEtab: any[] = Array.isArray(etablissements) ? etablissements : ((etablissements as any)?.results || []);
        const listeLiv: any[] = Array.isArray(livreurs) ? livreurs : ((livreurs as any)?.results || []);

        const listeE: PartenaireAValider[] = listeEtab.map((e: any) => {
          const docs = this.construireDocuments(e, 'RESTAURANT');
          const docsValides = docs.filter((d) => d.estValide).length;
          return {
            identifiant: String(e.id),
            nom: e.nom,
            specialiteOuVehicule: e.specialite || 'Restauration',
            telephone: e.telephone || e.telephoneGerant || '',
            courriel: e.emailGerant || '',
            region: e.quartier_ville || e.adresse || '',
            adresseComplete: e.adresse || 'Dakar, Sénégal',
            type: 'RESTAURANT' as const,
            iconeOuPhoto: e.adresse_logo || e.logo || 'fa-solid fa-utensils',
            estPhoto: !!(e.adresse_logo || e.logo),
            classeFondIcone: 'bg-rose-50 text-[#E51824]',
            documentsFournis: docsValides,
            documentsTotal: docs.length,
            listeDocuments: docs,
            dateSoumission: e.date_creation
              ? new Date(e.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              : '',
            statut:
              e.statut_validation === 'ACTIF'
                ? 'VALIDE'
                : e.statut_validation === 'SUSPENDU' || e.statut_validation === 'REJETE'
                ? 'REJETE'
                : 'EN_ATTENTE',
            noteInterne: e.motif_decision || ''
          };
        });

        const listeL: PartenaireAValider[] = listeLiv.map((l: any) => {
          const docs = this.construireDocuments(l, 'LIVREUR');
          const docsValides = docs.filter((d) => d.estValide).length;
          return {
            identifiant: String(l.id),
            nom: l.nomComplet || 'Coursier AYYOU',
            specialiteOuVehicule: l.nom_vehicule || l.type_vehicule || 'Moto',
            telephone: l.telephone || '',
            courriel: l.email || '',
            region: l.zone_principale || '',
            adresseComplete: l.zone_principale || 'Dakar, Sénégal',
            type: 'LIVREUR' as const,
            iconeOuPhoto: l.photo || 'fa-solid fa-motorcycle',
            estPhoto: !!l.photo,
            classeFondIcone: 'bg-purple-50 text-purple-600',
            documentsFournis: docsValides,
            documentsTotal: docs.length,
            listeDocuments: docs,
            dateSoumission: l.dateInscription
              ? new Date(l.dateInscription).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              : '',
            statut:
              l.statut_validation === 'ACTIF'
                ? 'VALIDE'
                : l.statut_validation === 'SUSPENDU' || l.statut_validation === 'REJETE'
                ? 'REJETE'
                : 'EN_ATTENTE',
            noteInterne: l.motif_decision || ''
          };
        });

        const total = [...listeE, ...listeL];
        this.listePartenaires.set(total);
        this.chargementEnCours.set(false);

        // Si paramètre cible d'URL (ex: "4" ou "rest-4")
        const cible = this.route.snapshot.queryParamMap.get('cible');
        if (cible) {
          const cibleNettoyee = cible.replace('rest-', '').replace('liv-', '');
          const trouve = total.find((p) => p.identifiant === cible || p.identifiant === cibleNettoyee);
          if (trouve) {
            this.ouvrirVerification(trouve);
          }
        }
      },
      error: (err) => {
        console.error('Erreur chargement validations:', err);
        this.chargementEnCours.set(false);
      }
    });
  }

  private formaterUrlFichier(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const base = environment.mediaUrl.replace(/\/+$/, '');
    const chemin = url.startsWith('/') ? url : `/${url}`;
    return `${base}${chemin}`;
  }

  private obtenirLibelleDocument(typeDoc: string, idx: number, total: number, nomFichier: string = ''): string {
    const lowerNom = nomFichier.toLowerCase();
    switch (typeDoc) {
      case 'PERMIS_CONDUIRE':
        if (lowerNom.includes('recto') || idx === 0) {
          return 'Permis de conduire (Recto)';
        }
        if (lowerNom.includes('verso') || idx === 1) {
          return 'Permis de conduire (Verso)';
        }
        return `Permis de conduire (Pièce ${idx + 1})`;
      case 'CNI':
        return 'Carte Nationale d\'Identité (CNI)';
      case 'RCCM':
        return 'Registre du Commerce (RCCM)';
      case 'NINEA':
        return 'Numéro NINEA';
      case 'CERTIFICAT_HYGIENE':
        return 'Autorisation d\'exploitation / Certificat d\'hygiène';
      case 'CARTE_GRISE':
        return 'Carte grise du véhicule';
      case 'ASSURANCE':
        return 'Attestation d\'assurance';
      default:
        return typeDoc || 'Document justificatif';
    }
  }

  private construireDocuments(data: any, type: 'RESTAURANT' | 'LIVREUR'): DocumentPartenaire[] {
    const backendDocs = data.documents || [];
    const docsFinaux: DocumentPartenaire[] = [];

    // 1. Documents justificatifs officiels téléversés par le partenaire
    backendDocs.forEach((d: any, idx: number) => {
      const nomFichierReel = d.nom_fichier || (d.fichier ? d.fichier.split('/').pop() : `document-${idx + 1}`);
      const urlComplete = this.formaterUrlFichier(d.url_fichier || d.fichier);
      const estPdf = !!d.est_pdf || nomFichierReel.toLowerCase().endsWith('.pdf') || urlComplete.toLowerCase().endsWith('.pdf');
      const estImage = !!d.est_image || /\.(png|jpe?g|webp|gif|svg)$/i.test(nomFichierReel) || /\.(png|jpe?g|webp|gif|svg)$/i.test(urlComplete);
      const typeFichier = estPdf ? 'PDF' : estImage ? 'IMAGE' : (d.extension?.toUpperCase() || 'DOCUMENT');
      const nomLisible = this.obtenirLibelleDocument(d.type_document, idx, backendDocs.length, nomFichierReel);

      docsFinaux.push({
        identifiantDoc: `doc-${data.id}-${d.id || idx}`,
        nom: nomLisible,
        type: typeFichier,
        typeDocument: (d.type_document as TypeDocumentOfficiel) || 'RCCM',
        tailleFichier: d.taille_fichier || 'Fichier certifié',
        dateTeleversement: d.date_envoi
          ? new Date(d.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          : '',
        urlFichier: urlComplete,
        nomFichier: nomFichierReel,
        estImage,
        estPdf,
        estValide: d.statut === 'VALIDE' || d.statut === 'CONFORME',
        statutVerification:
          d.statut === 'VALIDE' || d.statut === 'CONFORME'
            ? 'VERIFIE'
            : d.statut === 'REJETE'
            ? 'REJETE'
            : 'A_VERIFIER',
        titreOfficiel: nomLisible,
        sousTitreOfficiel: 'PIÈCE JUSTIFICATIVE IMPORTÉE',
        numeroOfficiel: nomFichierReel,
        autoriteEmettrice: 'Fichier importé par le partenaire',
        ministere: type === 'RESTAURANT' ? 'Dossier Partenaire Restaurant' : 'Dossier Partenaire Coursier',
        dateDelivrance: d.date_envoi ? new Date(d.date_envoi).toLocaleDateString('fr-FR') : 'Date importation',
        titulaireNom: type === 'RESTAURANT' ? data.nom : (data.nomComplet || data.nom),
        detailsChamps: [
          { libelle: 'Nom du fichier', valeur: nomFichierReel },
          { libelle: 'Type de pièce', valeur: nomLisible },
          { libelle: 'Taille du fichier', valeur: d.taille_fichier || 'Standard' },
          { libelle: 'Statut de conformité', valeur: d.statut || 'En attente' }
        ],
        mentionsLegales: ['Document importé directement par le partenaire lors de son inscription.'],
        lieuDelivrance: 'Sénégal',
        signataireNom: 'Service Conformité AYYOU',
        signataireFonction: 'Vérification Superadmin',
        tamponTexte: 'AYYOU SÉNÉGAL • CONFORMITÉ',
        numeroSecuriteQr: `DOC-${d.id || idx}`
      });
    });

    // 2. Pièces visuelles téléversées pour Restaurant (Logo & Couverture)
    if (type === 'RESTAURANT') {
      const urlLogo = this.formaterUrlFichier(data.adresse_logo || data.logo);
      if (urlLogo) {
        const nomFichierLogo = urlLogo.split('/').pop() || 'logo_etablissement.png';
        docsFinaux.push({
          identifiantDoc: `etab-${data.id}-logo`,
          nom: 'Logo officiel de l\'établissement',
          type: 'IMAGE',
          typeDocument: 'CNI',
          tailleFichier: 'Image HD',
          dateTeleversement: 'Inscription',
          urlFichier: urlLogo,
          nomFichier: nomFichierLogo,
          estImage: true,
          estPdf: false,
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: 'Logo officiel de l\'établissement',
          sousTitreOfficiel: 'IDENTITÉ VISUELLE IMPORTÉE',
          numeroOfficiel: nomFichierLogo,
          autoriteEmettrice: 'Importé par l\'établissement',
          ministere: 'Dossier Partenaire Restaurant',
          dateDelivrance: 'Inscription',
          titulaireNom: data.nom,
          detailsChamps: [
            { libelle: 'Fichier', valeur: nomFichierLogo },
            { libelle: 'Usage', valeur: 'Logo de vitrine et d\'application' }
          ],
          mentionsLegales: ['Logo officiel de la marque importé par le restaurant.'],
          lieuDelivrance: 'Sénégal',
          signataireNom: 'Service Marque AYYOU',
          signataireFonction: 'Validation Visuelle',
          tamponTexte: 'AYYOU SÉNÉGAL • LOGO CERTIFIÉ',
          numeroSecuriteQr: `LOGO-${data.id}`
        });
      }

      const urlCouv = this.formaterUrlFichier(data.adresse_couverture || data.couverture);
      if (urlCouv) {
        const nomFichierCouv = urlCouv.split('/').pop() || 'couverture_etablissement.jpg';
        docsFinaux.push({
          identifiantDoc: `etab-${data.id}-couverture`,
          nom: 'Bannière / Couverture de la vitrine',
          type: 'IMAGE',
          typeDocument: 'CNI',
          tailleFichier: 'Bannière HD',
          dateTeleversement: 'Inscription',
          urlFichier: urlCouv,
          nomFichier: nomFichierCouv,
          estImage: true,
          estPdf: false,
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: 'Bannière de couverture de l\'établissement',
          sousTitreOfficiel: 'VITRINE IMPORTÉE',
          numeroOfficiel: nomFichierCouv,
          autoriteEmettrice: 'Importé par l\'établissement',
          ministere: 'Dossier Partenaire Restaurant',
          dateDelivrance: 'Inscription',
          titulaireNom: data.nom,
          detailsChamps: [
            { libelle: 'Fichier', valeur: nomFichierCouv },
            { libelle: 'Usage', valeur: 'Bannière de couverture vitrine' }
          ],
          mentionsLegales: ['Bannière de restaurant importée par le partenaire.'],
          lieuDelivrance: 'Sénégal',
          signataireNom: 'Service Marque AYYOU',
          signataireFonction: 'Validation Visuelle',
          tamponTexte: 'AYYOU SÉNÉGAL • BANNIÈRE CERTIFIÉE',
          numeroSecuriteQr: `COUV-${data.id}`
        });
      }
    }

    // 3. Photo du livreur
    if (type === 'LIVREUR') {
      const urlPhoto = this.formaterUrlFichier(data.photo);
      if (urlPhoto) {
        const nomFichierPhoto = urlPhoto.split('/').pop() || 'photo_coursier.jpg';
        docsFinaux.push({
          identifiantDoc: `liv-${data.id}-photo`,
          nom: 'Photo d\'identité / Portrait du coursier',
          type: 'IMAGE',
          typeDocument: 'CNI',
          tailleFichier: 'Photo',
          dateTeleversement: 'Inscription',
          urlFichier: urlPhoto,
          nomFichier: nomFichierPhoto,
          estImage: true,
          estPdf: false,
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: 'Photo d\'identité du coursier',
          sousTitreOfficiel: 'PORTRAIT IMPORTÉ',
          numeroOfficiel: nomFichierPhoto,
          autoriteEmettrice: 'Importé par le coursier',
          ministere: 'Dossier Partenaire Coursier',
          dateDelivrance: 'Inscription',
          titulaireNom: data.nomComplet || data.nom,
          detailsChamps: [
            { libelle: 'Fichier', valeur: nomFichierPhoto },
            { libelle: 'Usage', valeur: 'Photo de profil pour les clients' }
          ],
          mentionsLegales: ['Photo d\'identification officielle du coursier.'],
          lieuDelivrance: 'Sénégal',
          signataireNom: 'Service Conformité AYYOU',
          signataireFonction: 'Validation Portrait',
          tamponTexte: 'AYYOU SÉNÉGAL • PORTRAIT',
          numeroSecuriteQr: `PHOTO-${data.id}`
        });
      }
    }

    return docsFinaux;
  }

  // Filtrage selon l'onglet (Tous / Restaurants / Livreurs) et les critères de recherche
  readonly partenairesFiltres = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();
    const region = this.filtreRegion();

    return this.listePartenaires().filter((partenaire) => {
      // Un partenaire déjà validé ne doit plus apparaître dans la section des validations
      if (partenaire.statut === 'VALIDE') {
        return false;
      }

      // Filtre d'onglet
      if (onglet === 'RESTAURANTS' && partenaire.type !== 'RESTAURANT') {
        return false;
      }
      if (onglet === 'LIVREURS' && partenaire.type !== 'LIVREUR') {
        return false;
      }

      // Filtre textuel
      if (recherche) {
        const correspondNom = (partenaire.nom || '').toLowerCase().includes(recherche);
        const correspondSpecialite = (partenaire.specialiteOuVehicule || '').toLowerCase().includes(recherche);
        const correspondRegion = (partenaire.region || '').toLowerCase().includes(recherche);
        if (!correspondNom && !correspondSpecialite && !correspondRegion) {
          return false;
        }
      }

      // Filtre région
      if (region !== 'TOUTES' && !(partenaire.region || '').includes(region)) {
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

  ouvrirVerification(partenaire: PartenaireAValider): void {
    this.partenaireSelectionne.set({ ...partenaire });
    this.modaleVerificationOuverte.set(true);
  }

  fermerVerification(): void {
    this.modaleVerificationOuverte.set(false);
    this.partenaireSelectionne.set(null);
    this.saisieMotifRejet.set(false);
    this.motifRejet.set('');
    this.fermerApercuDocument();
  }

  ouvrirApercuDocument(documentCible: DocumentPartenaire, index: number = 0): void {
    this.documentEnConsultation.set(documentCible);
    this.indexDocumentEnCours.set(index);
    this.facteurZoom.set(100);
    this.modaleDocumentOuverte.set(true);
  }

  fermerApercuDocument(): void {
    this.modaleDocumentOuverte.set(false);
    this.documentEnConsultation.set(null);
    this.facteurZoom.set(100);
  }

  documentPrecedent(): void {
    const partenaire = this.partenaireSelectionne();
    if (!partenaire || partenaire.listeDocuments.length === 0) return;

    const nouvelIndex =
      this.indexDocumentEnCours() > 0
        ? this.indexDocumentEnCours() - 1
        : partenaire.listeDocuments.length - 1;

    this.indexDocumentEnCours.set(nouvelIndex);
    this.documentEnConsultation.set(partenaire.listeDocuments[nouvelIndex]);
  }

  documentSuivant(): void {
    const partenaire = this.partenaireSelectionne();
    if (!partenaire || partenaire.listeDocuments.length === 0) return;

    const nouvelIndex =
      this.indexDocumentEnCours() < partenaire.listeDocuments.length - 1
        ? this.indexDocumentEnCours() + 1
        : 0;

    this.indexDocumentEnCours.set(nouvelIndex);
    this.documentEnConsultation.set(partenaire.listeDocuments[nouvelIndex]);
  }

  ajusterZoom(delta: number): void {
    const niveau = Math.min(Math.max(this.facteurZoom() + delta, 70), 160);
    this.facteurZoom.set(niveau);
  }

  reinitialiserZoom(): void {
    this.facteurZoom.set(100);
  }

  marquerDocumentConforme(): void {
    const docActuel = this.documentEnConsultation();
    const partenaire = this.partenaireSelectionne();
    if (!docActuel || !partenaire) return;

    const documentsMisAJour = partenaire.listeDocuments.map((doc) =>
      doc.identifiantDoc === docActuel.identifiantDoc
        ? { ...doc, estValide: true, statutVerification: 'VERIFIE' as const }
        : doc
    );

    const docValidesCompte = documentsMisAJour.filter((d) => d.estValide).length;

    const partenaireMaj: PartenaireAValider = {
      ...partenaire,
      documentsFournis: docValidesCompte,
      listeDocuments: documentsMisAJour
    };

    this.partenaireSelectionne.set(partenaireMaj);

    this.listePartenaires.update((liste) =>
      liste.map((p) => (p.identifiant === partenaireMaj.identifiant ? partenaireMaj : p))
    );

    this.documentEnConsultation.set({
      ...docActuel,
      estValide: true,
      statutVerification: 'VERIFIE'
    });

    this.notificationSucces.set(`Le document "${docActuel.nom}" a été validé comme conforme.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  marquerDocumentNonConforme(): void {
    const docActuel = this.documentEnConsultation();
    const partenaire = this.partenaireSelectionne();
    if (!docActuel || !partenaire) return;

    const documentsMisAJour = partenaire.listeDocuments.map((doc) =>
      doc.identifiantDoc === docActuel.identifiantDoc
        ? { ...doc, estValide: false, statutVerification: 'A_VERIFIER' as const }
        : doc
    );

    const docValidesCompte = documentsMisAJour.filter((d) => d.estValide).length;

    const partenaireMaj: PartenaireAValider = {
      ...partenaire,
      documentsFournis: docValidesCompte,
      listeDocuments: documentsMisAJour
    };

    this.partenaireSelectionne.set(partenaireMaj);

    this.listePartenaires.update((liste) =>
      liste.map((p) => (p.identifiant === partenaireMaj.identifiant ? partenaireMaj : p))
    );

    this.documentEnConsultation.set({
      ...docActuel,
      estValide: false,
      statutVerification: 'A_VERIFIER'
    });

    this.notificationSucces.set(`Le document "${docActuel.nom}" a été marqué comme nécessitant une vérification.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  telechargerDocumentActuel(): void {
    const doc = this.documentEnConsultation();
    const url = this.urlFichierLocal();
    if (!doc || !url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = doc.nomFichier || doc.nom || 'document_ayyou';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.notificationSucces.set(`Téléchargement de "${doc.nom}" lancé.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  ouvrirFichierNouvelOnglet(): void {
    const url = this.urlFichierLocal();
    if (url) window.open(url, '_blank');
  }

  imprimerDocumentActuel(): void {
    const doc = this.documentEnConsultation();
    const url = this.urlFichierLocal();
    if (!doc || !url) return;
    if (doc.type === 'PDF') {
      window.open(url, '_blank');
    } else {
      const fenetre = window.open('', '_blank');
      if (fenetre) {
        fenetre.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${doc.nom}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                img { max-width: 100%; max-height: 95vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${url}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        fenetre.document.close();
      }
    }
  }

  validerPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p || this.decisionEnCours()) return;
    this.envoyerDecision(p, { nouveau_statut: 'ACTIF' }, 'VALIDE');
  }

  /** Premier clic : affiche le champ du motif. Second clic : envoie le refus. */
  rejeterPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p || this.decisionEnCours()) return;
    if (!this.saisieMotifRejet()) {
      this.saisieMotifRejet.set(true);
      return;
    }
    const motif = this.motifRejet().trim();
    if (!motif) return;
    this.envoyerDecision(p, { nouveau_statut: 'SUSPENDU', motif_decision: motif }, 'REJETE');
  }

  annulerRejet(): void {
    this.saisieMotifRejet.set(false);
    this.motifRejet.set('');
  }

  private envoyerDecision(
    p: PartenaireAValider,
    corps: { nouveau_statut: string; motif_decision?: string },
    statutAffiche: 'VALIDE' | 'REJETE'
  ): void {
    const url =
      p.type === 'RESTAURANT'
        ? `${environment.apiUrl}/administration/etablissements/${p.identifiant}/decision/`
        : `${environment.apiUrl}/administration/livreurs/${p.identifiant}/decision/`;

    this.decisionEnCours.set(true);
    this.http.post<{ emailEnvoye: boolean | null }>(url, corps).subscribe({
      next: (reponse) => {
        this.decisionEnCours.set(false);
        this.listePartenaires.update((liste) =>
          liste.map((item) => (item.identifiant === p.identifiant ? { ...item, statut: statutAffiche } : item))
        );
        const action = statutAffiche === 'VALIDE' ? `Le compte de "${p.nom}" a été activé.` : `La demande de "${p.nom}" a été rejetée.`;
        const email =
          reponse?.emailEnvoye === false
            ? " Attention : l'e-mail au partenaire n'a pas pu partir."
            : ' Le partenaire a été prévenu par e-mail.';
        this.notificationSucces.set(action + email);
        this.fermerVerification();
        this.chargerPartenaires();
        setTimeout(() => this.notificationSucces.set(null), 4000);
      },
      error: (erreur) => {
        this.decisionEnCours.set(false);
        const detail = erreur?.error?.motif_decision?.[0] || erreur?.error?.message;
        this.notificationSucces.set(detail || `Erreur lors du traitement de "${p.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 4000);
      }
    });
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
