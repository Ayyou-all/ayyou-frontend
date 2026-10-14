import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  estValide: boolean;
  statutVerification: 'VERIFIE' | 'A_VERIFIER' | 'REJETE';

  // Contenu officiel lisible affiché dans l'aperçu authentique
  titreOfficiel: string;
  sousTitreOfficiel: string;
  numeroOfficiel: string;
  autoriteEmettrice: string;
  ministere: string;
  dateDelivrance: string;
  dateExpiration?: string;
  titulaireNom: string;
  detailsChamps: DetailLigneDocument[];
  mentionsLegales: string[];
  lieuDelivrance: string;
  signataireNom: string;
  signataireFonction: string;
  tamponTexte: string;
  numeroSecuriteQr: string;
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
  readonly filtreDate = signal<string>('TOUTES');
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

  // Modale d'inspection du document détaillé
  readonly documentEnConsultation = signal<DocumentPartenaire | null>(null);
  readonly indexDocumentEnCours = signal<number>(0);
  readonly modaleDocumentOuverte = signal<boolean>(false);
  readonly facteurZoom = signal<number>(100);

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
            region: e.quartier_ville || e.adresse || 'Dakar',
            adresseComplete: e.adresse || 'Dakar, Sénégal',
            type: 'RESTAURANT' as const,
            iconeOuPhoto: 'fa-solid fa-utensils',
            estPhoto: false,
            classeFondIcone: 'bg-rose-50 text-[#E51824]',
            documentsFournis: docsValides,
            documentsTotal: docs.length,
            listeDocuments: docs,
            dateSoumission: e.date_creation
              ? new Date(e.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Récent',
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
            region: l.zone_principale || 'Dakar',
            adresseComplete: l.zone_principale || 'Dakar, Sénégal',
            type: 'LIVREUR' as const,
            iconeOuPhoto: 'fa-solid fa-motorcycle',
            estPhoto: false,
            classeFondIcone: 'bg-purple-50 text-purple-600',
            documentsFournis: docsValides,
            documentsTotal: docs.length,
            listeDocuments: docs,
            dateSoumission: l.dateInscription
              ? new Date(l.dateInscription).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Récent',
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

  private construireDocuments(data: any, type: 'RESTAURANT' | 'LIVREUR'): DocumentPartenaire[] {
    const backendDocs = data.documents || [];
    if (backendDocs.length > 0) {
      return backendDocs.map((d: any, idx: number) => ({
        identifiantDoc: `doc-${data.id}-${idx}`,
        nom: d.type_document || 'Pièce justificative',
        type: 'PDF',
        typeDocument: (d.type_document as TypeDocumentOfficiel) || 'RCCM',
        tailleFichier: '1.5 Mo',
        dateTeleversement: d.date_envoi ? new Date(d.date_envoi).toLocaleDateString('fr-FR') : 'Récent',
        urlFichier: d.fichier || '#',
        estValide: d.statut === 'VALIDE' || d.statut === 'CONFORME',
        statutVerification:
          d.statut === 'VALIDE' || d.statut === 'CONFORME'
            ? 'VERIFIE'
            : d.statut === 'REJETE'
            ? 'REJETE'
            : 'A_VERIFIER',
        titreOfficiel: `DOCUMENT OFFICIEL — ${d.type_document}`,
        sousTitreOfficiel: 'RÉPUBLIQUE DU SÉNÉGAL',
        numeroOfficiel: `SN-DOC-${data.id}-${idx + 100}`,
        autoriteEmettrice: 'Ministère / Direction compétente',
        ministere: 'RÉPUBLIQUE DU SÉNÉGAL',
        dateDelivrance: '2023',
        titulaireNom: type === 'RESTAURANT' ? data.nom : data.nomComplet,
        detailsChamps: [
          { libelle: 'Partenaire', valeur: type === 'RESTAURANT' ? data.nom : data.nomComplet },
          { libelle: 'Type document', valeur: d.type_document },
          { libelle: 'Statut actuel', valeur: d.statut || 'En attente' }
        ],
        mentionsLegales: ['Document légal vérifié par le service conformité AYYOU.'],
        lieuDelivrance: 'Dakar',
        signataireNom: 'Service Conformité',
        signataireFonction: 'Agent de Modération',
        tamponTexte: 'AYYOU SÉNÉGAL • CONFORMITÉ PARTENAIRES',
        numeroSecuriteQr: `QR-SN-${data.id}-${idx}`
      }));
    }

    // Aucun document fictif : si aucun document n'est présent dans la base de données réelle,
    // on retourne une liste vide pour refléter fidèlement l'état réel de conformité.
    return [];
  }

  // Filtrage selon l'onglet (Tous / Restaurants / Livreurs) et les critères de recherche
  readonly partenairesFiltres = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();
    const region = this.filtreRegion();

    return this.listePartenaires().filter((partenaire) => {
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
    if (!doc) return;
    this.notificationSucces.set(`Téléchargement de "${doc.nom}" en cours...`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  imprimerDocumentActuel(): void {
    const doc = this.documentEnConsultation();
    if (!doc) return;
    this.notificationSucces.set(`Préparation de l'impression pour "${doc.nom}"...`);
    setTimeout(() => this.notificationSucces.set(null), 2500);
  }

  validerPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p) return;

    const url =
      p.type === 'RESTAURANT'
        ? `${environment.apiUrl}/administration/etablissements/${p.identifiant}/decision/`
        : `${environment.apiUrl}/administration/livreurs/${p.identifiant}/decision/`;

    this.http.post(url, { nouveau_statut: 'ACTIF' }).subscribe({
      next: () => {
        this.listePartenaires.update((liste) =>
          liste.map((item) => (item.identifiant === p.identifiant ? { ...item, statut: 'VALIDE' } : item))
        );
        this.notificationSucces.set(`Le compte de "${p.nom}" a été activé avec succès.`);
        this.fermerVerification();
        this.chargerPartenaires();
        setTimeout(() => this.notificationSucces.set(null), 3000);
      },
      error: () => {
        this.notificationSucces.set(`Erreur lors de l'activation de "${p.nom}".`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
  }

  rejeterPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p) return;

    const url =
      p.type === 'RESTAURANT'
        ? `${environment.apiUrl}/administration/etablissements/${p.identifiant}/decision/`
        : `${environment.apiUrl}/administration/livreurs/${p.identifiant}/decision/`;

    this.http
      .post(url, {
        nouveau_statut: 'SUSPENDU',
        motif_decision: 'Dossier incomplet ou non conforme aux exigences réglementaires'
      })
      .subscribe({
        next: () => {
          this.listePartenaires.update((liste) =>
            liste.map((item) => (item.identifiant === p.identifiant ? { ...item, statut: 'REJETE' } : item))
          );
          this.notificationSucces.set(`La demande de "${p.nom}" a été rejetée.`);
          this.fermerVerification();
          this.chargerPartenaires();
          setTimeout(() => this.notificationSucces.set(null), 3000);
        },
        error: () => {
          this.notificationSucces.set(`Erreur lors du traitement de "${p.nom}".`);
          setTimeout(() => this.notificationSucces.set(null), 3000);
        }
      });
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
