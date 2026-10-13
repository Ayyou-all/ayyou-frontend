import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type ColonneKanbanGerant = 'NOUVELLES' | 'PREPARATION' | 'PRETES';

export interface ArticleCommandeGerant {
  nom: string;
  quantite: number;
}

export interface CommandeKanban {
  numero: string; // ex: '#1245'
  tempsEcouleOuRestant: string; // ex: 'Il y a 2 min', '12:45'
  estTempsRestant?: boolean;
  totalMontant: string;
  totalValeurNumerique: number;
  typeLivraison: 'LIVRAISON' | 'SUR_PLACE' | 'A_EMPORTER';
  statut: ColonneKanbanGerant;
  articles: ArticleCommandeGerant[];
  remarqueClient?: string;
  coursierNom?: string;
  coursierVehicule?: string;
  coursierPhoto?: string;
  coursierArriveeMinutes?: number;
  coursierTelephone?: string;
  bordureActive?: boolean;
}

@Component({
  selector: 'app-gerant-commandes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gerant-commandes.component.html'
})
export class GerantCommandesComponent {
  // Onglet sélectionné sur mobile (Nouvelles, En préparation, Prêtes)
  readonly ongletMobileActif = signal<ColonneKanbanGerant>('NOUVELLES');

  // Modale de détail d'une commande
  readonly commandeEnDetail = signal<CommandeKanban | null>(null);
  readonly modaleDetailOuverte = signal<boolean>(false);

  // Modale de refus
  readonly commandeARefuser = signal<CommandeKanban | null>(null);
  readonly modaleRefusOuverte = signal<boolean>(false);
  readonly motifRefus = signal<string>('Rupture d’ingrédients pour ce plat');

  // État de l'alerte nouvelle commande entrante (conforme à l'image envoyée)
  readonly alerteVisible = signal<boolean>(true);
  readonly alerteCommande = signal<{
    numero: string;
    titre: string;
    sousTitre: string;
    typeLivraison: string;
    tempsPrep: string;
  }>({
    numero: '#1246',
    titre: 'NOUVELLE COMMANDE !',
    sousTitre: "VIENT D'ARRIVER",
    typeLivraison: 'LIVRAISON RAPIDE',
    tempsPrep: 'PRÉP: 15M'
  });

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  // Liste des commandes en temps réel (conformes à l'Image 1)
  readonly listeCommandes = signal<CommandeKanban[]>([
    // Colonne 1 : Nouvelles
    {
      numero: '#1245',
      tempsEcouleOuRestant: 'Il y a 2 min',
      totalMontant: '8 500 FCFA',
      totalValeurNumerique: 8500,
      typeLivraison: 'LIVRAISON',
      statut: 'NOUVELLES',
      articles: [
        { nom: 'Thieboudienne', quantite: 2 },
        { nom: 'Bissap (50cl)', quantite: 1 }
      ],
      remarqueClient: 'Pas de piment svp'
    },
    {
      numero: '#1246',
      tempsEcouleOuRestant: 'Il y a 5 min',
      totalMontant: '4 200 FCFA',
      totalValeurNumerique: 4200,
      typeLivraison: 'LIVRAISON',
      statut: 'NOUVELLES',
      articles: [
        { nom: 'Mafe Poulet', quantite: 1 }
      ]
    },
    {
      numero: '#1247',
      tempsEcouleOuRestant: 'Il y a 7 min',
      totalMontant: '6 000 FCFA',
      totalValeurNumerique: 6000,
      typeLivraison: 'A_EMPORTER',
      statut: 'NOUVELLES',
      articles: [
        { nom: 'Dibi d’Agneau Braisé', quantite: 1 },
        { nom: 'Jus de Bouye', quantite: 1 }
      ]
    },

    // Colonne 2 : En préparation
    {
      numero: '#1242',
      tempsEcouleOuRestant: '12:45',
      estTempsRestant: true,
      totalMontant: '5 800 FCFA',
      totalValeurNumerique: 5800,
      typeLivraison: 'LIVRAISON',
      statut: 'PREPARATION',
      bordureActive: true,
      articles: [
        { nom: 'Yassa Poulet (Premium)', quantite: 1 }
      ]
    },
    {
      numero: '#1241',
      tempsEcouleOuRestant: '08:20 restant',
      estTempsRestant: true,
      totalMontant: '9 200 FCFA',
      totalValeurNumerique: 9200,
      typeLivraison: 'LIVRAISON',
      statut: 'PREPARATION',
      articles: [
        { nom: 'Pastels Viande (Portion de 10)', quantite: 2 },
        { nom: 'Bissap Menthe', quantite: 2 }
      ]
    },
    {
      numero: '#1243',
      tempsEcouleOuRestant: '14:10 restant',
      estTempsRestant: true,
      totalMontant: '11 000 FCFA',
      totalValeurNumerique: 11000,
      typeLivraison: 'SUR_PLACE',
      statut: 'PREPARATION',
      articles: [
        { nom: 'Couscous de Mil Sénégalais (Thiéré)', quantite: 2 }
      ]
    },

    // Colonne 3 : Prêtes
    {
      numero: '#1240',
      tempsEcouleOuRestant: 'Prête',
      totalMontant: '12 400 FCFA',
      totalValeurNumerique: 12400,
      typeLivraison: 'LIVRAISON',
      statut: 'PRETES',
      coursierNom: 'Moussa S.',
      coursierVehicule: 'Moto • Dakar Plateau',
      coursierPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      coursierArriveeMinutes: 3,
      coursierTelephone: '+221 77 123 45 67',
      articles: [
        { nom: 'Thieboudienne Penda Mbaye', quantite: 2 },
        { nom: 'Alloco Banane Plantain', quantite: 1 },
        { nom: 'Cocktail de Fruits Frais', quantite: 2 }
      ]
    },
    {
      numero: '#1239',
      tempsEcouleOuRestant: 'En attente',
      totalMontant: '3 500 FCFA',
      totalValeurNumerique: 3500,
      typeLivraison: 'A_EMPORTER',
      statut: 'PRETES',
      coursierNom: 'Client au comptoir',
      coursierTelephone: '+221 77 987 65 43',
      articles: [
        { nom: 'Burger Sénégalais Braisé', quantite: 1 }
      ]
    }
  ]);

