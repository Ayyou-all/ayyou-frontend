import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  LigneHistoriqueGerant,
  ServiceRestaurantCommandesService
} from '../../../socle/services/service-restaurant-commandes.service';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';

@Component({
  selector: 'app-gerant-historique',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-historique.component.html'
})
export class GerantHistoriqueComponent {
  private readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);
  private readonly serviceAuth = inject(ServiceAuthentification);
  private readonly http = inject(HttpClient);

  // Nom dynamique de l'établissement
  readonly nomRestaurant = signal<string>('Mon Restaurant');

  // Date sélectionnée réelle
  readonly dateSelectionnee = signal<string>('');

  constructor() {
    const user = this.serviceAuth.utilisateurConnecte();
    if (user?.nomEtablissement) {
      this.nomRestaurant.set(user.nomEtablissement);
    }
    const d = new Date();
    const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    this.dateSelectionnee.set(`Aujourd'hui, ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`);

    this.http.get<any>(`${environment.apiUrl}/etablissements/mon-etablissement/`).subscribe({
      next: (etab) => {
        if (etab?.nom) this.nomRestaurant.set(etab.nom);
      },
      error: () => {}
    });
  }

  // Recherche
  readonly rechercheTexte = signal<string>('');

  // Tri
  readonly triActif = signal<'recent' | 'montant'>('recent');

  // Modale détail commande
  readonly commandeSelectionnee = signal<LigneHistoriqueGerant | null>(null);

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  // Pagination
  readonly pageActuelle = signal<number>(1);
  readonly elementsParPage = 5;

  // Données de l'historique connectées en temps réel au service central
  readonly listeCommandes = computed(() => this.serviceRestaurant.historiqueCommandes());

  // Commandes filtrées
  readonly commandesFiltrees = computed(() => {
    const q = this.rechercheTexte().trim().toLowerCase();
    let res = this.listeCommandes().filter((c) => {
      if (!q) return true;
      return (
        c.numero.toLowerCase().includes(q) ||
        c.clientNom.toLowerCase().includes(q) ||
        c.articlesResume.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
      );
    });

    if (this.triActif() === 'montant') {
      res = [...res].sort((a, b) => b.montantTotal - a.montantTotal);
    }
    return res;
  });

  // Pagination dynamique
  readonly nombrePages = computed(() =>
    Math.ceil(this.commandesFiltrees().length / this.elementsParPage) || 1
  );

  readonly commandesPaginees = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.elementsParPage;
    return this.commandesFiltrees().slice(debut, debut + this.elementsParPage);
  });

  // Métriques du résumé du jour en temps réel
  readonly totalCommandesJour = computed(() => this.serviceRestaurant.totalCommandesJour());
  readonly chiffreAffairesJour = computed(() => this.serviceRestaurant.chiffreAffairesJour());

  readonly pagesDisponibles = computed(() => {
    const total = this.nombrePages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePages()) {
      this.pageActuelle.set(page);
    }
  }

  exporterHistorique(): void {
    const commandes = this.listeCommandes();
    if (!commandes || commandes.length === 0) {
      this.notificationSucces.set('Aucune commande à exporter dans l\'historique.');
      setTimeout(() => this.notificationSucces.set(null), 3000);
      return;
    }

    const entetes = ['Numero', 'Heure', 'Client', 'Type', 'Articles', 'Statut', 'Montant_FCFA'];
    const lignes = commandes.map((c) => [
      `"${c.numero}"`,
      `"${c.heure}"`,
      `"${c.clientNom}"`,
      `"${c.type}"`,
      `"${c.articlesResume.replace(/"/g, '""')}"`,
      `"${c.statut}"`,
      c.montantTotal
    ]);

    const csvContent = '\uFEFF' + [entetes.join(';'), ...lignes.map((l) => l.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    const slug = this.nomRestaurant().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const nomFichier = `historique-${slug}-${new Date().toISOString().split('T')[0]}.csv`;
    lien.setAttribute('href', url);
    lien.setAttribute('download', nomFichier);
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);

    this.notificationSucces.set(`Export "${nomFichier}" téléchargé avec succès.`);
    setTimeout(() => this.notificationSucces.set(null), 3500);
  }

  genererRapportPdf(): void {
    window.print();
  }

  afficherDetail(commande: LigneHistoriqueGerant): void {
    this.commandeSelectionnee.set(commande);
  }

  fermerDetail(): void {
    this.commandeSelectionnee.set(null);
  }
}
