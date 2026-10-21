import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Plat } from '../../socle/modeles/plat.modele';
import { Restaurant } from '../../socle/modeles/restaurant.modele';
import { ServiceCatalogueService } from '../../socle/services/service-catalogue.service';
import { AnalyseRechercheVocale } from '../../socle/services/service-ia.service';
import { CatalogueComponent } from './catalogue.component';

const plat = (nom: string, prixFcfa: number): Plat =>
  ({ identifiant: nom, nom, prixFcfa, description: '', categorie: '' }) as Plat;

const restaurant = (nom: string, quartierVille: string, plats: Plat[], estOuvert = true): Restaurant =>
  ({
    identifiant: nom,
    nom,
    nomUtilisateur: nom.toLowerCase(),
    description: '',
    specialite: 'Cuisine sénégalaise',
    adresse: '',
    quartierVille,
    estOuvert,
    plats
  }) as Restaurant;

const analyse = (filtres: Partial<AnalyseRechercheVocale>): AnalyseRechercheVocale => ({
  texte: '',
  specialites: [],
  termes_recherche: [],
  mots_libres: [],
  budget_max_fcfa: null,
  quartier: null,
  tri: null,
  ouvert_seulement: false,
  source: 'FASTAPI_IA',
  ...filtres
});

describe('Catalogue — recherche vocale intelligente', () => {
  let catalogue: CatalogueComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    TestBed.inject(ServiceCatalogueService).restaurants.set([
      restaurant('Chez Fatou', 'Médina', [plat('Thiéboudienne au poisson', 2500), plat('Yassa poulet', 3000)]),
      restaurant('Le Lagon', 'Plateau', [plat('Thieboudienne royal', 6000)]),
      restaurant('Burger House', 'Médina', [plat('Cheeseburger', 3500)], false)
    ]);
    catalogue = TestBed.createComponent(CatalogueComponent).componentInstance;
  });

  const noms = () => catalogue.listeRestaurantsFiltree().map((r) => r.nom);

  it('trouve le plat quelle que soit son orthographe et trie « pas cher » par prix', () => {
    catalogue.filtresVocaux.set(analyse({ specialites: ['thieb'], termes_recherche: ['thieb', 'thieboudienne'], tri: 'PRIX' }));
    expect(noms()).toEqual(['Chez Fatou', 'Le Lagon']);
  });

  it('applique le budget et le quartier compris dans la phrase', () => {
    catalogue.filtresVocaux.set(analyse({ termes_recherche: ['thieboudienne'], budget_max_fcfa: 5000 }));
    expect(noms()).toEqual(['Chez Fatou']);

    catalogue.filtresVocaux.set(analyse({ quartier: 'Medina' }));
    expect(noms()).toEqual(['Chez Fatou', 'Burger House']);
  });

  it('retrouve un restaurant par son nom et respecte « ouvert maintenant »', () => {
    catalogue.filtresVocaux.set(analyse({ mots_libres: ['burger'] }));
    expect(noms()).toEqual(['Burger House']);

    catalogue.filtresVocaux.set(analyse({ mots_libres: ['burger'], ouvert_seulement: true }));
    expect(noms()).toEqual([]);
  });

  it('la saisie au clavier remplace la recherche vocale', () => {
    catalogue.filtresVocaux.set(analyse({ mots_libres: ['burger'] }));
    catalogue.modifierTexteRecherche('lagon');
    expect(catalogue.filtresVocaux()).toBeNull();
    expect(noms()).toEqual(['Le Lagon']);
  });
});
