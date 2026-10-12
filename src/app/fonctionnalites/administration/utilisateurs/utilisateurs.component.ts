import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type OngletTypeUtilisateur = 'CLIENTS' | 'RESTAURANTS' | 'LIVREURS';

export type StatutUtilisateur = 'ACTIF' | 'INACTIF' | 'BANNI';

export interface UtilisateurAdministration {
  identifiant: string;
  nom: string;
  badgeType: string; // ex: 'CLIENT PREMIUM', 'PARTENAIRE PRO', 'LIVREUR CERTIFIÉ'
  email: string;
  role: 'Utilisateur' | 'Restaurant' | 'Livreur' | 'Administrateur';
  iconeRole: string;
  couleurIconeRole: string;
  dateInscription: string;
  statut: StatutUtilisateur;
  photoUrl?: string;
  iconeLogo?: string;
  fondIconeLogo?: string;
  telephone?: string;
  nombreCommandes?: number;
}

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './utilisateurs.component.html'
})
export class UtilisateursComponent {
  // Onglet sélectionné (Clients, Restaurants, Livreurs)
  readonly ongletActif = signal<OngletTypeUtilisateur>('CLIENTS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 4;

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);

  // Modale d'édition / gestion d'un utilisateur
  readonly utilisateurEnEdition = signal<UtilisateurAdministration | null>(null);
  readonly modaleEditionOuverte = signal<boolean>(false);

  // Modale d'avertissement / message
  readonly utilisateurEnAlerte = signal<UtilisateurAdministration | null>(null);
  readonly modaleAlerteOuverte = signal<boolean>(false);
  readonly messageAlerte = signal<string>('');

  // Données complètes des utilisateurs (conformes à l'Image 1)
  readonly listeUtilisateurs = signal<UtilisateurAdministration[]>([
    {
      identifiant: 'usr-01',
      nom: 'Sarah Miller',
      badgeType: 'CLIENT PREMIUM',
      email: 'sarah.m@gmail.com',
      role: 'Utilisateur',
      iconeRole: 'fa-solid fa-user',
      couleurIconeRole: 'text-pink-500',
      dateInscription: '12 Oct. 2023',
      statut: 'ACTIF',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      telephone: '+221 77 123 45 67',
      nombreCommandes: 34
    },
    {
      identifiant: 'usr-02',
      nom: 'Julien Leroux',
      badgeType: 'CLIENT STANDARD',
      email: 'j.leroux@outlook.fr',
      role: 'Utilisateur',
      iconeRole: 'fa-solid fa-user',
      couleurIconeRole: 'text-pink-500',
      dateInscription: '18 Oct. 2023',
      statut: 'BANNI',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      telephone: '+221 77 234 56 78',
      nombreCommandes: 3
    },
    {
      identifiant: 'usr-03',
      nom: 'Burger King #42',
      badgeType: 'PARTENAIRE PRO',
      email: 'admin-bk42@bk.com',
      role: 'Restaurant',
      iconeRole: 'fa-solid fa-pizza-slice',
      couleurIconeRole: 'text-red-500',
      dateInscription: '20 Oct. 2023',
      statut: 'INACTIF',
      iconeLogo: 'fa-solid fa-burger',
      fondIconeLogo: 'bg-amber-100 text-amber-700',
      telephone: '+221 33 820 10 20',
      nombreCommandes: 412
    },
    {
      identifiant: 'usr-04',
      nom: 'Thomas Martin',
      badgeType: 'LIVREUR CERTIFIÉ',
      email: 't.martin@express.fr',
      role: 'Livreur',
      iconeRole: 'fa-solid fa-box',
      couleurIconeRole: 'text-amber-500',
      dateInscription: '22 Oct. 2023',
      statut: 'ACTIF',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      telephone: '+221 77 345 67 89',
      nombreCommandes: 189
    },
    {
      identifiant: 'usr-05',
      nom: 'Aminata Sow',
      badgeType: 'CLIENT STANDARD',
      email: 'aminata.sow@gmail.com',
      role: 'Utilisateur',
      iconeRole: 'fa-solid fa-user',
      couleurIconeRole: 'text-pink-500',
      dateInscription: '24 Oct. 2023',
      statut: 'ACTIF',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      telephone: '+221 77 456 78 90',
      nombreCommandes: 12
    },
    {
      identifiant: 'usr-06',
      nom: 'Le Ryad Dakar',
      badgeType: 'PARTENAIRE PRO',
      email: 'contact@leryad.sn',
      role: 'Restaurant',
      iconeRole: 'fa-solid fa-pizza-slice',
      couleurIconeRole: 'text-red-500',
      dateInscription: '15 Sep. 2023',
      statut: 'ACTIF',
      iconeLogo: 'fa-solid fa-utensils',
      fondIconeLogo: 'bg-yellow-100 text-yellow-700',
      telephone: '+221 33 821 40 50',
      nombreCommandes: 620
    },
    {
      identifiant: 'usr-07',
      nom: 'Mamadou Diallo',
      badgeType: 'LIVREUR CERTIFIÉ',
      email: 'mamadou.cargo@ayyou.sn',
      role: 'Livreur',
      iconeRole: 'fa-solid fa-box',
      couleurIconeRole: 'text-amber-500',
      dateInscription: '10 Oct. 2023',
      statut: 'ACTIF',
      photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      telephone: '+221 77 666 77 88',
      nombreCommandes: 98
    }
  ]);