  // Commandes regroupées par statut
  readonly commandesNouvelles = computed(() =>
    this.listeCommandes().filter((c) => c.statut === 'NOUVELLES')
  );

  readonly commandesPreparation = computed(() =>
    this.listeCommandes().filter((c) => c.statut === 'PREPARATION')
  );

  readonly commandesPretes = computed(() =>
    this.listeCommandes().filter((c) => c.statut === 'PRETES')
  );

  /**
   * Accepte une nouvelle commande (passe en préparation).
   */
  accepterCommande(numero: string): void {
    this.listeCommandes.update((liste) =>
      liste.map((c) =>
        c.numero === numero
          ? {
              ...c,
              statut: 'PREPARATION' as const,
              tempsEcouleOuRestant: '15:00 restant',
              estTempsRestant: true
            }
          : c
      )
    );

    this.notificationSucces.set(`Commande ${numero} acceptée ! Préparation lancée en cuisine.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale pour refuser une commande.
   */
  ouvrirRefus(commande: CommandeKanban): void {
    this.commandeARefuser.set(commande);
    this.modaleRefusOuverte.set(true);
  }

  /**
   * Confirme le refus de la commande.
   */
  confirmerRefus(): void {
    const cmd = this.commandeARefuser();
    if (!cmd) return;

    this.listeCommandes.update((liste) => liste.filter((c) => c.numero !== cmd.numero));
    this.notificationSucces.set(`Commande ${cmd.numero} refusée (${this.motifRefus()}).`);
    this.modaleRefusOuverte.set(false);
    this.commandeARefuser.set(null);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Marque la commande comme prête.
   */
  marquerCommePrete(numero: string): void {
    this.listeCommandes.update((liste) =>
      liste.map((c) =>
        c.numero === numero
          ? {
              ...c,
              statut: 'PRETES' as const,
              bordureActive: false,
              coursierNom: c.coursierNom || 'Moussa S.',
              coursierVehicule: c.coursierVehicule || 'Moto • Dakar Plateau',
              coursierPhoto: c.coursierPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              coursierArriveeMinutes: 3,
              tempsEcouleOuRestant: 'Prête'
            }
          : c
      )
    );

    this.notificationSucces.set(`Commande ${numero} prête ! Le coursier a été notifié pour le retrait.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Valide la remise du colis au livreur.
   */
  remettreAuLivreur(numero: string): void {
    this.listeCommandes.update((liste) => liste.filter((c) => c.numero !== numero));
    this.notificationSucces.set(`Commande ${numero} remise au livreur. En route chez le client !`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale de détail d'une commande.
   */
  ouvrirDetail(commande: CommandeKanban): void {
    this.commandeEnDetail.set(commande);
    this.modaleDetailOuverte.set(true);
  }

  /**
   * Ferme la modale de détail.
   */
  fermerDetail(): void {
    this.modaleDetailOuverte.set(false);
    this.commandeEnDetail.set(null);
  }

  /**
   * Ouvre la commande affichée dans l'alerte rouge (#1246).
   */
  voirCommandeAlerte(): void {
    const cmd = this.listeCommandes().find((c) => c.numero === this.alerteCommande().numero);
    if (cmd) {
      this.ouvrirDetail(cmd);
    }
  }

  /**
   * Ferme l'alerte rouge.
   */
  fermerAlerte(): void {
    this.alerteVisible.set(false);
  }

  /**
   * Simule l'arrivée d'une nouvelle commande avec le son officiel de cloche.
   */
  simulerArriveeCommande(): void {
    this.alerteVisible.set(true);
    this.jouerSonNouvelleCommande();
    this.notificationSucces.set('🔔 Nouvelle commande #1246 reçue en cuisine !');
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Joue le carillon sonore synthétisé de notification de commande.
   */
  jouerSonNouvelleCommande(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // Audio bloqué ou non disponible
    }
  }
}
