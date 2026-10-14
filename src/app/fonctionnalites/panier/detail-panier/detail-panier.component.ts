import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MethodePaiement, PanierRestaurant } from '../../../socle/modeles/panier.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServiceCommandesService } from '../../../socle/services/service-commandes.service';
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
  readonly serviceCommandes = inject(ServiceCommandesService);
  readonly serviceOrchestrateur = inject(ServiceOrchestrateurCommandesService);

  // Traitement en cours et erreurs de paiement
  readonly traitementPaiementEnCours = signal<boolean>(false);
  readonly messageErreurPaiement = signal<string | null>(null);

  // Modal de modification de l'adresse de livraison
  readonly modalModifierAdresse = signal<boolean>(false);
  readonly adresseSaisie = signal<string>('Plateau, Avenue Hassan II');

  // Modal de confirmation de commande réussie
  readonly commandeReussie = signal<boolean>(false);
  readonly numeroCommandeSimulee = signal<string>('');
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

    const p = this.panier();
    if (!p.lignes || p.lignes.length === 0) {
      return;
    }

    this.traitementPaiementEnCours.set(true);
    this.messageErreurPaiement.set(null);

    // Enregistrement de la note éventuelle
    this.servicePanier.definirNoteRestaurant(this.identifiantRestaurant(), this.noteAuRestaurant());

    const restoIdNum = Number(this.identifiantRestaurant()) || Number(p.identifiantRestaurant) || Number(p.lignes[0]?.plat?.identifiantRestaurant) || 1;
    const payload = {
      etablissement_id: restoIdNum,
      adresse_livraison: p.adresseLivraison || this.adresseSaisie() || 'Dakar, Sénégal',
      instructions_livraison: this.noteAuRestaurant() || '',
      mode_paiement: p.methodePaiement || 'WAVE',
      articles: p.lignes.map((l) => ({
        plat_id: Number(l.plat.identifiant),
        quantite: l.quantite,
        instructions_speciales: ''
      }))
    };

    this.serviceCommandes.creerCommande(payload).subscribe({
      next: (commandeCreee: any) => {
        this.traitementPaiementEnCours.set(false);
        const refCommande = commandeCreee.reference || commandeCreee.identifiant || String(commandeCreee.id);
        const commandeId = commandeCreee.id || refCommande;
        this.commandeCreeeId.set(String(commandeId));
        this.numeroCommandeSimulee.set(refCommande);

        // Initialisation du paiement PayTech (Wave / Orange Money)
        this.serviceCommandes.initierPaiementPayTech(commandeCreee.id).subscribe({
          next: (tentative: any) => {
            this.servicePanier.supprimerPanier(this.identifiantRestaurant());
            if (tentative && tentative.url_redirection) {
              // Redirection vers le guichet de paiement PayTech sécurisé
              window.location.href = tentative.url_redirection;
              return;
            }
            this.commandeReussie.set(true);
          },
          error: () => {
            // En cas d'indisponibilité du webhook PayTech, la commande existe et peut être suivie
            this.servicePanier.supprimerPanier(this.identifiantRestaurant());
            this.commandeReussie.set(true);
          }
        });
      },
      error: (err: any) => {
        this.traitementPaiementEnCours.set(false);
        const message =
          err.error?.message ||
          err.error?.detail ||
          err.error?.non_field_errors?.[0] ||
          'Une erreur est survenue lors de la validation de votre commande.';
        this.messageErreurPaiement.set(message);
      }
    });
  }

  /**
   * Finalise la commande et redirige vers le suivi de commande GPS en direct.
   */
  allerVersCommandes(): void {
    const idCommande = this.commandeCreeeId();
    this.commandeReussie.set(false);
    if (idCommande) {
      this.routeur.navigate(['/commandes/suivi', idCommande]);
    } else {
      this.routeur.navigate(['/commandes']);
    }
  }

  /**
   * Retourne à la liste de mes paniers.
   */
  retourner(): void {
    this.routeur.navigate(['/panier']);
  }
}
