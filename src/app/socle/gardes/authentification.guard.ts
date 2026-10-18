import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ServiceAbonnement } from '../services/service-abonnement.service';
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

/**
 * Garde des pages de l'espace restaurant : un restaurant SUSPENDU (essai terminé, pas d'abonnement)
 * est renvoyé vers « Mon abonnement ». Il garde l'accès à son profil et à ses commandes en cours.
 * Le backend bloque de toute façon les actions (réponse 403 « abonnement_requis »).
 */
export const gardeAbonnementRestaurant: CanActivateChildFn = (route, state) => {
  const serviceAuth = inject(ServiceAuthentification);
  if (!serviceAuth.estGerant()) {
    return true;
  }
  const serviceAbonnement = inject(ServiceAbonnement);
  const routeur = inject(Router);
  const pagesToujoursAccessibles = ['/gerant/abonnement', '/gerant/profil', '/gerant/commandes'];

  return serviceAbonnement.charger().pipe(
    map((reponse) =>
      reponse.abonnement.statut === 'SUSPENDU' && !pagesToujoursAccessibles.some((page) => state.url.startsWith(page))
        ? routeur.createUrlTree(['/gerant/abonnement'])
        : true
    ),
    // Réseau indisponible : on laisse passer, le backend reste la source de vérité.
    catchError(() => of(true))
  );
};
