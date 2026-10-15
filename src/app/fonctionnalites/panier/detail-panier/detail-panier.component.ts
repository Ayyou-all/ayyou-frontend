import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LignePanier, MethodePaiement, PanierRestaurant } from '../../../socle/modeles/panier.modele';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServiceCommandesService } from '../../../socle/services/service-commandes.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

@Component({
  selector: 'app-detail-panier',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './detail-panier.component.html'
})
export class DetailPanierComponent implements OnInit {
  readonly route = inject(ActivatedRoute);
  readonly routeur = inject(Router);
  readonly servicePanier = inject(ServicePanierService);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly serviceCommandes = inject(ServiceCommandesService);

  // Traitement en cours et erreurs de paiement
  readonly traitementPaiementEnCours = signal<boolean>(false);
  readonly messageErreurPaiement = signal<string | null>(null);

  // Position GPS réelle du client (aucun mock)
  readonly latitudeClient = signal<number | null>(null);
  readonly longitudeClient = signal<number | null>(null);
  readonly localisationEnCours = signal<boolean>(false);
  readonly erreurLocalisation = signal<string | null>(null);

  // Modal de modification de l'adresse de livraison
  readonly modalModifierAdresse = signal<boolean>(false);
  readonly adresseSaisie = signal<string>('Position en attente de détection...');

  // Modal de confirmation de commande réussie
  readonly commandeReussie = signal<boolean>(false);
  readonly referenceCommandeCreee = signal<string>('');
  readonly commandeCreeeId = signal<string | null>(null);

  ngOnInit(): void {
    this.detecterPositionReelle();
  }

