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
