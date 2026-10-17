import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServiceAuthentification } from './service-authentification.service';
import { ServiceRestaurantCommandesService } from './service-restaurant-commandes.service';
import { ServiceLivreurService } from './service-livreur.service';
import { ServiceCommandesService } from './service-commandes.service';
import { ServicePanierService } from './service-panier.service';
import {
  gardeAdministration,
  gardeGerant,
  gardeLivreur
} from '../gardes/authentification.guard';
import { CarteIndicateurSuperadmin, TableauDeBordComponent } from '../../fonctionnalites/administration/tableau-de-bord/tableau-de-bord.component';
import { RoleUtilisateur } from '../modeles/utilisateur.modele';

describe('Vérifications Unitaires Multi-Lots (Lots 0, 1, 2, 4) — AYYOU', () => {
  let serviceAuth: ServiceAuthentification;
  let serviceRestaurant: ServiceRestaurantCommandesService;
  let serviceLivreur: ServiceLivreurService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ServiceAuthentification,
        ServiceRestaurantCommandesService,
        ServiceLivreurService,
        ServiceCommandesService,
        ServicePanierService,
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true),
            createUrlTree: (cmds: any[], extras: any) => ({ path: cmds[0], extras })
          }
        }
      ]
    });

    serviceAuth = TestBed.inject(ServiceAuthentification);
    serviceRestaurant = TestBed.inject(ServiceRestaurantCommandesService);
    serviceLivreur = TestBed.inject(ServiceLivreurService);
  });

  function simulerUtilisateur(role: RoleUtilisateur): void {
    serviceAuth.utilisateurConnecte.set({
      identifiant: `usr-${role.toLowerCase()}`,
      prenom: 'Test',
      nom: 'User',
      courriel: `${role.toLowerCase()}@test.ayyou.sn`,
      telephone: '+221770000000',
      role,
      estActif: true,
      dateCreation: new Date().toISOString()
    });
  }

  describe('A. Rôles et isolation', () => {
    it('devrait détecter correctement le rôle Gérant', () => {
      simulerUtilisateur('RESTAURANT');
      expect(serviceAuth.estGerant()).toBe(true);
      expect(serviceAuth.estClient()).toBe(false);
      expect(serviceAuth.estLivreur()).toBe(false);
      expect(serviceAuth.estAdministrateur()).toBe(false);
    });

    it('devrait détecter correctement le rôle Client', () => {
      simulerUtilisateur('CLIENT');
      expect(serviceAuth.estClient()).toBe(true);
      expect(serviceAuth.estGerant()).toBe(false);
      expect(serviceAuth.estAdministrateur()).toBe(false);
    });
  });

  describe('B. Tableau de cuisine — répartition des commandes renvoyées par le serveur', () => {
    const commandeServeur = (reference: string, statut: string, autres: object = {}) => ({
      id: 1,
      reference,
      statut,
      client_nom: 'Amadou Diallo',
      total_fcfa: 12500,
      sous_total_fcfa: 11000,
      commission_plateforme_fcfa: 1000,
      date_creation: '2026-10-16T12:30:00Z',
      articles: [{ nom_plat: 'Thieboudienne', quantite: 2 }],
      ...autres
    });

    it('garde une commande prête dans la colonne « Prêtes » tant que la remise n est pas confirmée', () => {
      serviceRestaurant.appliquerCommandesServeur([
        commandeServeur('ORD-1', 'COURSE_ASSIGNEE', { remise_confirmee: false, livreur: { nom: 'Moussa' } })
      ]);
      const commande = serviceRestaurant.commandesPretes()[0];
      expect(commande.numero).toBe('ORD-1');
      expect(commande.livreurAssigne).toBe(true);
    });

    it('passe la commande dans l historique « en cours » une fois la remise confirmée par le serveur', () => {
      serviceRestaurant.appliquerCommandesServeur([commandeServeur('ORD-2', 'EN_VERIFICATION', { remise_confirmee: true })]);
      expect(serviceRestaurant.commandesPretes().length).toBe(0);
      expect(serviceRestaurant.historiqueCommandes()[0].statut).toBe('EN_COURS');
    });

    it('classe les commandes livrées et annulées dans l historique', () => {
      serviceRestaurant.appliquerCommandesServeur([
        commandeServeur('ORD-3', 'LIVREE'),
        commandeServeur('ORD-4', 'ECHEC_LIVRAISON')
      ]);
      const statuts = serviceRestaurant.historiqueCommandes().map((h) => h.statut);
      expect(statuts).toEqual(['LIVRÉE', 'ANNULÉE']);
      // Revenu du restaurant = plats − commission (les frais de livraison ne lui reviennent pas)
      expect(serviceRestaurant.chiffreAffairesJour()).toBe(10000);
    });
  });

  describe('C. Course du livreur — le PIN est vérifié uniquement par le serveur', () => {
    beforeEach(() => {
      serviceLivreur.courseEnCours.set({
        identifiantCommande: '1240',
        restaurantNom: 'Le Teranga',
        restaurantAdresse: 'Plateau',
        restaurantTelephone: '+221 33 800 00 00',
        comptoirRetrait: '',
        clientNom: 'Client Test',
        clientTelephone: '+221 77 000 00 00',
        clientAdresse: 'Sacré-Cœur',
        distanceKm: 3.2,
        gainFcfa: 1200,
        tempsRestantSec: 0,
        tempsTrajetMin: 0,
        articles: [
          { id: 1, nom: 'Thieb', quantite: 1, estVerifie: true },
          { id: 2, nom: 'Bissap', quantite: 1, estVerifie: false }
        ]
      });
    });

    it("n'expose plus de vérification locale du PIN (aucun code sur le téléphone)", () => {
      expect((serviceLivreur as any).verifierCodeValidation).toBeUndefined();
      expect((serviceLivreur as any).validerCodeAsync).toBeUndefined();
    });

    it('ne permet le départ que lorsque tous les articles sont vérifiés', () => {
      expect(serviceLivreur.tousArticlesVerifies()).toBe(false);
      serviceLivreur.courseEnCours.update((c) => (c ? { ...c, articles: c.articles.map((a) => ({ ...a, estVerifie: true })) } : c));
      expect(serviceLivreur.tousArticlesVerifies()).toBe(true);
    });

    it('libère la course à la fin de la livraison', () => {
      serviceLivreur.terminerLivraison();
      expect(serviceLivreur.courseEnCours()).toBeNull();
      expect(serviceLivreur.etapeCourse()).toBe('LIVRE');
    });
  });

  describe('D. Harmonisation de la devise dans l administration', () => {
    it('doit afficher le chiffre d affaires du superadmin en FCFA et non en Euros', () => {
      const comp = TestBed.runInInjectionContext(() => new TableauDeBordComponent());
      const carteCA = comp.listeIndicateurs().find((i: CarteIndicateurSuperadmin) => i.titre === "Chiffre d'affaires");
      expect(carteCA).toBeDefined();
      expect(carteCA?.valeur).toContain('FCFA');
      expect(carteCA?.valeur).not.toContain('€');
    });
  });

  describe('E. Intégration des commandes et sécurisation du code PIN (Django DRF)', () => {
    it('doit adapter fidèlement les commandes retournées par Django REST Framework', () => {
      const serviceCommandes = TestBed.inject(ServiceCommandesService);
      const commandeDjango = {
        id: 42,
        reference: 'CMD-42-TEST',
        etablissement: { nom: 'Le Teranga', logo: 'https://example.com/logo.jpg' },
        statut: 'EN_PREPARATION',
        etape_suivi: 'PREPARATION',
        code_livraison_pin: '4821',
        total_fcfa: 9500,
        est_en_cours: true, // champ toujours renvoyé par SerializerCommandeClient
        articles: [
          { nom_plat: 'Thieboudienne Penda Mbaye', quantite: 2, total_ligne_fcfa: 7000 },
          { nom_plat: 'Jus de Bissap', quantite: 1, total_ligne_fcfa: 2500 }
        ]
      };

      const adaptee = serviceCommandes.adapterCommande(commandeDjango);
      expect(adaptee.identifiant).toBe('CMD-42-TEST');
      expect(adaptee.statut).toBe('PREPARATION');
      expect(adaptee.codeLivraison).toEqual([4, 8, 2, 1]);
      expect(adaptee.montantTotalFcfa).toBe(9500);
      expect(adaptee.articles.length).toBe(2);
      expect(adaptee.estEnCours).toBe(true);
    });
    // Le format et la valeur du PIN sont contrôlés par le serveur (voir livraisons/tests côté Django).
  });

  describe('F. Contrôle des accès par AuthGuards (Lot 2)', () => {
    it('doit bloquer l accès superadmin aux non-administrateurs', () => {
      simulerUtilisateur('CLIENT');
      const routeMock: any = {};
      const stateMock: any = { url: '/administration/tableau-de-bord' };

      const res = TestBed.runInInjectionContext(() => gardeAdministration(routeMock, stateMock));
      expect(res).not.toBe(true);
    });

    it('doit autoriser l accès superadmin à un administrateur', () => {
      simulerUtilisateur('ADMINISTRATEUR');
      const routeMock: any = {};
      const stateMock: any = { url: '/administration/tableau-de-bord' };

      const res = TestBed.runInInjectionContext(() => gardeAdministration(routeMock, stateMock));
      expect(res).toBe(true);
    });

    it('doit autoriser l accès gérant à un restaurant', () => {
      simulerUtilisateur('RESTAURANT');
      const routeMock: any = {};
      const stateMock: any = { url: '/gerant/commandes' };

      const res = TestBed.runInInjectionContext(() => gardeGerant(routeMock, stateMock));
      expect(res).toBe(true);
    });
  });

  describe('G. Fiabilité Session & Rafraîchissement automatique des tokens', () => {
    it('doit récupérer les jetons d accès et rafraîchissement depuis le stockage', () => {
      localStorage.setItem('ayyou_jeton_acces', 'mon-token-acces');
      localStorage.setItem('ayyou_jeton_rafraichissement', 'mon-token-refresh');

      expect(serviceAuth.obtenirJetonAcces()).toBe('mon-token-acces');
      expect(serviceAuth.obtenirJetonRafraichissement()).toBe('mon-token-refresh');
    });

    it('doit déclencher une déconnexion immédiate si aucun jeton de rafraîchissement n est disponible', async () => {
      localStorage.removeItem('ayyou_jeton_rafraichissement');

      try {
        await firstValueFrom(serviceAuth.rafraichirJetonAcces());
        expect.unreachable('Devrait échouer car pas de refresh token');
      } catch (err: any) {
        expect(err.message).toContain('Aucun jeton de rafraîchissement');
        expect(serviceAuth.utilisateurConnecte()).toBeNull();
      }
    });
    // La remise au livreur est désormais confirmée par le serveur : voir la section B.
  });
});
