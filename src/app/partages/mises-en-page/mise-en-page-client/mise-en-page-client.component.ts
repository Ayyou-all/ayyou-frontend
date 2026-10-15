import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DetailProduitComponent } from '../../../fonctionnalites/catalogue/detail-produit/detail-produit.component';
import { ModaleConnexionRequiseComponent } from '../../composants/modale-connexion-requise/modale-connexion-requise.component';
import { ChatbotCulinaireComponent } from '../../composants/chatbot-culinaire/chatbot-culinaire.component';
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
  imports: [
    CommonModule,
    RouterModule,
    DetailProduitComponent,
    ModaleConnexionRequiseComponent,
    ChatbotCulinaireComponent
  ],
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

  // Calcul du chemin dynamique pour le profil selon le rôle de l'utilisateur
  obtenirCheminProfil(): string {
    if (this.serviceAuthentification.estLivreur()) {
      return '/livreur/profil';
    }
    if (this.serviceAuthentification.estGerant()) {
      return '/gerant/profil';
    }
    if (this.serviceAuthentification.estAdministrateur()) {
      return '/administration';
    }
    return '/profil';
  }

  obtenirCheminOnglet(onglet: OngletNavigation): string {
    if (onglet.code === 'profil') {
      return this.obtenirCheminProfil();
    }
    return onglet.chemin;
  }

  // Calcul de l'URL courante pour l'onglet actif
  estOngletActif(chemin: string): boolean {
    return this.routeur.url.startsWith(chemin);
  }

  /**
   * Intercepte le clic sur les onglets sensibles (Commandes, Profil) en mode visiteur ou selon le rôle.
   */
  gererClicOnglet(evenement: Event, onglet: OngletNavigation): void {
    if (onglet.code === 'profil' && this.serviceAuthentification.estAuthentifie()) {
      const cheminCible = this.obtenirCheminProfil();
      if (cheminCible !== '/profil') {
        evenement.preventDefault();
        evenement.stopPropagation();
        this.routeur.navigate([cheminCible]);
        return;
      }
    }

    if ((onglet.code === 'commandes' || onglet.code === 'profil') && !this.serviceAuthentification.estAuthentifie()) {
      evenement.preventDefault();
      evenement.stopPropagation();
      this.serviceAuthentification.exigerAuthentification(
        'ESPACE_PRIVE',
        () => {
          this.routeur.navigate([this.obtenirCheminOnglet(onglet)]);
        },
        {
          titre: onglet.code === 'commandes' ? 'Mes Commandes' : 'Mon Profil',
          description:
            onglet.code === 'commandes'
              ? 'Connectez-vous pour consulter vos commandes en cours et votre historique de livraison.'
              : 'Connectez-vous pour accéder à votre profil, vos adresses et vos préférences.'
        }
      );
    }
  }

  deconnecter(): void {
    this.serviceAuthentification.deconnecter();
    this.routeur.navigate(['/accueil']);
  }
}
