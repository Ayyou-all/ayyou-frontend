import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

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
export class ValidationsComponent {
  private readonly route = inject(ActivatedRoute);

  // Onglet sélectionné (Tous, Restaurants, Livreurs)
  readonly ongletActif = signal<OngletTypePartenaire>('TOUS');

  // Filtres de recherche
  readonly rechercheTexte = signal<string>('');
  readonly filtreDate = signal<string>('TOUTES');
  readonly filtreRegion = signal<string>('TOUTES');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 4;

  // Modale de vérification du partenaire
  readonly partenaireSelectionne = signal<PartenaireAValider | null>(null);
  readonly modaleVerificationOuverte = signal<boolean>(false);
  readonly notificationSucces = signal<string | null>(null);

  // Modale d'inspection du document détaillé
  readonly documentEnConsultation = signal<DocumentPartenaire | null>(null);
  readonly indexDocumentEnCours = signal<number>(0);
  readonly modaleDocumentOuverte = signal<boolean>(false);
  readonly facteurZoom = signal<number>(100);

  // Données complètes des demandes de validation avec documents officiels détaillés
  readonly listePartenaires = signal<PartenaireAValider[]>([
    {
      identifiant: 'val-01',
      nom: 'La Trattoria',
      specialiteOuVehicule: 'Cuisine Italienne',
      telephone: '+221 77 111 22 33',
      courriel: 'contact@latrattoria.sn',
      region: 'Dakar - Plateau',
      adresseComplete: '12 Rue Victor Hugo, Dakar Plateau',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-pizza-slice',
      estPhoto: false,
      classeFondIcone: 'bg-rose-50 text-[#E51824]',
      documentsFournis: 3,
      documentsTotal: 3,
      dateSoumission: '24 Oct. 2023, 14:30',
      statut: 'EN_ATTENTE',
      listeDocuments: [
        {
          identifiantDoc: 'doc-01-rccm',
          nom: 'Registre de commerce (RCCM)',
          type: 'PDF',
          typeDocument: 'RCCM',
          tailleFichier: '2.4 Mo',
          dateTeleversement: '24 Oct. 2023, 14:15',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "EXTRAIT D'IMMATRICULATION AU REGISTRE DU COMMERCE ET DU CRÉDIT MOBILIER",
          sousTitreOfficiel: 'GREFFE DU TRIBUNAL DE COMMERCE HORS CLASSE DE DAKAR',
          numeroOfficiel: 'SN.DKR.2021.B.18492',
          autoriteEmettrice: 'Tribunal de Commerce Hors Classe de Dakar',
          ministere: 'MINISTÈRE DE LA JUSTICE — RÉPUBLIQUE DU SÉNÉGAL',
          dateDelivrance: '14 Mars 2021',
          titulaireNom: 'LA TRATTORIA S.A.R.L.',
          detailsChamps: [
            { libelle: 'Dénomination sociale', valeur: 'LA TRATTORIA S.A.R.L.' },
            { libelle: 'Enseigne commerciale', valeur: 'LA TRATTORIA DAKAR' },
            { libelle: 'Forme juridique', valeur: 'Société à Responsabilité Limitée (SARL)' },
            { libelle: 'Capital social', valeur: '5 000 000 FCFA (Entièrement libéré)' },
            { libelle: 'Siège social', valeur: '12 Rue Victor Hugo, Dakar Plateau, Sénégal' },
            { libelle: 'Objet social', valeur: 'Restauration traditionnelle, pizzeria au feu de bois, traiteur, vente à emporter et livraison de repas à domicile.' },
            { libelle: 'Gérant principal', valeur: 'Gianluigi ROSSI' },
            { libelle: 'Nationalité du dirigeant', valeur: 'Italienne (Résident privilégié permanent Sénégal)' },
            { libelle: 'Durée de la société', valeur: '99 années à compter de son immatriculation' },
            { libelle: 'Numéro de formalité', valeur: 'FORM-2021-DKR-9921' }
          ],
          mentionsLegales: [
            "Conformément aux dispositions de l'Acte Uniforme OHADA portant sur le Droit Commercial Général.",
            'Le Greffier en chef soussigné certifie que la société susmentionnée est dûment immatriculée sous le numéro SN.DKR.2021.B.18492.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Me Babacar Fall',
          signataireFonction: 'Greffier en Chef près le Tribunal de Commerce',
          tamponTexte: 'TRIBUNAL DE COMMERCE HORS CLASSE DE DAKAR • GREFFE • CERTIFIÉ CONFORME',
          numeroSecuriteQr: 'SN-RCCM-DKR-2021-B-18492-SECURE'
        },
        {
          identifiantDoc: 'doc-01-ninea',
          nom: 'Attestation fiscale NINEA',
          type: 'PDF',
          typeDocument: 'NINEA',
          tailleFichier: '1.2 Mo',
          dateTeleversement: '24 Oct. 2023, 14:18',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "ATTESTATION D'IMMATRICULATION ET ATTRIBUTION DU NINEA",
          sousTitreOfficiel: "DIRECTION GÉNÉRALE DES IMPÔTS ET DES DOMAINES (DGID)",
          numeroOfficiel: '008492102 2V2',
          autoriteEmettrice: 'Direction Générale des Impôts et des Domaines',
          ministere: 'MINISTÈRE DES FINANCES ET DU BUDGET — RÉPUBLIQUE DU SÉNÉGAL',
          dateDelivrance: '18 Avril 2021',
          titulaireNom: 'LA TRATTORIA S.A.R.L.',
          detailsChamps: [
            { libelle: 'Numéro NINEA', valeur: '008492102 2V2' },
            { libelle: 'Code COFI', valeur: '4892109-A' },
            { libelle: 'Centre des Services Fiscaux', valeur: 'CSF Dakar-Plateau / Grandes Entreprises' },
            { libelle: 'Régime d’imposition', valeur: 'Réel Normal d’Imposition (RNI)' },
            { libelle: 'Activité répertoriée', valeur: '5610 - Restauration traditionnelle et services de restauration' },
            { libelle: 'Situation de conformité', valeur: 'À jour de toutes ses déclarations fiscales (TVA, BRS, IS)' },
            { libelle: 'Date d’effet', valeur: '18/04/2021' }
          ],
          mentionsLegales: [
            'Attestation délivrée conformément aux dispositions du Code Général des Impôts du Sénégal.',
            'Ce document atteste de la parfaite régularité fiscale de l’établissement pour l’exercice en cours.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Ousmane Sonko Ndiaye',
          signataireFonction: 'Inspecteur Principal des Impôts et des Domaines',
          tamponTexte: 'DIRECTION GÉNÉRALE DES IMPÔTS ET DES DOMAINES • CSF DAKAR-PLATEAU',
          numeroSecuriteQr: 'DGID-SN-NINEA-008492102-2V2-CERTIF'
        },
        {
          identifiantDoc: 'doc-01-cni',
          nom: "Carte d'identité du gérant",
          type: 'Image',
          typeDocument: 'CNI',
          tailleFichier: '3.6 Mo',
          dateTeleversement: '24 Oct. 2023, 14:22',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "TITRE DE SÉJOUR ET IDENTITÉ BIOMÉTRIQUE SÉCURISÉE",
          sousTitreOfficiel: "DIRECTION DE LA POLICE DE L'AIR ET DES FRONTIÈRES",
          numeroOfficiel: 'TS-DKR-198004-921',
          autoriteEmettrice: 'Direction de la Police des Étrangers et des Titres de Séjour',
          ministere: "MINISTÈRE DE L'INTÉRIEUR — RÉPUBLIQUE DU SÉNÉGAL",
          dateDelivrance: '10 Janvier 2021',
          dateExpiration: '10 Janvier 2031',
          titulaireNom: 'Gianluigi ROSSI',
          detailsChamps: [
            { libelle: 'Nom de famille', valeur: 'ROSSI' },
            { libelle: 'Prénoms', valeur: 'Gianluigi Marco' },
            { libelle: 'Date et lieu de naissance', valeur: '22/04/1980 à Rome (Italie)' },
            { libelle: 'Nationalité', valeur: 'Italienne' },
            { libelle: 'Qualité / Profession', valeur: 'Directeur général de restaurant & Chef exécutif' },
            { libelle: 'Adresse de résidence', valeur: '12 Rue Victor Hugo, Dakar Plateau, Sénégal' },
            { libelle: 'Statut du titre', valeur: 'Résident permanent privilégié en règle' }
          ],
          mentionsLegales: [
            'Document biométrique certifié conforme aux accords internationaux et conventions de séjour.',
            'Autorise l’exercice d’une profession commerciale et libérale sur l’ensemble du territoire sénégalais.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Commissaire Divisionnaire A. Seck',
          signataireFonction: 'Directeur de la Police des Titres de Séjour',
          tamponTexte: "MINISTÈRE DE L'INTÉRIEUR • POLICE NATIONALE • CONTRÔLE RÉGLEMENTAIRE",
          numeroSecuriteQr: 'SN-POL-INT-198004921-ROSSI-VALID'
        }
      ]
    },
    {
      identifiant: 'val-02',
      nom: 'Thomas Dupont',
      specialiteOuVehicule: 'Scooter Électrique',
      telephone: '+221 77 222 33 44',
      courriel: 'thomas.dupont@ayyou.sn',
      region: 'Dakar - Almadies',
      adresseComplete: 'Route de la Corniche Ouest, Almadies',
      type: 'LIVREUR',
      iconeOuPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      estPhoto: true,
      documentsFournis: 3,
      documentsTotal: 3,
      dateSoumission: '25 Oct. 2023, 09:12',
      statut: 'EN_ATTENTE',
      listeDocuments: [
        {
          identifiantDoc: 'doc-02-permis',
          nom: 'Permis de conduire moto (A2)',
          type: 'PDF',
          typeDocument: 'PERMIS',
          tailleFichier: '1.8 Mo',
          dateTeleversement: '25 Oct. 2023, 08:50',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: 'PERMIS DE CONDUIRE BIOMÉTRIQUE SÉCURISÉ',
          sousTitreOfficiel: 'DIRECTION DES TRANSPORTS ROUTIERS',
          numeroOfficiel: 'DK-2019-74921-PC',
          autoriteEmettrice: 'Direction Régionale des Transports Routiers de Dakar',
          ministere: 'MINISTÈRE DES INFRASTRUCTURES ET DES TRANSPORTS TERRESTRES',
          dateDelivrance: '15 Novembre 2019',
          dateExpiration: '15 Novembre 2029',
          titulaireNom: 'Thomas Babacar DUPONT',
          detailsChamps: [
            { libelle: 'Nom et Prénoms', valeur: 'DUPONT Thomas Babacar' },
            { libelle: 'Date de naissance', valeur: '15/09/1997 à Dakar' },
            { libelle: 'Catégories validées', valeur: 'Catégorie A1 (Cyclomoteurs) • Catégorie A2 (Motos jusqu’à 35 kW)' },
            { libelle: 'Numéro d’enregistrement national', valeur: 'SN-DTR-971509-021' },
            { libelle: 'Restrictions médicales', valeur: '01 (Port de verres correcteurs / Casque intégral obligatoire)' },
            { libelle: 'Aptitude médicale', valeur: 'Reconnu apte par la commission médicale régionale' }
          ],
          mentionsLegales: [
            'Permis valable sur l’ensemble du territoire des États membres de la CEDEAO.',
            'Autorise l’activité professionnelle de livraison motorisée urbaine.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Ibrahima Gueye',
          signataireFonction: 'Directeur Régional des Transports Terrestres',
          tamponTexte: 'DIRECTION DES TRANSPORTS ROUTIERS • SÉCURITÉ ROUTIÈRE SÉNÉGAL',
          numeroSecuriteQr: 'DTR-SN-PERMIS-DK-2019-74921-PC'
        },
        {
          identifiantDoc: 'doc-02-cni',
          nom: "Carte Nationale d'Identité",
          type: 'Image',
          typeDocument: 'CNI',
          tailleFichier: '2.9 Mo',
          dateTeleversement: '25 Oct. 2023, 08:55',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "CARTE NATIONALE D'IDENTITÉ BIOMÉTRIQUE SÉCURISÉE CEDEAO",
          sousTitreOfficiel: 'DIRECTION DE L’AUTOMATISATION DES FICHIERS (DAF)',
          numeroOfficiel: '1 751 1997 00428',
          autoriteEmettrice: 'Ministère de l’Intérieur et de la Sécurité Publique',
          ministere: "MINISTÈRE DE L'INTÉRIEUR — RÉPUBLIQUE DU SÉNÉGAL",
          dateDelivrance: '04 Février 2020',
          dateExpiration: '04 Février 2030',
          titulaireNom: 'Thomas Babacar DUPONT',
          detailsChamps: [
            { libelle: 'Nom', valeur: 'DUPONT' },
            { libelle: 'Prénoms', valeur: 'Thomas Babacar' },
            { libelle: 'Date de naissance', valeur: '15/09/1997 à Dakar' },
            { libelle: 'Sexe / Taille', valeur: 'M / 1.83 m' },
            { libelle: 'Profession', valeur: 'Livreur professionnel & Agent logistique' },
            { libelle: 'Domicile déclaré', valeur: 'Route de la Corniche Ouest, Almadies, Dakar' },
            { libelle: 'Numéro d’identification CEDEAO', valeur: 'SN-CEDEAO-1751199700428' }
          ],
          mentionsLegales: [
            'Carte nationale délivrée conformément à la loi sénégalaise sur l’identité biométrique.',
            'Document officiel personnel et infalsifiable.'
          ],
          lieuDelivrance: 'Dakar - Almadies',
          signataireNom: 'Cheikh Tidiane Diop',
          signataireFonction: 'Directeur de l’Automatisation des Fichiers (DAF)',
          tamponTexte: "RÉPUBLIQUE DU SÉNÉGAL • DAF • CARTE NATIONALE D'IDENTITÉ",
          numeroSecuriteQr: 'DAF-SN-CNI-1751199700428-SECURE'
        },
        {
          identifiantDoc: 'doc-02-assurance',
          nom: 'Assurance professionnelle véhicule',
          type: 'PDF',
          typeDocument: 'ASSURANCE',
          tailleFichier: '1.4 Mo',
          dateTeleversement: '25 Oct. 2023, 09:00',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "ATTESTATION D'ASSURANCE AUTOMOBILE & RESPONSABILITÉ CIVILE PRO",
          sousTitreOfficiel: 'AXA ASSURANCES SÉNÉGAL — CODE CIMA CERTIFIÉ',
          numeroOfficiel: 'POL-SN-AXA-2023-8821',
          autoriteEmettrice: 'AXA Assurances Sénégal (Agence Almadies)',
          ministere: 'CONTRÔLE DU MINISTÈRE DE L’ÉCONOMIE ET DU CODE CIMA',
          dateDelivrance: '01 Janvier 2023',
          dateExpiration: '31 Décembre 2024',
          titulaireNom: 'Thomas Babacar DUPONT',
          detailsChamps: [
            { libelle: 'Numéro de police', valeur: 'POL-SN-AXA-2023-8821' },
            { libelle: 'Véhicule couvert', valeur: 'Scooter Électrique SuperSoco CPx' },
            { libelle: 'Plaque d’immatriculation', valeur: 'DK-4921-BA' },
            { libelle: 'Usage assuré', valeur: 'Tournée professionnelle de livraison express de repas & colis' },
            { libelle: 'Garanties souscrites', valeur: 'Responsabilité Civile Illimitée + Défense Recours + Dommages Conducteur + Perte de marchandise' },
            { libelle: 'Statut du paiement', valeur: 'Quittance annuelle acquittée intégralement' }
          ],
          mentionsLegales: [
            'Attestation délivrée en application de l’article 200 du Code des Assurances CIMA.',
            'Valable pour toute mission de livraison effectuée sur la plateforme AYYOU.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Mme Fatou Kiné Ndiaye',
          signataireFonction: 'Responsable Souscription Flottes et Mobilités AXA',
          tamponTexte: 'AXA ASSURANCES SÉNÉGAL • DÉPARTEMENT RISQUES MOBILITÉ',
          numeroSecuriteQr: 'AXA-SN-POL-2023-8821-ASSUR-OK'
        }
      ]
    },
    {
      identifiant: 'val-03',
      nom: 'Burger Master',
      specialiteOuVehicule: 'Fast Food',
      telephone: '+221 77 333 44 55',
      courriel: 'commandes@burgermaster.sn',
      region: 'Dakar - Mermoz',
      adresseComplete: 'Avenue Cheikh Anta Diop, Mermoz',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-burger',
      estPhoto: false,
      classeFondIcone: 'bg-amber-50 text-amber-600',
      documentsFournis: 2,
      documentsTotal: 3,
      dateSoumission: '25 Oct. 2023, 11:45',
      statut: 'EN_ATTENTE',
      listeDocuments: [
        {
          identifiantDoc: 'doc-03-rccm',
          nom: 'Registre de commerce (RCCM)',
          type: 'PDF',
          typeDocument: 'RCCM',
          tailleFichier: '2.1 Mo',
          dateTeleversement: '25 Oct. 2023, 11:30',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "EXTRAIT D'IMMATRICULATION AU REGISTRE DU COMMERCE (RCCM)",
          sousTitreOfficiel: 'GREFFE DU TRIBUNAL DE COMMERCE DE DAKAR',
          numeroOfficiel: 'SN.DKR.2022.B.29104',
          autoriteEmettrice: 'Tribunal de Commerce Hors Classe de Dakar',
          ministere: 'MINISTÈRE DE LA JUSTICE — RÉPUBLIQUE DU SÉNÉGAL',
          dateDelivrance: '09 Juin 2022',
          titulaireNom: 'BURGER MASTER S.A.S.U.',
          detailsChamps: [
            { libelle: 'Dénomination', valeur: 'BURGER MASTER SASU' },
            { libelle: 'Capital social', valeur: '3 000 000 FCFA' },
            { libelle: 'Siège social', valeur: 'Avenue Cheikh Anta Diop, Mermoz, Dakar' },
            { libelle: 'Objet', valeur: 'Restauration rapide haut de gamme, burgers gourmets, frites maison et livraison' },
            { libelle: 'Président & Représentant', valeur: 'Amadou Lamine DIOP' }
          ],
          mentionsLegales: [
            'Immatriculation régulière au Registre du Commerce sous l’Acte Uniforme OHADA.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Me Seydou Traoré',
          signataireFonction: 'Greffier des Procédures Commerciales',
          tamponTexte: 'TRIBUNAL DE COMMERCE DE DAKAR • REGISTRE OFFICIEL',
          numeroSecuriteQr: 'RCCM-SN-BURGER-MASTER-2022-B'
        },
        {
          identifiantDoc: 'doc-03-cni',
          nom: "Carte d'identité du représentant",
          type: 'Image',
          typeDocument: 'CNI',
          tailleFichier: '2.7 Mo',
          dateTeleversement: '25 Oct. 2023, 11:35',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "CARTE NATIONALE D'IDENTITÉ BIOMÉTRIQUE SÉCURISÉE CEDEAO",
          sousTitreOfficiel: 'DIRECTION DE L’AUTOMATISATION DES FICHIERS',
          numeroOfficiel: '1 751 1989 01923',
          autoriteEmettrice: 'Ministère de l’Intérieur',
          ministere: "MINISTÈRE DE L'INTÉRIEUR — RÉPUBLIQUE DU SÉNÉGAL",
          dateDelivrance: '12 Août 2019',
          dateExpiration: '12 Août 2029',
          titulaireNom: 'Amadou Lamine DIOP',
          detailsChamps: [
            { libelle: 'Nom et Prénoms', valeur: 'DIOP Amadou Lamine' },
            { libelle: 'Né le', valeur: '08/03/1989 à Dakar' },
            { libelle: 'Nationalité', valeur: 'Sénégalaise' },
            { libelle: 'Qualité', valeur: 'Président fondateur Burger Master SASU' }
          ],
          mentionsLegales: [
            'Document officiel national biométrique vérifié.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'M. Cheikh T. Diop',
          signataireFonction: 'Directeur DAF',
          tamponTexte: "RÉPUBLIQUE DU SÉNÉGAL • DAF • CNI CEDEAO",
          numeroSecuriteQr: 'CNI-SN-1751198901923-DIOP-VALID'
        },
        {
          identifiantDoc: 'doc-03-hygiene',
          nom: 'Attestation de conformité sanitaire',
          type: 'PDF',
          typeDocument: 'SANITAIRE',
          tailleFichier: '850 Ko',
          dateTeleversement: '25 Oct. 2023, 11:40',
          urlFichier: '#',
          estValide: false,
          statutVerification: 'A_VERIFIER',
          titreOfficiel: 'CERTIFICAT DE SALUBRITÉ ET HYGIÈNE ALIMENTAIRE (EN COURS)',
          sousTitreOfficiel: 'SERVICE NATIONAL DE L’HYGIÈNE — SOUS-BRIGADE DÉPARTEMENTALE DE DAKAR',
          numeroOfficiel: 'SNH-DKR-2023-REC-401',
          autoriteEmettrice: 'Service National de l’Hygiène de Dakar',
          ministere: 'MINISTÈRE DE LA SANTÉ ET DE L’ACTION SOCIALE',
          dateDelivrance: '15 Octobre 2023 (Récépissé provisoire)',
          titulaireNom: 'BURGER MASTER MERMOZ',
          detailsChamps: [
            { libelle: 'Type de document', valeur: 'Récépissé de dépôt d’audit sanitaire' },
            { libelle: 'Établissement inspecté', valeur: 'Laboratoire de préparation culinaire Burger Master' },
            { libelle: 'Statut du contrôle', valeur: 'Visite de conformité de la chaîne du froid planifiée le 29/10/2023' },
            { libelle: 'Analyse bactériologique', valeur: 'Prélèvements d’échantillons en cours d’incubation' },
            { libelle: 'Action requise Superadmin', valeur: 'Vérifier la validité du certificat final dès transmission par le restaurateur' }
          ],
          mentionsLegales: [
            'Récépissé temporaire tenant lieu d’attestation provisoire dans l’attente du procès-verbal définitif.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Dr. Mamadou Bamba Cissé',
          signataireFonction: 'Chef de la Sous-Brigade Départementale d’Hygiène',
          tamponTexte: 'SERVICE NATIONAL DE L’HYGIÈNE • DAKAR • AUDIT EN COURS',
          numeroSecuriteQr: 'SNH-DKR-2023-REC-401-PROV'
        }
      ]
    },
    {
      identifiant: 'val-04',
      nom: 'Kevin Miller',
      specialiteOuVehicule: 'Moto 150cc',
      telephone: '+221 77 444 55 66',
      courriel: 'kevin.miller@ayyou.sn',
      region: 'Dakar - Point E',
      adresseComplete: 'Rue 10 x Boulevard de l’Est, Point E',
      type: 'LIVREUR',
      iconeOuPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      estPhoto: true,
      documentsFournis: 3,
      documentsTotal: 3,
      dateSoumission: '26 Oct. 2023, 08:20',
      statut: 'EN_ATTENTE',
      listeDocuments: [
        {
          identifiantDoc: 'doc-04-permis',
          nom: 'Permis de conduire moto',
          type: 'PDF',
          typeDocument: 'PERMIS',
          tailleFichier: '1.9 Mo',
          dateTeleversement: '26 Oct. 2023, 08:05',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: 'PERMIS DE CONDUIRE BIOMÉTRIQUE SÉCURISÉ',
          sousTitreOfficiel: 'DIRECTION DES TRANSPORTS ROUTIERS DU SÉNÉGAL',
          numeroOfficiel: 'DK-2021-39108-PC',
          autoriteEmettrice: 'Direction Régionale des Transports Routiers',
          ministere: 'MINISTÈRE DES INFRASTRUCTURES ET DES TRANSPORTS TERRESTRES',
          dateDelivrance: '22 Janvier 2021',
          dateExpiration: '22 Janvier 2031',
          titulaireNom: 'Kevin Moussa MILLER',
          detailsChamps: [
            { libelle: 'Titulaire', valeur: 'Kevin Moussa MILLER' },
            { libelle: 'Né le', valeur: '19/11/1996 à Saint-Louis' },
            { libelle: 'Catégorie', valeur: 'Permis A (Motos toutes cylindrées) & B (Léger)' },
            { libelle: 'Numéro permis', valeur: 'DK-2021-39108-PC' }
          ],
          mentionsLegales: [
            'Permis valide pour transport et livraison motorisée urbaine.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Ibrahima Gueye',
          signataireFonction: 'Directeur Régional DTR',
          tamponTexte: 'DIRECTION DES TRANSPORTS ROUTIERS • SÉNÉGAL',
          numeroSecuriteQr: 'DTR-SN-PERMIS-MILLER-2021'
        },
        {
          identifiantDoc: 'doc-04-cni',
          nom: "Carte Nationale d'Identité",
          type: 'Image',
          typeDocument: 'CNI',
          tailleFichier: '3.1 Mo',
          dateTeleversement: '26 Oct. 2023, 08:10',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "CARTE NATIONALE D'IDENTITÉ BIOMÉTRIQUE CEDEAO",
          sousTitreOfficiel: 'MINISTÈRE DE L’INTÉRIEUR DU SÉNÉGAL',
          numeroOfficiel: '1 751 1996 09182',
          autoriteEmettrice: 'DAF',
          ministere: "MINISTÈRE DE L'INTÉRIEUR",
          dateDelivrance: '14 Mai 2021',
          dateExpiration: '14 Mai 2031',
          titulaireNom: 'Kevin Moussa MILLER',
          detailsChamps: [
            { libelle: 'Nom et Prénom', valeur: 'MILLER Kevin Moussa' },
            { libelle: 'Né le', valeur: '19/11/1996 à Saint-Louis' },
            { libelle: 'Nationalité', valeur: 'Sénégalaise' },
            { libelle: 'Domicile', valeur: 'Rue 10 x Boulevard de l’Est, Point E, Dakar' }
          ],
          mentionsLegales: ['Pièce d’identité officielle biométrique CEDEAO.'],
          lieuDelivrance: 'Dakar',
          signataireNom: 'C. T. Diop',
          signataireFonction: 'Directeur DAF',
          tamponTexte: 'RÉPUBLIQUE DU SÉNÉGAL • DAF',
          numeroSecuriteQr: 'DAF-SN-CNI-MILLER-1996'
        },
        {
          identifiantDoc: 'doc-04-cartegrise',
          nom: 'Carte grise moto',
          type: 'PDF',
          typeDocument: 'CARTE_GRISE',
          tailleFichier: '1.7 Mo',
          dateTeleversement: '26 Oct. 2023, 08:15',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "CERTIFICAT D'IMMATRICULATION DES VÉHICULES AUTOMOBILES",
          sousTitreOfficiel: 'DIRECTION DES TRANSPORTS ROUTIERS',
          numeroOfficiel: 'DK-8842-BN',
          autoriteEmettrice: 'Service de l’Immatriculation des Véhicules de Dakar',
          ministere: 'MINISTÈRE DES TRANSPORTS TERRESTRES',
          dateDelivrance: '10 Février 2022',
          titulaireNom: 'Kevin Moussa MILLER',
          detailsChamps: [
            { libelle: 'Immatriculation', valeur: 'DK-8842-BN' },
            { libelle: 'Marque & Modèle', valeur: 'YAMAHA XTZ 150 Crosser' },
            { libelle: 'Genre / Énergie', valeur: 'Motocyclette (MTL) / Essence' },
            { libelle: 'Numéro de châssis (VIN)', valeur: 'JY1SG02100849210' },
            { libelle: 'Puissance administrative', valeur: '2 CV' },
            { libelle: 'Propriétaire certifié', valeur: 'Kevin Moussa MILLER' }
          ],
          mentionsLegales: [
            'Certificat d’immatriculation officiel autorisant la circulation sur voies publiques.'
          ],
          lieuDelivrance: 'Dakar',
          signataireNom: 'M. Alioune Badara Diouf',
          signataireFonction: 'Chef du Centre des Cartes Grises',
          tamponTexte: 'RÉPUBLIQUE DU SÉNÉGAL • IMMATRICULATION VÉHICULES',
          numeroSecuriteQr: 'CG-SN-DK-8842-BN-YAMAHA'
        }
      ]
    },
    {
      identifiant: 'val-05',
      nom: 'Dakar Wok Express',
      specialiteOuVehicule: 'Cuisine Asiatique & Fusion',
      telephone: '+221 77 555 66 77',
      courriel: 'contact@dakarwok.sn',
      region: 'Dakar - Plateau',
      adresseComplete: 'Place de l’Indépendance, Dakar',
      type: 'RESTAURANT',
      iconeOuPhoto: 'fa-solid fa-bowl-food',
      estPhoto: false,
      classeFondIcone: 'bg-emerald-50 text-emerald-600',
      documentsFournis: 3,
      documentsTotal: 3,
      dateSoumission: '26 Oct. 2023, 16:40',
      statut: 'EN_ATTENTE',
      listeDocuments: [
        {
          identifiantDoc: 'doc-05-rccm',
          nom: 'Registre de commerce (RCCM)',
          type: 'PDF',
          typeDocument: 'RCCM',
          tailleFichier: '2.5 Mo',
          dateTeleversement: '26 Oct. 2023, 16:20',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "EXTRAIT DU REGISTRE DU COMMERCE ET DU CRÉDIT MOBILIER",
          sousTitreOfficiel: 'TRIBUNAL DE COMMERCE HORS CLASSE DE DAKAR',
          numeroOfficiel: 'SN.DKR.2023.B.10482',
          autoriteEmettrice: 'Greffe du Tribunal de Commerce',
          ministere: 'MINISTÈRE DE LA JUSTICE — RÉPUBLIQUE DU SÉNÉGAL',
          dateDelivrance: '12 Janvier 2023',
          titulaireNom: 'DAKAR WOK EXPRESS S.A.R.L.',
          detailsChamps: [
            { libelle: 'Raison sociale', valeur: 'DAKAR WOK EXPRESS S.A.R.L.' },
            { libelle: 'Capital social', valeur: '8 000 000 FCFA' },
            { libelle: 'Siège social', valeur: 'Place de l’Indépendance, Dakar Plateau' },
            { libelle: 'Activité', valeur: 'Restauration asiatique, wok minute, sushis et livraison de repas' },
            { libelle: 'Gérant', valeur: 'Mme Aïda SY' }
          ],
          mentionsLegales: ['Acte OHADA enregistré au greffe du tribunal de commerce de Dakar.'],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Me Babacar Fall',
          signataireFonction: 'Greffier en Chef',
          tamponTexte: 'TRIBUNAL DE COMMERCE DE DAKAR • REGISTRE DU COMMERCE',
          numeroSecuriteQr: 'RCCM-SN-DAKAR-WOK-2023'
        },
        {
          identifiantDoc: 'doc-05-ninea',
          nom: 'Attestation NINEA',
          type: 'PDF',
          typeDocument: 'NINEA',
          tailleFichier: '1.3 Mo',
          dateTeleversement: '26 Oct. 2023, 16:25',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "ATTESTATION D'ATTRIBUTION DU NINEA FISCAL",
          sousTitreOfficiel: 'DIRECTION GÉNÉRALE DES IMPÔTS ET DES DOMAINES',
          numeroOfficiel: '009182301 2R1',
          autoriteEmettrice: 'DGID Dakar',
          ministere: 'MINISTÈRE DES FINANCES ET DU BUDGET',
          dateDelivrance: '20 Janvier 2023',
          titulaireNom: 'DAKAR WOK EXPRESS S.A.R.L.',
          detailsChamps: [
            { libelle: 'Numéro NINEA', valeur: '009182301 2R1' },
            { libelle: 'Centre des impôts', valeur: 'Centre des Services Fiscaux Dakar-Plateau' },
            { libelle: 'Régime', valeur: 'Réel Normal d’Imposition' }
          ],
          mentionsLegales: ['Entreprise en règle avec la réglementation fiscale sénégalaise.'],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Ousmane Sonko Ndiaye',
          signataireFonction: 'Inspecteur Principal',
          tamponTexte: 'DGID • CSF DAKAR-PLATEAU • NINEA CERTIFIÉ',
          numeroSecuriteQr: 'DGID-SN-NINEA-DAKAR-WOK'
        },
        {
          identifiantDoc: 'doc-05-bail',
          nom: 'Contrat bail commercial',
          type: 'PDF',
          typeDocument: 'BAIL',
          tailleFichier: '3.4 Mo',
          dateTeleversement: '26 Oct. 2023, 16:30',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "CONTRAT DE BAIL COMMERCIAL NOTARIÉ",
          sousTitreOfficiel: 'ÉTUDE DE MAÎTRE SOW & ASSOCIÉS — NOTAIRES À DAKAR',
          numeroOfficiel: 'NOT-DKR-2023-B712',
          autoriteEmettrice: 'Étude Notariale Sow & Associés',
          ministere: 'ORDRE DES NOTAIRES DU SÉNÉGAL',
          dateDelivrance: '05 Janvier 2023',
          titulaireNom: 'DAKAR WOK EXPRESS',
          detailsChamps: [
            { libelle: 'Bailleur', valeur: 'Société Immobilière du Cap-Vert (SICAP)' },
            { libelle: 'Preneur', valeur: 'DAKAR WOK EXPRESS SARL' },
            { libelle: 'Local loué', valeur: 'Rez-de-chaussée commercial, 180 m², Place de l’Indépendance' },
            { libelle: 'Usage stipulé', valeur: 'Exploitation commerciale de restaurant & cuisine' },
            { libelle: 'Durée du bail', valeur: 'Bail commercial 3-6-9 ans renouvelable' }
          ],
          mentionsLegales: ['Acte notarié authentique enregistré aux Domaines de Dakar.'],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Me Abdoulaye Sow',
          signataireFonction: 'Notaire titulaire de charge',
          tamponTexte: 'ÉTUDE NOTARIALE SOW & ASSOCIÉS • DAKAR',
          numeroSecuriteQr: 'NOT-SN-BAIL-DAKAR-WOK'
        }
      ]
    },
    {
      identifiant: 'val-06',
      nom: 'Mamadou Diallo',
      specialiteOuVehicule: 'Vélo Cargo Électrique',
      telephone: '+221 77 666 77 88',
      courriel: 'mamadou.cargo@ayyou.sn',
      region: 'Dakar - Parcelles',
      adresseComplete: 'Unité 14, Parcelles Assainies',
      type: 'LIVREUR',
      iconeOuPhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      estPhoto: true,
      documentsFournis: 3,
      documentsTotal: 3,
      dateSoumission: '27 Oct. 2023, 10:15',
      statut: 'EN_ATTENTE',
      listeDocuments: [
        {
          identifiantDoc: 'doc-06-cni',
          nom: "Carte Nationale d'Identité",
          type: 'Image',
          typeDocument: 'CNI',
          tailleFichier: '2.8 Mo',
          dateTeleversement: '27 Oct. 2023, 09:50',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: "CARTE NATIONALE D'IDENTITÉ BIOMÉTRIQUE CEDEAO",
          sousTitreOfficiel: 'DIRECTION DE L’AUTOMATISATION DES FICHIERS',
          numeroOfficiel: '1 751 1999 04812',
          autoriteEmettrice: 'Ministère de l’Intérieur',
          ministere: "MINISTÈRE DE L'INTÉRIEUR — RÉPUBLIQUE DU SÉNÉGAL",
          dateDelivrance: '11 Juillet 2021',
          dateExpiration: '11 Juillet 2031',
          titulaireNom: 'Mamadou Alpha DIALLO',
          detailsChamps: [
            { libelle: 'Nom & Prénoms', valeur: 'DIALLO Mamadou Alpha' },
            { libelle: 'Né le', valeur: '04/06/1999 à Dakar' },
            { libelle: 'Nationalité', valeur: 'Sénégalaise' },
            { libelle: 'Profession', valeur: 'Livreur éco-mobilité / Coursier vélo cargo' },
            { libelle: 'Adresse', valeur: 'Unité 14, Parcelles Assainies, Dakar' }
          ],
          mentionsLegales: ['Document biométrique personnel et officiel.'],
          lieuDelivrance: 'Dakar',
          signataireNom: 'C. T. Diop',
          signataireFonction: 'Directeur DAF',
          tamponTexte: "RÉPUBLIQUE DU SÉNÉGAL • DAF • CNI BIOMÉTRIQUE",
          numeroSecuriteQr: 'CNI-SN-DIALLO-1999-CARGO'
        },
        {
          identifiantDoc: 'doc-06-residence',
          nom: 'Certificat de résidence',
          type: 'PDF',
          typeDocument: 'RESIDENCE',
          tailleFichier: '1.1 Mo',
          dateTeleversement: '27 Oct. 2023, 09:55',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: 'CERTIFICAT DE RÉSIDENCE ET DOMICILIATION LÉGALE',
          sousTitreOfficiel: 'COMMISSARIAT DE POLICE DES PARCELLES ASSAINIES',
          numeroOfficiel: 'CERT-RES-PA-2023-891',
          autoriteEmettrice: 'Police Nationale du Sénégal',
          ministere: "MINISTÈRE DE L'INTÉRIEUR — DIRECTION GÉNÉRALE DE LA POLICE",
          dateDelivrance: '14 Septembre 2023',
          titulaireNom: 'Mamadou Alpha DIALLO',
          detailsChamps: [
            { libelle: 'Nom du déclarant', valeur: 'Mamadou Alpha DIALLO' },
            { libelle: 'Adresse certifiée', valeur: 'Villa n° 218, Unité 14, Parcelles Assainies, Dakar' },
            { libelle: 'Ancienneté au domicile', valeur: 'Réside à cette adresse depuis plus de 4 ans' },
            { libelle: 'Témoin de quartier', valeur: 'Attestation confirmée par le délégué de quartier de l’Unité 14' }
          ],
          mentionsLegales: ['Délivré sur déclaration régulière pour servir et valoir ce que de droit.'],
          lieuDelivrance: 'Parcelles Assainies, Dakar',
          signataireNom: 'Commissaire de Police I. Sarr',
          signataireFonction: 'Chef du Commissariat des Parcelles Assainies',
          tamponTexte: 'COMMISSARIAT DE POLICE • PARCELLES ASSAINIES • DAKAR',
          numeroSecuriteQr: 'POL-SN-RES-DIALLO-UNITE14'
        },
        {
          identifiantDoc: 'doc-06-paiement',
          nom: 'Attestation Mobile Money',
          type: 'Image',
          typeDocument: 'PAIEMENT',
          tailleFichier: '1.5 Mo',
          dateTeleversement: '27 Oct. 2023, 10:00',
          urlFichier: '#',
          estValide: true,
          statutVerification: 'VERIFIE',
          titreOfficiel: 'ATTESTATION DE COMPTE MARCHAND LIVREUR AGRÉÉ',
          sousTitreOfficiel: 'WAVE DIGITAL SENÉGAL S.A.S. — SERVICES FINANCIERS',
          numeroOfficiel: 'WAVE-SN-ACC-776667788',
          autoriteEmettrice: 'Wave Digital Sénégal',
          ministere: 'ÉTABLISSEMENT DE MONNAIE ÉLECTRONIQUE AGRÉÉ BCEAO',
          dateDelivrance: '01 Octobre 2023',
          titulaireNom: 'Mamadou Alpha DIALLO',
          detailsChamps: [
            { libelle: 'Numéro de compte vérifié', valeur: '+221 77 666 77 88' },
            { libelle: 'Nom du titulaire KYC', valeur: 'Mamadou Alpha DIALLO' },
            { libelle: 'Statut du profil', valeur: 'Compte Pro Partenaire certifié niveau 3 (Plafond illimité)' },
            { libelle: 'Vérification bancaire', valeur: 'Identité vérifiée avec CNI biométrique' },
            { libelle: 'Affectation versements AYYOU', valeur: 'Paiements automatiques quotidiens des courses autorisés' }
          ],
          mentionsLegales: ['Attestation de compte conforme aux directives de la BCEAO sur la monnaie électronique.'],
          lieuDelivrance: 'Dakar',
          signataireNom: 'Directeur des Opérations Marchands Wave',
          signataireFonction: 'Wave Digital Sénégal',
          tamponTexte: 'WAVE DIGITAL SÉNÉGAL • COMPTE CERTIFIÉ BCEAO',
          numeroSecuriteQr: 'WAVE-SN-KYC-DIALLO-776667788'
        }
      ]
    }
  ]);

  constructor() {
    // Vérifie si un identifiant a été passé via l'URL pour ouvrir la modale directement
    const cible = this.route.snapshot.queryParamMap.get('cible');
    if (cible) {
      const trouve = this.listePartenaires().find((p) => p.identifiant === cible);
      if (trouve) {
        this.ouvrirVerification(trouve);
      }
    }
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
        const correspondNom = partenaire.nom.toLowerCase().includes(recherche);
        const correspondSpecialite = partenaire.specialiteOuVehicule.toLowerCase().includes(recherche);
        const correspondRegion = partenaire.region.toLowerCase().includes(recherche);
        if (!correspondNom && !correspondSpecialite && !correspondRegion) {
          return false;
        }
      }

      // Filtre région
      if (region !== 'TOUTES' && !partenaire.region.includes(region)) {
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

  /**
   * Ouvre la modale d'examen minutieux d'un partenaire.
   */
  ouvrirVerification(partenaire: PartenaireAValider): void {
    this.partenaireSelectionne.set({ ...partenaire });
    this.modaleVerificationOuverte.set(true);
  }

  /**
   * Ferme la modale d'examen du partenaire.
   */
  fermerVerification(): void {
    this.modaleVerificationOuverte.set(false);
    this.partenaireSelectionne.set(null);
    this.fermerApercuDocument();
  }

  /**
   * Ouvre le lecteur officiel pour voir ce qui est écrit dans le document sélectionné.
   */
  ouvrirApercuDocument(documentCible: DocumentPartenaire, index: number = 0): void {
    this.documentEnConsultation.set(documentCible);
    this.indexDocumentEnCours.set(index);
    this.facteurZoom.set(100);
    this.modaleDocumentOuverte.set(true);
  }

  /**
   * Ferme l'aperçu du document et revient à la liste des documents du candidat.
   */
  fermerApercuDocument(): void {
    this.modaleDocumentOuverte.set(false);
    this.documentEnConsultation.set(null);
    this.facteurZoom.set(100);
  }

  /**
   * Passe au document précédent du partenaire actuel.
   */
  documentPrecedent(): void {
    const partenaire = this.partenaireSelectionne();
    if (!partenaire || partenaire.listeDocuments.length === 0) return;

    const nouvelIndex = this.indexDocumentEnCours() > 0
      ? this.indexDocumentEnCours() - 1
      : partenaire.listeDocuments.length - 1;

    this.indexDocumentEnCours.set(nouvelIndex);
    this.documentEnConsultation.set(partenaire.listeDocuments[nouvelIndex]);
  }

  /**
   * Passe au document suivant du partenaire actuel.
   */
  documentSuivant(): void {
    const partenaire = this.partenaireSelectionne();
    if (!partenaire || partenaire.listeDocuments.length === 0) return;

    const nouvelIndex = this.indexDocumentEnCours() < partenaire.listeDocuments.length - 1
      ? this.indexDocumentEnCours() + 1
      : 0;

    this.indexDocumentEnCours.set(nouvelIndex);
    this.documentEnConsultation.set(partenaire.listeDocuments[nouvelIndex]);
  }

  /**
   * Ajuste le zoom d'affichage du document.
   */
  ajusterZoom(delta: number): void {
    const niveau = Math.min(Math.max(this.facteurZoom() + delta, 70), 160);
    this.facteurZoom.set(niveau);
  }

  /**
   * Réinitialise le zoom à 100%.
   */
  reinitialiserZoom(): void {
    this.facteurZoom.set(100);
  }

  /**
   * Marque le document actuel comme conforme et à jour.
   */
  marquerDocumentConforme(): void {
    const docActuel = this.documentEnConsultation();
    const partenaire = this.partenaireSelectionne();
    if (!docActuel || !partenaire) return;

    // Met à jour la liste des documents du partenaire sélectionné
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

    // Met à jour dans la liste globale
    this.listePartenaires.update((liste) =>
      liste.map((p) => (p.identifiant === partenaireMaj.identifiant ? partenaireMaj : p))
    );

    // Met à jour le document actuellement affiché
    this.documentEnConsultation.set({
      ...docActuel,
      estValide: true,
      statutVerification: 'VERIFIE'
    });

    this.notificationSucces.set(`Le document "${docActuel.nom}" a été validé comme conforme.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Marque le document actuel comme non-conforme / à revoir.
   */
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

  /**
   * Simule le téléchargement du document officiel certifié.
   */
  telechargerDocumentActuel(): void {
    const doc = this.documentEnConsultation();
    if (!doc) return;

    this.notificationSucces.set(`Téléchargement de "${doc.nom} (${doc.numeroOfficiel})" en cours...`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la fenêtre d'impression pour le document officiel.
   */
  imprimerDocumentActuel(): void {
    const doc = this.documentEnConsultation();
    if (!doc) return;

    this.notificationSucces.set(`Préparation de l'impression pour "${doc.nom}"...`);
    setTimeout(() => this.notificationSucces.set(null), 2500);
  }

  /**
   * Valide officiellement le partenaire et l'active sur AYYOU.
   */
  validerPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p) return;

    this.listePartenaires.update((liste) =>
      liste.map((item) => (item.identifiant === p.identifiant ? { ...item, statut: 'VALIDE' } : item))
    );

    this.notificationSucces.set(`Le compte de "${p.nom}" a été validé avec succès.`);
    this.fermerVerification();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Rejette la demande de partenariat.
   */
  rejeterPartenaire(): void {
    const p = this.partenaireSelectionne();
    if (!p) return;

    this.listePartenaires.update((liste) =>
      liste.map((item) => (item.identifiant === p.identifiant ? { ...item, statut: 'REJETE' } : item))
    );

    this.notificationSucces.set(`La demande de "${p.nom}" a été rejetée.`);
    this.fermerVerification();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Changement de page.
   */
  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
