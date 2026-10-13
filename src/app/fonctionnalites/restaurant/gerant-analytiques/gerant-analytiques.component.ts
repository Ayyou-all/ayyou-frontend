import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type FiltrePeriodeRevenu = '24h' | '7j' | '30j';

export interface CommandeRecenteAnalytique {
  id: string;
  plat: string;
  client: string;
  statut: 'Préparation' | 'En attente' | 'Livré';
  montant: string;
}

@Component({
  selector: 'app-gerant-analytiques',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-analytiques.component.html'
})
export class GerantAnalytiquesComponent {
  // Filtre période de revenus actif (24h, 7 jours, 30 jours)
  readonly periodeActive = signal<FiltrePeriodeRevenu>('7j');

  // Recherche dans l'en-tête
  readonly rechercheTexte = signal<string>('');

  // Statistiques du haut (conformes à l'Image 1)
  readonly commandesJour = signal<number>(42);
  readonly commandesJourProgression = signal<string>('+12%');

  readonly clientsNombre = signal<number>(156);
  readonly clientsProgression = signal<string>('+5%');

  readonly revenusJour = signal<string>('145 000 FCFA');
  readonly revenusJourProgression = signal<string>('+8%');

  // Attribution commerciale des vidéos du Studio (T4-1)
  readonly ventesAttribueesVideos = signal<string>('48 500 FCFA');
  readonly partChiffreAffairesVideos = signal<string>('33% du CA');
  readonly commandesVideos = signal<number>(14);

  // Données des catégories les plus vendues (Diagramme donut conforme à l'Image 1)
  readonly categoriesDonut = signal([
    { nom: 'Plats', pourcentage: 60, couleur: '#E51824' },
    { nom: 'Boissons', pourcentage: 25, couleur: '#3B82F6' },
    { nom: 'Desserts', pourcentage: 15, couleur: '#CBD5E1' }
  ]);

  // Données des commandes de la semaine (Image 1 : L, M, J, V, S, D avec S en rouge)
  readonly barresSemaine = signal([
    { jour: 'L', hauteur: 32, estMax: false },
    { jour: 'M', hauteur: 68, estMax: false },
    { jour: 'J', hauteur: 40, estMax: false },
    { jour: 'V', hauteur: 55, estMax: false },
    { jour: 'S', hauteur: 82, estMax: true }, // Samedi rouge #E51824
    { jour: 'D', hauteur: 62, estMax: false }
  ]);

  // Données de la table des commandes récentes (Image 1)
  readonly listeCommandes = signal<CommandeRecenteAnalytique[]>([
    {
      id: '#CF-8942',
      plat: 'Thieboudienne Royal',
      client: 'Moussa Sylla',
      statut: 'Préparation',
      montant: '4 500 FCFA'
    },
    {
      id: '#CF-8941',
      plat: 'Yassa au Poulet',
      client: 'Aminata Diop',
      statut: 'En attente',
      montant: '3 800 FCFA'
    },
    {
      id: '#CF-8940',
      plat: 'Bissap Frais (x2)',
      client: 'Oumar Kane',
      statut: 'Livré',
      montant: '2 000 FCFA'
    }
  ]);

  readonly commandesFiltrees = computed(() => {
    const q = this.rechercheTexte().trim().toLowerCase();
    if (!q) return this.listeCommandes();
    return this.listeCommandes().filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.plat.toLowerCase().includes(q) ||
        c.client.toLowerCase().includes(q) ||
        c.statut.toLowerCase().includes(q)
    );
  });

  definirPeriode(p: FiltrePeriodeRevenu): void {
    this.periodeActive.set(p);
  }
}
