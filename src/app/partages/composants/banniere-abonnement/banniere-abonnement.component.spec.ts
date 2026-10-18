import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EtatAbonnement, ServiceAbonnement } from '../../../socle/services/service-abonnement.service';
import { BanniereAbonnementComponent } from './banniere-abonnement.component';

describe("Bannière d'abonnement du restaurant", () => {
  let service: ServiceAbonnement;
  let banniere: BanniereAbonnementComponent;

  const etat = (statut: EtatAbonnement['statut'], jours_restants: number): EtatAbonnement => ({
    statut,
    jours_restants,
    date_fin_essai: null,
    date_fin_abonnement: null,
    date_echeance: null,
    prix_fcfa: 15000
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(ServiceAbonnement);
    banniere = TestBed.createComponent(BanniereAbonnementComponent).componentInstance;
  });

  it("affiche les jours d'essai restants, puis « demain »", () => {
    service.etat.set(etat('ESSAI', 12));
    expect(banniere.message()?.texte).toBe("Votre période d'essai se termine dans 12 jours.");
    service.etat.set(etat('ESSAI', 1));
    expect(banniere.message()?.texte).toBe("Votre période d'essai se termine demain.");
  });

  it("n'affiche rien pour un abonnement actif loin de l'échéance, un rappel à 3 jours", () => {
    service.etat.set(etat('ACTIF', 20));
    expect(banniere.message()).toBeNull();
    service.etat.set(etat('ACTIF', 3));
    expect(banniere.message()?.bouton).toBe('Renouveler');
  });

  it('propose de réactiver un restaurant suspendu', () => {
    service.etat.set(etat('SUSPENDU', 0));
    expect(banniere.message()?.suspendu).toBe(true);
    expect(banniere.message()?.bouton).toBe('Réactiver');
  });
});
