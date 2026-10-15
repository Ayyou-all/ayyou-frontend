/**
 * Intercepteur HTTP pour l'injection du jeton JWT d'accès Django REST Framework.
 * Tous les termes sont rédigés en français selon les standards du projet AYYOU.
 */

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const CLE_STOCKAGE_JETON = 'ayyou_jeton_acces';
const CLE_STOCKAGE_UTILISATEUR = 'ayyou_utilisateur_connecte';

export const intercepteurJwt: HttpInterceptorFn = (requete, suivant) => {
  const routeur = inject(Router);

  let jetonAcces: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    jetonAcces = localStorage.getItem(CLE_STOCKAGE_JETON);
  }

  // Injecter le Bearer token si présent et non déjà renseigné
  let requeteModifiee = requete;
  if (jetonAcces && !requete.headers.has('Authorization')) {
    requeteModifiee = requete.clone({
      setHeaders: {
        Authorization: `Bearer ${jetonAcces}`
      }
    });
  }

  return suivant(requeteModifiee).pipe(
    catchError((erreur: HttpErrorResponse) => {
      // Si session expirée ou invalide sur une route protégée (401 non-connexion)
      if (erreur.status === 401 && !requete.url.includes('/authentification/connexion/')) {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(CLE_STOCKAGE_JETON);
          localStorage.removeItem(CLE_STOCKAGE_UTILISATEUR);
        }
      }
      return throwError(() => erreur);
    })
  );
};
