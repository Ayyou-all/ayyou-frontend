import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DetailProduitComponent } from '../../../fonctionnalites/catalogue/detail-produit/detail-produit.component';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

export interface OngletNavigation {
  code: string;
  libelle: string;
  icone: string;
  chemin: string;
  aBadge?: boolean;
}

@Component({
  selector: 'app-mise-en-page-client',
  standalone: true,
  imports: [CommonModule, RouterModule, DetailProduitComponent],
  templateUrl: './mise-en-page-client.component.html'
})
export class MiseEnPageClientComponent {
  readonly routeur = inject(Router);
  readonly servicePanier = inject(ServicePanierService);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly serviceAuthentification = inject(ServiceAuthentification);

  // Liste des 5 onglets de navigation conformes aux maquettes
  readonly listeOnglets: OngletNavigation[] = [
    {
      code: 'accueil',
      libelle: 'Accueil',
      icone: 'fa-solid fa-house',
      chemin: '/accueil'
    },
    {
      code: 'catalogue',
      libelle: 'Catalogue',
      icone: 'fa-solid fa-book-open',
      chemin: '/catalogue'
    },
    {
      code: 'commandes',
      libelle: 'Commandes',
      icone: 'fa-solid fa-receipt',
      chemin: '/commandes'
    },
    {
      code: 'panier',
      libelle: 'Panier',
      icone: 'fa-solid fa-cart-shopping',
      chemin: '/panier',
      aBadge: true
    },
    {
      code: 'profil',
      libelle: 'Profil',
      icone: 'fa-solid fa-user',
      chemin: '/profil'
    }
  ];

  // Calcul de l'URL courante pour l'onglet actif
  estOngletActif(chemin: string): boolean {
    return this.routeur.url.startsWith(chemin);
  }

  deconnecter(): void {
    this.serviceAuthentification.deconnecter();
    this.routeur.navigate(['/connexion']);
  }
}