  // Filtrage selon l'onglet actif et le texte de recherche
  readonly utilisateursFiltres = computed(() => {
    const onglet = this.ongletActif();
    const recherche = this.rechercheTexte().trim().toLowerCase();

    return this.listeUtilisateurs().filter((u) => {
      // Filtre d'onglet
      if (onglet === 'CLIENTS' && u.role !== 'Utilisateur') {
        return false;
      }
      if (onglet === 'RESTAURANTS' && u.role !== 'Restaurant') {
        return false;
      }
      if (onglet === 'LIVREURS' && u.role !== 'Livreur') {
        return false;
      }

      // Filtre textuel
      if (recherche) {
        const correspondNom = u.nom.toLowerCase().includes(recherche);
        const correspondEmail = u.email.toLowerCase().includes(recherche);
        if (!correspondNom && !correspondEmail) {
          return false;
        }
      }

      return true;
    });
  });

  // Pagination dynamique
  readonly utilisateursAffiches = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.utilisateursFiltres().slice(debut, debut + this.elementsParPage);
  });

  readonly nombrePagesTotal = computed(() => {
    return Math.ceil(this.utilisateursFiltres().length / this.elementsParPage) || 1;
  });

  /**
   * Change l'onglet de rôle actif.
   */
  changerOnglet(onglet: OngletTypeUtilisateur): void {
    this.ongletActif.set(onglet);
    this.pageActuelle.set(1);
  }

  /**
   * Ouvre la modale d'édition d'un utilisateur.
   */
  editerUtilisateur(u: UtilisateurAdministration): void {
    this.utilisateurEnEdition.set({ ...u });
    this.modaleEditionOuverte.set(true);
  }

  /**
   * Ferme la modale d'édition.
   */
  fermerModaleEdition(): void {
    this.modaleEditionOuverte.set(false);
    this.utilisateurEnEdition.set(null);
  }

  /**
   * Enregistre les modifications de l'utilisateur.
   */
  sauvegarderUtilisateur(): void {
    const u = this.utilisateurEnEdition();
    if (!u) return;

    this.listeUtilisateurs.update((liste) =>
      liste.map((item) => (item.identifiant === u.identifiant ? { ...u } : item))
    );

    this.notificationSucces.set(`L'utilisateur "${u.nom}" a été mis à jour avec succès.`);
    this.fermerModaleEdition();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale d'alerte / message / avertissement.
   */
  ouvrirAlerteUtilisateur(u: UtilisateurAdministration): void {
    this.utilisateurEnAlerte.set(u);
    this.messageAlerte.set(
      u.statut === 'BANNI'
        ? `Bonjour ${u.nom}, votre compte fait l'objet d'une suspension temporaire pour non-respect des conditions d'utilisation.`
        : `Avis de sécurité officiel concernant votre activité sur la plateforme AYYOU.`
    );
    this.modaleAlerteOuverte.set(true);
  }

  /**
   * Ferme la modale d'alerte.
   */
  fermerModaleAlerte(): void {
    this.modaleAlerteOuverte.set(false);
    this.utilisateurEnAlerte.set(null);
  }

  /**
   * Envoie l'alerte à l'utilisateur.
   */
  envoyerAlerte(): void {
    const u = this.utilisateurEnAlerte();
    if (!u) return;

    this.notificationSucces.set(`Notification envoyée avec succès à ${u.email}.`);
    this.fermerModaleAlerte();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Exporte la liste au format CSV.
   */
  exporterCsv(): void {
    this.notificationSucces.set('Génération du fichier CSV des utilisateurs en cours...');
    setTimeout(() => {
      this.notificationSucces.set('Export CSV "ayyou-utilisateurs.csv" téléchargé avec succès.');
      setTimeout(() => this.notificationSucces.set(null), 3000);
    }, 1200);
  }

  /**
   * Navigation pagination.
   */
  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
