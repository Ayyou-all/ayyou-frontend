import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServiceAuthentification } from './service-authentification.service';
import { ServiceRestaurantCommandesService } from './service-restaurant-commandes.service';
import { ServiceLivreurService } from './service-livreur.service';
import { ServiceCommandesService } from './service-commandes.service';
import { ServicePanierService } from './service-panier.service';
import { ServiceOrchestrateurCommandesService } from './service-orchestrateur-commandes.service';
import {
  gardeAdministration,
  gardeGerant,
  gardeLivreur
} from '../gardes/authentification.guard';
import { TableauDeBordComponent } from '../../fonctionnalites/administration/tableau-de-bord/tableau-de-bord.component';

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
        ServiceOrchestrateurCommandesService,
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

  describe('A. Rôles et isolation', () => {
    it('devrait détecter correctement le rôle Gérant', async () => {
      await firstValueFrom(serviceAuth.connecterAvecRolePredefini('RESTAURANT'));
      expect(serviceAuth.estGerant()).toBe(true);
      expect(serviceAuth.estClient()).toBe(false);
      expect(serviceAuth.estLivreur()).toBe(false);
      expect(serviceAuth.estAdministrateur()).toBe(false);
    });

    it('devrait détecter correctement le rôle Client', async () => {
      await firstValueFrom(serviceAuth.connecterAvecRolePredefini('CLIENT'));
      expect(serviceAuth.estClient()).toBe(true);
      expect(serviceAuth.estGerant()).toBe(false);
      expect(serviceAuth.estAdministrateur()).toBe(false);
    });
  });

  describe('B. Cycle de vie des commandes — Remise au livreur', () => {
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
      const carteCA = comp.listeIndicateurs.find((i) => i.titre === "Chiffre d'affaires");
      expect(carteCA).toBeDefined();
      expect(carteCA?.valeur).toContain('FCFA');
      expect(carteCA?.valeur).not.toContain('€');
    });
  });

  describe('E. Orchestration centralisée de commande (Lot 1 & Lot 2)', () => {
    it('doit propager une commande panier vers le client, le restaurant et le livreur avec code PIN synchronisé', () => {
      const orchestrateur = TestBed.inject(ServiceOrchestrateurCommandesService);
      const serviceCommandes = TestBed.inject(ServiceCommandesService);

      const panierMock: any = {
        identifiantRestaurant: 'resto-le-teranga',
        nomRestaurant: 'Le Teranga',
        adresseLogoRestaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
        delaiLivraison: '25-35 min',
        adresseLivraison: 'Plateau, Rue Carnot',
        methodePaiement: 'WAVE',
        lignes: [
          {
            plat: {
              identifiant: 'plat-thieb-royal',
              identifiantRestaurant: 'resto-le-teranga',
              nomRestaurant: 'Le Teranga',
              nom: 'Thieboudienne Royal',
              description: 'Riz rouge traditionnel au poisson',
              prixFcfa: 3500,
              adresseImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
              categorie: 'Plats',
              statut: 'DISPONIBLE'
            },
            quantite: 2
          }
        ],
        sousTotalFcfa: 7000,
        fraisLivraisonFcfa: 1000,
        totalFcfa: 8000
      };

      const commandeCreee = orchestrateur.creerCommandeDepuisPanier(panierMock, 'Sans piment svp');

      // 1. Client
      expect(commandeCreee).toBeDefined();
      expect(commandeCreee.identifiant).toContain('ORD-');
      const trouvee = serviceCommandes.trouverCommandeParId(commandeCreee.identifiant);
      expect(trouvee).toBeDefined();

      // 2. Restaurant Kanban
      const numeroKanban = `#${commandeCreee.identifiant.replace('ORD-', '')}`;
      const cmdKanban = serviceRestaurant.commandesKanban().find((c) => c.numero === numeroKanban);
      expect(cmdKanban).toBeDefined();
      expect(cmdKanban?.statut).toBe('NOUVELLES');
      expect(cmdKanban?.remarqueClient).toBe('Sans piment svp');

      // 3. Livreur code PIN synchronisé
      const courseLivreur = serviceLivreur.courseEnCours();
      expect(courseLivreur).toBeDefined();
      const codePinClient = commandeCreee.codeLivraison.join('');
      expect(courseLivreur?.codeValidation).toBe(codePinClient);
    });
  });

  describe('F. Contrôle des accès par AuthGuards (Lot 2)', () => {
    it('doit bloquer l accès superadmin aux non-administrateurs', async () => {
      await firstValueFrom(serviceAuth.connecterAvecRolePredefini('CLIENT'));
      const routeMock: any = {};
      const stateMock: any = { url: '/administration/tableau-de-bord' };

      const res = TestBed.runInInjectionContext(() => gardeAdministration(routeMock, stateMock));
      expect(res).not.toBe(true);
    });

    it('doit autoriser l accès superadmin à un administrateur', async () => {
      await firstValueFrom(serviceAuth.connecterAvecRolePredefini('ADMINISTRATEUR'));
      const routeMock: any = {};
      const stateMock: any = { url: '/administration/tableau-de-bord' };

      const res = TestBed.runInInjectionContext(() => gardeAdministration(routeMock, stateMock));
      expect(res).toBe(true);
    });

    it('doit autoriser l accès gérant à un restaurant', async () => {
      await firstValueFrom(serviceAuth.connecterAvecRolePredefini('RESTAURANT'));
      const routeMock: any = {};
      const stateMock: any = { url: '/gerant/commandes' };

      const res = TestBed.runInInjectionContext(() => gardeGerant(routeMock, stateMock));
      expect(res).toBe(true);
    });
  });
});