  /**
   * Récupère la position GPS réelle du client via le navigateur.
   */
  detecterPositionReelle(): void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.erreurLocalisation.set('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    this.localisationEnCours.set(true);
    this.erreurLocalisation.set(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.latitudeClient.set(lat);
        this.longitudeClient.set(lng);

        // Géocodage inverse réel via OpenStreetMap
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then((r) => r.json())
          .then((data) => {
            const nomRue = data.address?.road || data.address?.pedestrian || '';
            const quartier = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district || '';
            const ville = data.address?.city || data.address?.town || data.address?.state || 'Dakar';
            const texte = [nomRue, quartier, ville].filter(Boolean).join(', ') || `GPS : ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

            this.adresseSaisie.set(texte);
            const p = this.panier();
            if (p) p.adresseLivraison = texte;
            this.localisationEnCours.set(false);
          })
          .catch(() => {
            const texte = `GPS : ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            this.adresseSaisie.set(texte);
            const p = this.panier();
            if (p) p.adresseLivraison = texte;
            this.localisationEnCours.set(false);
          });
      },
      (err) => {
        this.localisationEnCours.set(false);
        this.erreurLocalisation.set('Accès GPS refusé ou indisponible. Vous pouvez saisir votre adresse manuellement.');
        if (this.adresseSaisie() === 'Position en attente de détection...') {
          this.adresseSaisie.set('Dakar, Sénégal');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

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
    return this.route.snapshot.paramMap.get('idRestaurant') || '';
  });

  // Panier actif pour ce restaurant
  readonly panier = computed<PanierRestaurant>(() => {
    const id = this.identifiantRestaurant();
    if (id) {
      const trouve = this.servicePanier.trouverPanierRestaurant(id);
      if (trouve) {
        return trouve;
      }
      const resto = this.serviceCatalogue.trouverRestaurant(id);
      if (resto) {
        return {
          identifiantRestaurant: resto.identifiant,
          nomRestaurant: resto.nom,
          adresseLogoRestaurant: resto.adresseLogo,
          delaiLivraison: `${resto.delaiLivraisonMinutes || 30} min`,
          adresseLivraison: this.adresseSaisie(),
          methodePaiement: 'WAVE',
          lignes: [] as LignePanier[],
          sousTotalFcfa: 0,
          fraisLivraisonFcfa: resto.fraisLivraisonFcfa ?? 1000,
          totalFcfa: 0
        };
      }
    }
    // Fallback vers le premier panier actif s'il existe
    const premierPanier = this.servicePanier.listePaniersRestaurants()[0];
    if (premierPanier) {
      return premierPanier;
    }
    // Sinon premier restaurant réel du catalogue
    const premierResto = this.serviceCatalogue.restaurants()[0];
    return {
      identifiantRestaurant: premierResto?.identifiant || '',
      nomRestaurant: premierResto?.nom || 'Restaurant',
      adresseLogoRestaurant: premierResto?.adresseLogo || '',
      delaiLivraison: premierResto ? `${premierResto.delaiLivraisonMinutes || 30} min` : '25-35 min',
      adresseLivraison: this.adresseSaisie(),
      methodePaiement: 'WAVE',
      lignes: [] as LignePanier[],
      sousTotalFcfa: 0,
      fraisLivraisonFcfa: premierResto?.fraisLivraisonFcfa ?? 1000,
      totalFcfa: 0
    };
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

    const rawRestoId = this.identifiantRestaurant() || p.identifiantRestaurant || p.lignes[0]?.plat?.identifiantRestaurant;
    const restoIdNum = rawRestoId ? parseInt(String(rawRestoId).replace(/\D/g, ''), 10) : NaN;

    if (!restoIdNum || isNaN(restoIdNum)) {
      this.traitementPaiementEnCours.set(false);
      this.messageErreurPaiement.set('Impossible de déterminer le restaurant associé à ce panier.');
      return;
    }

    const articlesValides = p.lignes
      .filter((l) => l.plat)
      .map((l) => {
        const rawId = String(l.plat.identifiant || '').replace(/\D/g, '');
        const platId = rawId ? parseInt(rawId, 10) : NaN;
        return {
          plat_id: platId,
          quantite: Math.max(1, l.quantite || 1),
          instructions_speciales: l.instructionsSpeciales || ''
        };
      });

    if (articlesValides.length === 0 || articlesValides.some((a) => !a.plat_id || isNaN(a.plat_id))) {
      this.traitementPaiementEnCours.set(false);
      this.messageErreurPaiement.set('Certains articles du panier ont un identifiant invalide. Veuillez rafraîchir le panier.');
      return;
    }

    const lat = this.latitudeClient();
    const lng = this.longitudeClient();

    const payload = {
      etablissement_id: restoIdNum,
      adresse_livraison: p.adresseLivraison || this.adresseSaisie() || 'Dakar, Sénégal',
      latitude_livraison: lat !== null && !isNaN(lat) ? Number(lat.toFixed(6)) : null,
      longitude_livraison: lng !== null && !isNaN(lng) ? Number(lng.toFixed(6)) : null,
      instructions_livraison: this.noteAuRestaurant() || '',
      mode_paiement: p.methodePaiement || 'WAVE',
      articles: articlesValides
    };

    this.serviceCommandes.creerCommande(payload).subscribe({
      next: (commandeCreee: any) => {
        this.traitementPaiementEnCours.set(false);
        const refCommande = commandeCreee.reference || commandeCreee.identifiant || String(commandeCreee.id);
        const commandeId = commandeCreee.id || refCommande;
        this.commandeCreeeId.set(String(commandeId));
        this.referenceCommandeCreee.set(refCommande);

        // Initialisation du paiement PayTech (Wave / Orange Money)
        this.serviceCommandes.initierPaiementPayTech(commandeCreee.id).subscribe({
          next: (tentative: any) => {
            this.servicePanier.supprimerPanier(this.identifiantRestaurant());
            if (tentative && tentative.url_redirection) {
              // Redirection réelle vers le guichet de paiement PayTech (Wave / Orange Money)
              window.location.href = tentative.url_redirection;
              return;
            }
            this.traitementPaiementEnCours.set(false);
            this.commandeReussie.set(true);
          },
          error: (errPayTech: any) => {
            this.traitementPaiementEnCours.set(false);
            const msg =
              errPayTech?.error?.message ||
              errPayTech?.error?.detail ||
              'Échec de l\'initialisation du paiement PayTech. Veuillez vérifier votre connexion.';
            this.messageErreurPaiement.set(msg);
          }
        });
      },
      error: (err: any) => {
        this.traitementPaiementEnCours.set(false);
        let message =
          err.error?.message ||
          err.error?.detail ||
          err.error?.non_field_errors?.[0];

        if (!message && err.error && typeof err.error === 'object') {
          for (const cle of Object.keys(err.error)) {
            const val = err.error[cle];
            if (Array.isArray(val) && val.length > 0) {
              message = `${cle}: ${val[0]}`;
              break;
            } else if (typeof val === 'string') {
              message = `${cle}: ${val}`;
              break;
            }
          }
        }

        if (!message) {
          message = 'Une erreur est survenue lors de la validation de votre commande.';
        }
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
