import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { BanniereAbonnementComponent } from '../../composants/banniere-abonnement/banniere-abonnement.component';
import { ServiceAuthentification } from '../../../socle/services/service-authentification.service';
import {
  NotificationGerant,
  ServiceRestaurantCommandesService
} from '../../../socle/services/service-restaurant-commandes.service';

export interface ElementMenuGerant {
  code: string;
  libelle: string;
  libelleMobile: string;
  icone: string;
  chemin: string;
  badge?: () => number;
  /** Absent de la barre du bas sur mobile (déjà 6 entrées) : accessible via la bannière et le profil. */
  masquerMobile?: boolean;
}

@Component({
  selector: 'app-mise-en-page-gerant',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BanniereAbonnementComponent],
  templateUrl: './mise-en-page-gerant.component.html'
})
export class MiseEnPageGerantComponent implements OnInit {
  readonly routeur = inject(Router);
  readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);
  private readonly http = inject(HttpClient);
  private readonly serviceAuth = inject(ServiceAuthentification);

  // Informations réelles de l'établissement du gérant
  readonly nomRestaurant = signal<string>('Mon Restaurant');
  readonly nomGerant = signal<string>('Gérant');
  readonly logoRestaurant = signal<string | null>(null);
  readonly couvertureRestaurant = signal<string | null>(null);
  readonly statutValidation = signal<string>('EN_ATTENTE_VALIDATION');

  // État du tiroir mobile (conservé pour rétrocompatibilité)
  readonly menuMobileOuvert = signal<boolean>(false);

  // État d'affichage du panneau déroulant de notifications
  readonly panneauNotificationsOuvert = signal<boolean>(false);

  // Statut d'ouverture du restaurant (OUVERT / FERMÉ)
  readonly estOuvert = signal<boolean>(true);

  ngOnInit(): void {
    const user = this.serviceAuth.utilisateurConnecte();
    if (user) {
      if (user.nomEtablissement) {
        this.nomRestaurant.set(user.nomEtablissement);
      }
      const prenomNom = `${user.prenom || ''} ${user.nom || ''}`.trim();
      this.nomGerant.set(prenomNom || 'Gérant');
    }

    this.http.get<any>(`${environment.apiUrl}/etablissements/mon-etablissement/`).subscribe({
      next: (etab) => {
        if (etab?.nom) {
          this.nomRestaurant.set(etab.nom);
        }
        if (etab?.adresse_logo) {
          this.logoRestaurant.set(etab.adresse_logo);
        }
        if (etab?.adresse_couverture) {
          this.couvertureRestaurant.set(etab.adresse_couverture);
        }
        if (etab?.est_ouvert !== undefined) {
          this.estOuvert.set(!!etab.est_ouvert);
        }
        if (etab?.statut_validation) {
          this.statutValidation.set(etab.statut_validation);
        }
      },
      error: () => {
        // Fallback avec les données en cache session
      }
    });
  }

  // Alerte sonore activée ou coupée
  readonly sonActive = signal<boolean>(true);

  // Nombre de commandes du jour (dynamique en temps réel)
  readonly totalCommandesJour = computed(() => this.serviceRestaurant.totalCommandesJour());

  // Notifications du gérant
  readonly notifications = computed(() => this.serviceRestaurant.notifications());
  readonly nombreNotificationsNonLues = computed(() =>
    this.serviceRestaurant.nombreNotificationsNonLues()
  );

  // Nombre de nouvelles commandes en attente d'acceptation
  readonly nombreCommandesNouvelles = computed(() => {
    return this.serviceRestaurant.commandesKanban().filter((c) => c.statut === 'NOUVELLES').length;
  });

  // Notification toast
  readonly notificationSucces = signal<string | null>(null);

  // Liste des menus du parcours Gérant Restaurant
  readonly listeMenu: ElementMenuGerant[] = [
    {
      code: 'commandes',
      libelle: 'Commandes',
      libelleMobile: 'Commandes',
      icone: 'fa-solid fa-receipt',
      chemin: '/gerant/commandes',
      badge: () => this.nombreCommandesNouvelles()
    },
    {
      code: 'menu',
      libelle: 'Menu',
      libelleMobile: 'Menu',
      icone: 'fa-solid fa-utensils',
      chemin: '/gerant/menu'
    },
    {
      code: 'historique',
      libelle: 'Historique',
      libelleMobile: 'Historique',
      icone: 'fa-solid fa-clock-rotate-left',
      chemin: '/gerant/historique'
    },
    {
      code: 'analytiques',
      libelle: 'Analytiques',
      libelleMobile: 'Analyses',
      icone: 'fa-solid fa-chart-simple',
      chemin: '/gerant/analytiques'
    },
    {
      code: 'menu-studio',
      libelle: 'Menu & Studio',
      libelleMobile: 'Studio',
      icone: 'fa-solid fa-clapperboard',
      chemin: '/gerant/menu-studio'
    },
    {
      code: 'profil',
      libelle: 'Profil & Établissement',
      libelleMobile: 'Profil',
      icone: 'fa-solid fa-store',
      chemin: '/gerant/profil'
    },
    {
      code: 'abonnement',
      libelle: 'Abonnement',
      libelleMobile: 'Abonnement',
      icone: 'fa-solid fa-credit-card',
      chemin: '/gerant/abonnement',
      masquerMobile: true
    }
  ];

  readonly listeMenuMobile = this.listeMenu.filter((item) => !item.masquerMobile);

  readonly photoGerant = computed(() => this.serviceAuth.utilisateurConnecte()?.adressePhoto || null);

  /**
   * Déconnecte le gérant et redirige vers la page de connexion.
   */
  deconnecter(): void {
    this.serviceAuth.deconnecter();
    this.routeur.navigate(['/connexion']);
  }

  /**
   * Vérifie si le lien correspond à la route actuelle.
   */
  estLienActif(chemin: string): boolean {
    const urlCourante = this.routeur.url.split('?')[0].split('#')[0];
    return urlCourante === chemin || urlCourante.startsWith(chemin + '/');
  }

  /**
   * Ouvre ou ferme le menu mobile.
   */
  basculerMenuMobile(): void {
    this.menuMobileOuvert.update((v) => !v);
  }

  /**
   * Ferme le menu mobile.
   */
  fermerMenuMobile(): void {
    this.menuMobileOuvert.set(false);
  }

  /**
   * Bascule le statut du restaurant (Ouvert / Fermé).
   */
  basculerStatutRestaurant(): void {
    const nouveauStatut = !this.estOuvert();
    this.estOuvert.set(nouveauStatut);
    const nomResto = this.nomRestaurant();
    const etat = nouveauStatut ? 'OUVERT' : 'FERMÉ';

    this.http.patch(`${environment.apiUrl}/etablissements/mon-etablissement/`, {
      est_ouvert: nouveauStatut
    }).subscribe({
      next: () => {
        this.notificationSucces.set(`Le restaurant "${nomResto}" est maintenant ${etat}.`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      },
      error: () => {
        this.notificationSucces.set(`Statut de "${nomResto}" mis à jour vers ${etat}.`);
        setTimeout(() => this.notificationSucces.set(null), 3000);
      }
    });
  }

  /**
   * Active ou coupe le son des notifications de commandes.
   */
  basculerSon(): void {
    this.sonActive.update((v) => !v);
    const etat = this.sonActive() ? 'activé' : 'en sourdine';
    this.notificationSucces.set(`Signal sonore des nouvelles commandes ${etat}.`);
    setTimeout(() => this.notificationSucces.set(null), 2500);
  }

  /**
   * Ouvre ou ferme le panneau des notifications du gérant.
   * Lorsqu'on l'ouvre, énonce automatiquement la notification la plus récente non lue.
   */
  basculerPanneauNotifications(): void {
    const ouvert = !this.panneauNotificationsOuvert();
    this.panneauNotificationsOuvert.set(ouvert);

    if (ouvert) {
      const nonLue = this.notifications().find((n) => !n.lue) || this.notifications()[0];
      if (nonLue) {
        this.annoncerNotification(nonLue);
      }
    }
  }

  /**
   * Ferme le panneau déroulant des notifications.
   */
  fermerPanneauNotifications(): void {
    this.panneauNotificationsOuvert.set(false);
  }

  /**
   * Marque une notification comme lue.
   */
  marquerCommeLue(id: string): void {
    this.serviceRestaurant.marquerNotificationCommeLue(id);
  }

  /**
   * Marque l'ensemble des notifications comme lues.
   */
  toutMarquerCommeLu(): void {
    this.serviceRestaurant.toutMarquerCommeLu();
  }

  /**
   * Énonce vocalement la notification via la synthèse vocale (Web Speech API) et joue un carillon.
   */
  annoncerNotification(notif: NotificationGerant): void {
    this.jouerCarillonBip();
    this.annoncerVocalement(notif.texteVocal);
    this.serviceRestaurant.marquerNotificationCommeLue(notif.id);
  }

  /**
   * Synthèse vocale de haute qualité en français pour annoncer la notification en cuisine.
   */
  annoncerVocalement(texte: string): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(texte);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Tolérance si le navigateur bloque ou restreint l'audio
      }
    }
  }

  /**
   * Émet un carillon sonore doux et distinctif (Web Audio API).
   */
  jouerCarillonBip(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Tolérance si l'API audio n'est pas accessible
    }
  }
}
