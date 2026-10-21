import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

export type OngletTypeUtilisateur = 'CLIENTS' | 'RESTAURANTS' | 'LIVREURS';

export type StatutUtilisateur = 'ACTIF' | 'INACTIF' | 'BANNI';

export interface UtilisateurAdministration {
  id?: number;
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
export class UtilisateursComponent implements OnInit {
  private readonly http = inject(HttpClient);

  // Onglet sélectionné (Clients, Restaurants, Livreurs)
  readonly ongletActif = signal<OngletTypeUtilisateur>('CLIENTS');

  // Filtre textuel
  readonly rechercheTexte = signal<string>('');

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 6;

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);
  readonly chargementEnCours = signal<boolean>(false);

  // Modale d'édition / gestion d'un utilisateur
  readonly utilisateurEnEdition = signal<UtilisateurAdministration | null>(null);
  readonly modaleEditionOuverte = signal<boolean>(false);

  // Modale d'avertissement / message
  readonly utilisateurEnAlerte = signal<UtilisateurAdministration | null>(null);
  readonly modaleAlerteOuverte = signal<boolean>(false);
  readonly messageAlerte = signal<string>('');
  readonly envoiAlerteEnCours = signal<boolean>(false);

  // Données dynamiques des utilisateurs connectées au backend
  readonly listeUtilisateurs = signal<UtilisateurAdministration[]>([]);

  ngOnInit(): void {
    this.chargerUtilisateurs();
  }

  chargerUtilisateurs(): void {
    this.chargementEnCours.set(true);
    this.http.get<any>(`${environment.apiUrl}/administration/utilisateurs/`).subscribe({
      next: (donnees) => {
        const items = Array.isArray(donnees) ? donnees : (donnees?.results || []);
        const liste: UtilisateurAdministration[] = items.map((u: any) => ({
          id: u.id,
          identifiant: u.identifiant || `usr-${u.id}`,
          nom: u.nom || 'Utilisateur AYYOU',
          badgeType: u.badgeType || 'UTILISATEUR',
          email: u.email || '',
          role: (u.role as any) || 'Utilisateur',
          iconeRole: u.iconeRole || 'fa-solid fa-user',
          couleurIconeRole: u.couleurIconeRole || 'text-slate-500',
          dateInscription: u.dateInscription || '',
          statut: (u.statut as StatutUtilisateur) || 'ACTIF',
          photoUrl: u.photoUrl || undefined,
          iconeLogo: u.role === 'Restaurant' ? 'fa-solid fa-utensils' : undefined,
          fondIconeLogo: u.role === 'Restaurant' ? 'bg-amber-100 text-amber-700' : undefined,
          telephone: u.telephone || '',
          nombreCommandes: u.nombreCommandes || 0
        }));

        this.listeUtilisateurs.set(liste);
        this.chargementEnCours.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement utilisateurs:', err);
        this.chargementEnCours.set(false);
      }
    });
  }

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
        const correspondNom = (u.nom || '').toLowerCase().includes(recherche);
        const correspondEmail = (u.email || '').toLowerCase().includes(recherche);
        const correspondTel = (u.telephone || '').toLowerCase().includes(recherche);
        if (!correspondNom && !correspondEmail && !correspondTel) {
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

  changerOnglet(onglet: OngletTypeUtilisateur): void {
    this.ongletActif.set(onglet);
    this.pageActuelle.set(1);
  }

  editerUtilisateur(u: UtilisateurAdministration): void {
    this.utilisateurEnEdition.set({ ...u });
    this.modaleEditionOuverte.set(true);
  }

  fermerModaleEdition(): void {
    this.modaleEditionOuverte.set(false);
    this.utilisateurEnEdition.set(null);
  }

  sauvegarderUtilisateur(): void {
    const u = this.utilisateurEnEdition();
    if (!u) return;

    if (u.id) {
      this.http.post(`${environment.apiUrl}/administration/utilisateurs/${u.id}/basculer-statut/`, {}).subscribe({
        next: () => {
          this.notificationSucces.set(`Statut du compte "${u.nom}" mis à jour avec succès.`);
          this.fermerModaleEdition();
          this.chargerUtilisateurs();
          setTimeout(() => this.notificationSucces.set(null), 3000);
        },
        error: () => {
          this.notificationSucces.set(`Erreur lors de la mise à jour de "${u.nom}".`);
          setTimeout(() => this.notificationSucces.set(null), 3000);
        }
      });
    } else {
      this.fermerModaleEdition();
    }
  }

  ouvrirAlerteUtilisateur(u: UtilisateurAdministration): void {
    this.utilisateurEnAlerte.set(u);
    this.messageAlerte.set(
      u.statut === 'BANNI' || u.statut === 'INACTIF'
        ? `Bonjour ${u.nom}, votre compte fait l'objet d'une suspension temporaire pour non-respect des conditions d'utilisation AYYOU.`
        : `Avis de sécurité officiel concernant votre activité sur la plateforme AYYOU.`
    );
    this.modaleAlerteOuverte.set(true);
  }

  fermerModaleAlerte(): void {
    this.modaleAlerteOuverte.set(false);
    this.utilisateurEnAlerte.set(null);
  }

  envoyerAlerte(): void {
    const u = this.utilisateurEnAlerte();
    const message = this.messageAlerte().trim();
    if (!u?.id || !message || this.envoiAlerteEnCours()) return;

    this.envoiAlerteEnCours.set(true);
    this.http
      .post<{ message: string }>(`${environment.apiUrl}/administration/utilisateurs/${u.id}/alerter/`, { message })
      .subscribe({
        next: (reponse) => {
          this.envoiAlerteEnCours.set(false);
          this.notificationSucces.set(reponse.message);
          this.fermerModaleAlerte();
          setTimeout(() => this.notificationSucces.set(null), 4000);
        },
        error: (erreur) => {
          this.envoiAlerteEnCours.set(false);
          this.notificationSucces.set(erreur?.error?.message || `Échec de l'envoi de l'avertissement à "${u.nom}".`);
          setTimeout(() => this.notificationSucces.set(null), 4000);
        }
      });
  }

  exporterCsv(): void {
    const utilisateurs = this.utilisateursFiltres();
    const lignes = [
      ['ID', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Date Inscription', 'Statut', 'Commandes'].join(';')
    ];

    for (const u of utilisateurs) {
      lignes.push([
        u.identifiant,
        `"${u.nom}"`,
        u.email,
        u.telephone || '',
        u.role,
        u.dateInscription,
        u.statut,
        u.nombreCommandes || 0
      ].join(';'));
    }

    const blob = new Blob([lignes.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.setAttribute('href', url);
    lien.setAttribute('download', `ayyou-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);

    this.notificationSucces.set('Export CSV des utilisateurs téléchargé avec succès.');
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePagesTotal()) {
      this.pageActuelle.set(page);
    }
  }
}
