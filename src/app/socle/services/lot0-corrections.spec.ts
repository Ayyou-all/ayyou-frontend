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

  describe('B. Cycle de vie des commandes — Remise au livreur', () => {
    beforeEach(() => {
      serviceRestaurant.commandesKanban.set([
        {
          numero: '#1240',
          clientNom: 'Amadou Diallo',
          totalMontant: '12 500 FCFA',
          totalValeurNumerique: 12500,
          typeLivraison: 'LIVRAISON',
          statut: 'PRETES',
          articles: [{ nom: 'Thieboudienne Penda Mbaye', quantite: 2 }]
        },
        {
          numero: '#1239',
          clientNom: 'Fatou Sow',
          totalMontant: '6 000 FCFA',
          totalValeurNumerique: 6000,
          typeLivraison: 'A_EMPORTER',
          statut: 'PRETES',
          articles: [{ nom: 'Yassa Poulet', quantite: 1 }]
        }
      ]);
      serviceRestaurant.historiqueCommandes.set([]);
    });

    it('ne doit PAS marquer une commande de livraison comme LIVRÉE lors de la remise au livreur', () => {
      // #1240 est une commande de type LIVRAISON
      const cmdAvant = serviceRestaurant.commandesKanban().find((c) => c.numero === '#1240');
      expect(cmdAvant).toBeDefined();
      expect(cmdAvant?.typeLivraison).toBe('LIVRAISON');

      serviceRestaurant.remettreAuLivreur('#1240');

      // Doit quitter le Kanban
      const cmdKanbanApres = serviceRestaurant.commandesKanban().find((c) => c.numero === '#1240');
      expect(cmdKanbanApres).toBeUndefined();

      // Doit être dans l'historique avec le statut EN_COURS (acheminement en cours)
      const cmdHist = serviceRestaurant.historiqueCommandes().find((c) => c.numero === '#1240');
      expect(cmdHist).toBeDefined();
      expect(cmdHist?.statut).toBe('EN_COURS');
    });

    it('doit marquer une commande emportée directement comme LIVRÉE lors de la remise client', () => {
      // #1239 est une commande A_EMPORTER
      serviceRestaurant.remettreAuLivreur('#1239');
      const cmdHist = serviceRestaurant.historiqueCommandes().find((c) => c.numero === '#1239');
      expect(cmdHist).toBeDefined();
      expect(cmdHist?.statut).toBe('LIVRÉE');
    });

    it('doit basculer une commande en cours de livraison à LIVRÉE après validation coursier', () => {
      serviceRestaurant.remettreAuLivreur('#1240');
      serviceRestaurant.marquerCommandeLivreeParLivreur('1240');

      const cmdHist = serviceRestaurant.historiqueCommandes().find((c) => c.numero === '#1240');
      expect(cmdHist?.statut).toBe('LIVRÉE');
    });
  });

  describe('C. Validation du code PIN de sécurité', () => {
    beforeEach(() => {
      serviceLivreur.courseEnCours.set({
        identifiantCommande: '1240',
        restaurantNom: 'Le Teranga',
        restaurantAdresse: 'Plateau',
        restaurantTelephone: '+221 33 800 00 00',
        comptoirRetrait: 'Guichet 1',
        clientNom: 'Client Test',
        clientTelephone: '+221 77 000 00 00',
        clientAdresse: 'Almadies',
        clientInstructions: 'Appeler à l entrée',
        distanceKm: 3.2,
        gainFcfa: 1500,
        tempsRestantSec: 300,
        tempsTrajetMin: 12,
        codeValidation: '8245',
        articles: []
      });
      serviceLivreur.etapeCourse.set('VALIDATION_CODE');
    });
    it('doit refuser un code incomplet ou de mauvaise longueur', () => {
      const res = serviceLivreur.verifierCodeValidation('12');
      expect(res.valide).toBe(false);
      expect(res.message).toContain('4 chiffres');
    });

    it('doit refuser des caractères non numériques', () => {
      const res = serviceLivreur.verifierCodeValidation('abcd');
      expect(res.valide).toBe(false);
    });

    it('doit refuser un code incorrect par rapport à la commande', () => {
      // Le code de la commande mockée active est '8245'
      const res = serviceLivreur.verifierCodeValidation('0000');
      expect(res.valide).toBe(false);
      expect(res.message).toContain('Code de sécurité incorrect');
      expect(serviceLivreur.etapeCourse()).not.toBe('LIVRE');
    });

    it('doit valider le code exact de la commande active', () => {
      const res = serviceLivreur.verifierCodeValidation('8245');
      expect(res.valide).toBe(true);
    });

    it('doit bloquer les validations multiples si la course est déjà clôturée', () => {
      serviceLivreur.terminerCourse();
      expect(serviceLivreur.etapeCourse()).toBe('LIVRE');

      const res = serviceLivreur.verifierCodeValidation('8245');
      expect(res.valide).toBe(false);
      expect(res.message).toContain('déjà été validée');
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

    it('doit rejeter de manière asynchrone un code PIN mal formé ou hors chiffres', async () => {
      const serviceLivreurTest = TestBed.inject(ServiceLivreurService);
      serviceLivreurTest.courseEnCours.set({
        identifiantCommande: '42',
        restaurantNom: 'Le Teranga',
        restaurantAdresse: 'Plateau',
        restaurantTelephone: '+221 33 000 00 00',
        comptoirRetrait: 'Comptoir 1',
        clientNom: 'Moussa',
        clientTelephone: '+221 77 000 00 00',
        clientAdresse: 'Almadies',
        distanceKm: 2,
        gainFcfa: 1500,
        tempsRestantSec: 30,
        tempsTrajetMin: 10,
        articles: []
      });
      serviceLivreurTest.etapeCourse.set('VALIDATION_CODE');

      const resCourt = await firstValueFrom(serviceLivreurTest.validerCodeAsync('12'));
      expect(resCourt.valide).toBe(false);

      const resAlpha = await firstValueFrom(serviceLivreurTest.validerCodeAsync('abcd'));
      expect(resAlpha.valide).toBe(false);
      expect(resAlpha.message).toContain('chiffres');
    });
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

    it('doit empêcher une commande remise au livreur de réapparaître dans le Kanban', () => {
      serviceRestaurant.commandesKanban.set([
        {
          idInterne: 101,
          numero: '#CMD-101',
          clientNom: 'Fatou',
          totalMontant: '5 000 FCFA',
          totalValeurNumerique: 5000,
          typeLivraison: 'LIVRAISON',
          statut: 'PRETES',
          articles: [{ nom: 'Thiéboudienne', quantite: 1 }]
        }
      ]);

      expect(serviceRestaurant.commandesPretes().length).toBe(1);

      // Le gérant remet le colis au coursier
      serviceRestaurant.remettreAuLivreur('#CMD-101');

      expect(serviceRestaurant.commandesPretes().length).toBe(0);
      expect(serviceRestaurant.historiqueCommandes().length).toBe(1);
      expect(serviceRestaurant.historiqueCommandes()[0].numero).toBe('#CMD-101');
      expect(serviceRestaurant.historiqueCommandes()[0].statut).toBe('EN_COURS');
    });
  });
});
