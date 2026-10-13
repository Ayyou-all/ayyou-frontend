import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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
}

@Component({
  selector: 'app-mise-en-page-gerant',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mise-en-page-gerant.component.html'
})
export class MiseEnPageGerantComponent {
  readonly routeur = inject(Router);
  readonly serviceRestaurant = inject(ServiceRestaurantCommandesService);

  // État du tiroir mobile (conservé pour rétrocompatibilité)
  readonly menuMobileOuvert = signal<boolean>(false);

  // État d'affichage du panneau déroulant de notifications
  readonly panneauNotificationsOuvert = signal<boolean>(false);

  // Statut d'ouverture du restaurant (OUVERT / FERMÉ)
  readonly estOuvert = signal<boolean>(true);

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
    }
  ];

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
    this.estOuvert.update((v) => !v);
    const etat = this.estOuvert() ? 'OUVERT' : 'FERMÉ';
    this.notificationSucces.set(`Le restaurant "Le Teranga" est maintenant ${etat}.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
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
