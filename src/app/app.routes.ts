import { Routes } from '@angular/router';

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
    path: 'livreur',
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
    loadComponent: () =>
      import(
        './fonctionnalites/livreur/gains-livreur/gains-livreur.component'
      ).then((m) => m.GainsLivreurComponent),
    title: 'Mes Gains — AYYOU'
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
