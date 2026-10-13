import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MethodePaiement, PanierRestaurant } from '../../../socle/modeles/panier.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServiceOrchestrateurCommandesService } from '../../../socle/services/service-orchestrateur-commandes.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

@Component({
  selector: 'app-detail-panier',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './detail-panier.component.html'
})
export class DetailPanierComponent {
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly servicePanier = inject(ServicePanierService);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly serviceOrchestrateur = inject(ServiceOrchestrateurCommandesService);

  // Modal de modification de l'adresse de livraison
  readonly modalModifierAdresse = signal<boolean>(false);
  readonly adresseSaisie = signal<string>('Plateau, Avenue Hassan II');

  // Modal de confirmation de commande réussie
  readonly commandeReussie = signal<boolean>(false);
  readonly numeroCommandeSimulee = signal<string>('AYY-8429');
  readonly commandeCreeeId = signal<string | null>(null);

  // Détection des articles en rupture de stock
  readonly aDesArticlesIndisponibles = computed(() => {
    return this.panier().lignes.some((ligne) => ligne.plat.statut === 'INDISPONIBLE');
  });

  @HostListener('document:keydown.escape')
  surEchap(): void {
    this.modalModifierAdresse.set(false);
    this.commandeReussie.set(false);
  }

  // Identifiant du restaurant sélectionné dans l'URL
  readonly identifiantRestaurant = computed(() => {
    return this.route.snapshot.paramMap.get('idRestaurant') || 'resto-chez-fatou';
  });

  // Panier actif pour ce restaurant
  readonly panier = computed<PanierRestaurant>(() => {
    const id = this.identifiantRestaurant();
    const trouve = this.servicePanier.trouverPanierRestaurant(id);
    if (trouve) {
      return trouve;
    }
    // Fallback vers le premier panier disponible
    return (
      this.servicePanier.listePaniersRestaurants()[0] ?? {
        identifiantRestaurant: 'resto-chez-fatou',
        nomRestaurant: 'Chez Fatou',
        adresseLogoRestaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
        delaiLivraison: '25-35 min',
        adresseLivraison: 'Plateau, Avenue Hassan II',
        methodePaiement: 'WAVE',
        lignes: [],
        sousTotalFcfa: 0,
        fraisLivraisonFcfa: 1000,
        totalFcfa: 0
      }
    );
  });

  // Note saisie pour le restaurant
  readonly noteAuRestaurant = signal<string>('');

  /**
   * Incrémente la quantité d'un article.
   */
  augmenterQuantite(identifiantPlat: string): void {
    this.servicePanier.modifierQuantiteArticle(this.identifiantRestaurant(), identifiantPlat, 1);
  }

  /**
   * Décrémente la quantité d'un article.
   */
  diminuerQuantite(identifiantPlat: string): void {
    this.servicePanier.modifierQuantiteArticle(this.identifiantRestaurant(), identifiantPlat, -1);
  }

  /**
   * Supprime un article du panier.
   */
  supprimerArticle(identifiantPlat: string): void {
    this.servicePanier.supprimerArticle(this.identifiantRestaurant(), identifiantPlat);
  }

  /**
   * Vide l'ensemble du panier pour ce restaurant.
   */
  viderPanier(): void {
    this.servicePanier.viderPanierRestaurant(this.identifiantRestaurant());
    this.routeur.navigate(['/panier']);
  }

  /**
   * Sélectionne la méthode de paiement (Wave ou Orange Money).
   */
  choisirMethodePaiement(methode: MethodePaiement): void {
    this.servicePanier.definirMethodePaiement(this.identifiantRestaurant(), methode);
  }

  /**
   * Ouvre le modal pour changer l'adresse de livraison.
   */
  ouvrirModifierAdresse(): void {
    this.modalModifierAdresse.set(true);
  }

  /**
   * Enregistre la nouvelle adresse de livraison.
   */
  sauvegarderAdresse(): void {
    const panierActuel = this.panier();
    panierActuel.adresseLivraison = this.adresseSaisie();
    this.modalModifierAdresse.set(false);
  }

  /**
   * Navigue directement vers le profil du restaurant d'où provient ce panier.
   */
  allerVersProfilRestaurant(): void {
    this.routeur.navigate(['/restaurant', this.identifiantRestaurant()]);
  }

  /**
   * Redirige vers le profil du restaurant pour ajouter d'autres plats de sa carte.
   */
  ajouterAutresPlats(): void {
    this.allerVersProfilRestaurant();
  }

  /**
   * Effectue le paiement de la commande.
   * En mode visiteur, exige la connexion.
   */
  effectuerPaiement(): void {
    if (!this.serviceAuthentification.estAuthentifie()) {
      this.serviceAuthentification.exigerAuthentification(
        'COMMANDE',
        () => this.effectuerPaiement(),
        {
          titre: 'Payer votre commande',
          description:
            'Connectez-vous pour finaliser votre commande, enregistrer votre adresse de livraison et suivre votre livreur.'
        }
      );
      return;
    }

    // Empêcher le paiement si des articles sont en rupture de stock
    if (this.aDesArticlesIndisponibles()) {
      return;
    }

    // Enregistrement de la note éventuelle
    this.servicePanier.definirNoteRestaurant(this.identifiantRestaurant(), this.noteAuRestaurant());

    // Création orchestrée de la commande réelle (propage vers le restaurant et le coursier)
    const commandeCreee = this.serviceOrchestrateur.creerCommandeDepuisPanier(
      this.panier(),
      this.noteAuRestaurant()
    );

    this.commandeCreeeId.set(commandeCreee.identifiant);
    this.numeroCommandeSimulee.set(commandeCreee.identifiant);
    this.commandeReussie.set(true);
  }

  /**
   * Finalise la commande et redirige vers le suivi de commande GPS en direct.
   */
  allerVersCommandes(): void {
    const idCommande = this.commandeCreeeId() || 'ORD-99238';
    this.commandeReussie.set(false);
    this.routeur.navigate(['/commandes/suivi', idCommande]);
  }

  /**
   * Retourne à la liste de mes paniers.
   */
  retourner(): void {
    this.routeur.navigate(['/panier']);
  }
}
