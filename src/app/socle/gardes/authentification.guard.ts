import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServiceAuthentification } from '../services/service-authentification.service';

/**
 * Garde d'accès à l'espace Superadmin d'AYYOU.
 * Exige une authentification avec le rôle ADMINISTRATEUR.
 */
export const gardeAdministration: CanActivateFn = (route, state) => {
  const serviceAuth = inject(ServiceAuthentification);
  const routeur = inject(Router);

  if (serviceAuth.estAuthentifie() && serviceAuth.estAdministrateur()) {
    return true;
  }

  return routeur.createUrlTree(['/connexion'], {
    queryParams: { redirection: state.url }
  });
};

/**
 * Garde d'accès à l'espace Gérant de restaurant d'AYYOU.
 * Exige une authentification avec le rôle RESTAURANT ou ADMINISTRATEUR.
 */
export const gardeGerant: CanActivateFn = (route, state) => {
  const serviceAuth = inject(ServiceAuthentification);
  const routeur = inject(Router);

  if (serviceAuth.estAuthentifie() && (serviceAuth.estGerant() || serviceAuth.estAdministrateur())) {
    return true;
  }

  return routeur.createUrlTree(['/connexion'], {
    queryParams: { redirection: state.url }
  });
};

/**
 * Garde d'accès à l'espace Livreur d'AYYOU.
 * Exige une authentification avec le rôle LIVREUR ou ADMINISTRATEUR.
 */
export const gardeLivreur: CanActivateFn = (route, state) => {
  const serviceAuth = inject(ServiceAuthentification);
  const routeur = inject(Router);

  if (serviceAuth.estAuthentifie() && (serviceAuth.estLivreur() || serviceAuth.estAdministrateur())) {
    return true;
  }

  return routeur.createUrlTree(['/connexion'], {
    queryParams: { redirection: state.url }
  });
};

/**
 * Garde de redirection automatique pour la route profil générique (/profil).
 * Si l'utilisateur connecté est un Livreur, le redirige immédiatement vers /livreur/profil.
 * Si c'est un Gérant de restaurant, le redirige vers /gerant/profil.
 * Si c'est un Administrateur, le redirige vers /administration.
 * Sinon (Client simple ou Visiteur), laisse passer vers /profil.
 */
export const gardeProfilRedirection: CanActivateFn = () => {
  const serviceAuth = inject(ServiceAuthentification);
  const routeur = inject(Router);

  if (serviceAuth.estAuthentifie()) {
    if (serviceAuth.estLivreur()) {
      return routeur.createUrlTree(['/livreur/profil']);
    }
    if (serviceAuth.estGerant()) {
      return routeur.createUrlTree(['/gerant/profil']);
    }
    if (serviceAuth.estAdministrateur()) {
      return routeur.createUrlTree(['/administration']);
    }
  }

  return true;
};
