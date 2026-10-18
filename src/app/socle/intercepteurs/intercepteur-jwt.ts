/**
 * Intercepteur HTTP pour l'injection du jeton JWT d'accès Django REST Framework
 * et renouvellement automatique silencieux en cas d'expiration (401).
 * Tous les termes sont rédigés en français selon les standards du projet AYYOU.
 */

import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { ServiceAuthentification } from '../services/service-authentification.service';

let estEnCoursDeRafraichissement = false;
const jetonRafraichi$ = new BehaviorSubject<string | null>(null);

function clonerRequeteAvecJeton(requete: HttpRequest<unknown>, jeton: string): HttpRequest<unknown> {
  return requete.clone({
    setHeaders: {
      Authorization: `Bearer ${jeton}`
    }
  });
}

function gererErreur401(
  requete: HttpRequest<unknown>,
  suivant: HttpHandlerFn,
  serviceAuth: ServiceAuthentification
) {
  // S'il n'y a pas de jeton de rafraîchissement en stock, déconnexion immédiate
  if (!serviceAuth.obtenirJetonRafraichissement()) {
    serviceAuth.deconnecter();
    return throwError(() => new Error('Session expirée (aucun jeton de rafraîchissement).'));
  }

  if (!estEnCoursDeRafraichissement) {
    estEnCoursDeRafraichissement = true;
    jetonRafraichi$.next(null);

    return serviceAuth.rafraichirJetonAcces().pipe(
      switchMap((nouveauJeton: string) => {
        estEnCoursDeRafraichissement = false;
        jetonRafraichi$.next(nouveauJeton);
        return suivant(clonerRequeteAvecJeton(requete, nouveauJeton));
      }),
      catchError((erreurRafraichissement) => {
        estEnCoursDeRafraichissement = false;
        jetonRafraichi$.next(null);
        serviceAuth.deconnecter();
        return throwError(() => erreurRafraichissement);
      })
    );
  }

  // Si un rafraîchissement est déjà en cours par une autre requête concurrente,
  // on attend que le nouveau jeton soit émis puis on rejoue la requête
  return jetonRafraichi$.pipe(
    filter((jeton): jeton is string => jeton !== null),
    take(1),
    switchMap((nouveauJeton) => suivant(clonerRequeteAvecJeton(requete, nouveauJeton)))
  );
}

export const intercepteurJwt: HttpInterceptorFn = (requete, suivant) => {
  const serviceAuth = inject(ServiceAuthentification);
  const routeur = inject(Router);

  // Pour l'appel de rafraîchissement ou de connexion, on n'ajoute pas de Bearer expiré
  const estRequeteRafraichissement = requete.url.includes('/authentification/rafraichir/');
  const estRequeteConnexion = requete.url.includes('/authentification/connexion/');
  const estRequeteInscription = requete.url.includes('/authentification/inscription/');

  const jetonAcces = serviceAuth.obtenirJetonAcces();

  let requeteModifiee = requete;
  if (jetonAcces && !requete.headers.has('Authorization') && !estRequeteRafraichissement) {
    requeteModifiee = clonerRequeteAvecJeton(requete, jetonAcces);
  }

  return suivant(requeteModifiee).pipe(
    catchError((erreur: HttpErrorResponse) => {
      // Si l'erreur est un 401 sur une requête normale (hors auth initiale / refresh)
      if (
        erreur.status === 401 &&
        !estRequeteConnexion &&
        !estRequeteInscription &&
        !estRequeteRafraichissement
      ) {
        return gererErreur401(requete, suivant, serviceAuth);
      }

      // Restaurant suspendu (essai terminé, pas d'abonnement) : on l'amène sur la page d'abonnement
      if (erreur.status === 403 && erreur.error?.code === 'abonnement_requis') {
        routeur.navigateByUrl('/gerant/abonnement');
      }

      // Si le refresh lui-même renvoie une erreur (401 ou 400), on déconnecte
      if (estRequeteRafraichissement && (erreur.status === 401 || erreur.status === 400)) {
        serviceAuth.deconnecter();
      }

      return throwError(() => erreur);
    })
  );
};
