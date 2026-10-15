import { Routes } from '@angular/router';
import {
  gardeAdministration,
  gardeGerant,
  gardeLivreur,
  gardeProfilRedirection
} from './socle/gardes/authentification.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    loadComponent: () =>
      import(
        './fonctionnalites/authentification/connexion/connexion.component'
      ).then((m) => m.ConnexionComponent),
    title: 'Connexion — AYYOU'
  },
  {
    path: 'inscription',
    loadComponent: () =>
      import(
        './fonctionnalites/authentification/inscription/inscription.component'
      ).then((m) => m.InscriptionComponent),
    title: 'Inscription — AYYOU'
  },
  {
    path: 'restaurant',
    redirectTo: 'gerant',
    pathMatch: 'prefix'
  },
  {
    path: 'livreur',
    canActivate: [gardeLivreur],
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/accueil-livreur/accueil-livreur.component'
      ).then((m) => m.AccueilLivreurComponent),
    title: 'Espace Livreur — AYYOU'
  },
  {
    path: 'livreur/navigation',
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/navigation-livraison/navigation-livraison.component'
      ).then((m) => m.NavigationLivraisonComponent),
    title: 'Navigation GPS Livreur — AYYOU'
  },
  {
    path: 'livreur/verification',
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/verification-commande/verification-commande.component'
      ).then((m) => m.VerificationCommandeComponent),
    title: 'Vérification Commande — AYYOU'
  },
  {
    path: 'livreur/trajet-client',
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/trajet-client/trajet-client.component'
      ).then((m) => m.TrajetClientComponent),
    title: 'Trajet vers le Client — AYYOU'
  },
  {
    path: 'livreur/validation-code',
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/validation-code/validation-code.component'
      ).then((m) => m.ValidationCodeComponent),
    title: 'Confirmer la Livraison — AYYOU'
  },
  {
    path: 'livreur/fin-livraison',
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/fin-livraison/fin-livraison.component'
      ).then((m) => m.FinLivraisonComponent),
    title: 'Livraison Terminée — AYYOU'
  },
  {
    path: 'livreur/gains',
    canActivate: [gardeLivreur],
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/gains-livreur/gains-livreur.component'
      ).then((m) => m.GainsLivreurComponent),
    title: 'Mes Gains — AYYOU'
  },
  {
    path: 'livreur/profil',
    canActivate: [gardeLivreur],
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/profil-livreur/profil-livreur.component'
      ).then((m) => m.ProfilLivreurComponent),
    title: 'Mon Profil — Espace Livreur AYYOU'
  },
  {
    path: 'administration',
    canActivate: [gardeAdministration],
    loadComponent: () =>
      import(
        './partages/mises-en-page/mise-en-page-administration/mise-en-page-administration.component'
      ).then((m) => m.MiseEnPageAdministrationComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'tableau-de-bord'
      },
      {
        path: 'tableau-de-bord',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/tableau-de-bord/tableau-de-bord.component'
          ).then((m) => m.TableauDeBordComponent),
        title: 'Tableau de bord — Superadmin AYYOU'
      },
      {
        path: 'validations',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/validations/validations.component'
          ).then((m) => m.ValidationsComponent),
        title: 'Validations en attente — Superadmin AYYOU'
      },
      {
        path: 'utilisateurs',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/utilisateurs/utilisateurs.component'
          ).then((m) => m.UtilisateursComponent),
        title: 'Gestion des Utilisateurs — Superadmin AYYOU'
      },
      {
        path: 'commandes',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/commandes/commandes-admin.component'
          ).then((m) => m.CommandesAdminComponent),
        title: 'Gestion des Commandes — Superadmin AYYOU'
      },
      {
        path: 'restaurants',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/restaurants/restaurants-admin.component'
          ).then((m) => m.RestaurantsAdminComponent),
        title: 'Gestion des Restaurants — Superadmin AYYOU'
      },
      {
        path: 'livreurs',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/livreurs/livreurs-admin.component'
          ).then((m) => m.LivreursAdminComponent),
        title: 'Gestion des Livreurs — Superadmin AYYOU'
      },
      {
        path: 'coursiers',
        redirectTo: 'livreurs',
        pathMatch: 'full'
      },
      {
        path: 'statistiques',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/statistiques/statistiques-admin.component'
          ).then((m) => m.StatistiquesAdminComponent),
        title: 'Rapports et Statistiques — Superadmin AYYOU'
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import(
            './fonctionnalites/administration/parametres/parametres-admin.component'
          ).then((m) => m.ParametresAdminComponent),
        title: 'Paramètres — Superadmin AYYOU'
      }
    ]
  },
  {
    path: 'gerant',
    canActivate: [gardeGerant],
    loadComponent: () =>
      import(
        './partages/mises-en-page/mise-en-page-gerant/mise-en-page-gerant.component'
      ).then((m) => m.MiseEnPageGerantComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'commandes'
      },
      {
        path: 'commandes',
        loadComponent: () =>
          import(
            './fonctionnalites/restaurant/gerant-commandes/gerant-commandes.component'
          ).then((m) => m.GerantCommandesComponent),
        title: 'Gestion des Commandes — Espace Restaurant AYYOU'
      },
      {
        path: 'menu',
        loadComponent: () =>
          import(
            './fonctionnalites/restaurant/gerant-menu/gerant-menu.component'
          ).then((m) => m.GerantMenuComponent),
        title: 'Gestion du Menu — Espace Restaurant AYYOU'
      },
      {
        path: 'historique',
        loadComponent: () =>
          import(
            './fonctionnalites/restaurant/gerant-historique/gerant-historique.component'
          ).then((m) => m.GerantHistoriqueComponent),
        title: 'Historique des Commandes — Espace Restaurant AYYOU'
      },
      {
        path: 'analytiques',
        loadComponent: () =>
          import(
            './fonctionnalites/restaurant/gerant-analytiques/gerant-analytiques.component'
          ).then((m) => m.GerantAnalytiquesComponent),
        title: 'Performances & Analytiques — Espace Restaurant AYYOU'
      },
      {
        path: 'menu-studio',
        loadComponent: () =>
          import(
            './fonctionnalites/restaurant/gerant-ayyou-studio/gerant-ayyou-studio.component'
          ).then((m) => m.GerantAyyouStudioComponent),
        title: 'Studio & Vidéos — Espace Restaurant AYYOU'
      },
      {
        path: 'ayyou-studio',
        redirectTo: 'menu-studio',
        pathMatch: 'full'
      },
      {
        path: 'profil',
        loadComponent: () =>
          import(
            './fonctionnalites/restaurant/gerant-profil/gerant-profil.component'
          ).then((m) => m.GerantProfilComponent),
        title: 'Mon Profil & Établissement — Espace Restaurant AYYOU'
      }
    ]
  },
  {
    path: '',
    loadComponent: () =>
      import(
        './partages/mises-en-page/mise-en-page-client/mise-en-page-client.component'
      ).then((m) => m.MiseEnPageClientComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'accueil'
      },
      {
        path: 'accueil',
        loadComponent: () =>
          import('./fonctionnalites/accueil/accueil.component').then(
            (m) => m.AccueilComponent
          ),
        title: 'Accueil — AYYOU'
      },
      {
        path: 'catalogue',
        loadComponent: () =>
          import('./fonctionnalites/catalogue/catalogue.component').then(
            (m) => m.CatalogueComponent
          ),
        title: 'Catalogue — AYYOU'
      },
      {
        path: 'restaurant/:id',
        loadComponent: () =>
          import(
            './fonctionnalites/restaurant/detail/detail-restaurant.component'
          ).then((m) => m.DetailRestaurantComponent),
        title: 'Restaurant — AYYOU'
      },
      {
        path: 'commandes',
        loadComponent: () =>
          import('./fonctionnalites/commandes/commandes.component').then(
            (m) => m.CommandesComponent
          ),
        title: 'Mes Commandes — AYYOU'
      },
      {
        path: 'commandes/suivi/:idCommande',
        loadComponent: () =>
          import(
            './fonctionnalites/commandes/suivi-commande/suivi-commande.component'
          ).then((m) => m.SuiviCommandeComponent),
        title: 'Suivi de Commande — AYYOU'
      },
      {
        path: 'panier',
        loadComponent: () =>
          import('./fonctionnalites/panier/panier.component').then(
            (m) => m.PanierComponent
          ),
        title: 'Mes Paniers — AYYOU'
      },
      {
        path: 'panier/detail/:idRestaurant',
        loadComponent: () =>
          import(
            './fonctionnalites/panier/detail-panier/detail-panier.component'
          ).then((m) => m.DetailPanierComponent),
        title: 'Détail Panier — AYYOU'
      },
      {
        path: 'profil',
        canActivate: [gardeProfilRedirection],
        loadComponent: () =>
          import('./fonctionnalites/profil/profil.component').then(
            (m) => m.ProfilComponent
          ),
        title: 'Mon Profil — AYYOU'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'accueil'
  }
];
