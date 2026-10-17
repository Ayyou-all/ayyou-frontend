import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { intercepteurJwt } from './socle/intercepteurs/intercepteur-jwt';

// Format français pour les pipes number et date : « 7 000 FCFA », « 17 oct. ».
// Le français sépare les milliers par une espace fine (U+202F) que la police du site n'affiche pas :
// on la remplace par une espace insécable classique (U+00A0).
const localeFrAyyou = localeFr.map((partie) =>
  Array.isArray(partie) ? partie.map((valeur) => (valeur === '\u202f' ? '\u00a0' : valeur)) : partie
);
registerLocaleData(localeFrAyyou, 'fr-FR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([intercepteurJwt])),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'fr-FR' }
  ]
};
