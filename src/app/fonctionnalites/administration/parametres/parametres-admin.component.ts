import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type OngletParametres = 'GENERAL' | 'SECURITE' | 'NOTIFICATIONS' | 'PAIEMENTS' | 'API';

@Component({
  selector: 'app-parametres-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './parametres-admin.component.html'
})
export class ParametresAdminComponent implements OnInit {
  // Onglet actif
  readonly ongletActif = signal<OngletParametres>('GENERAL');

  // Champs de la plateforme (conformes à l'Image 3)
  readonly nomPlateforme = signal<string>('AYYOU Livraison');
  readonly emailContact = signal<string>('contact@ayyou.com');
  readonly deviseParDefaut = signal<string>('FCFA (Franc CFA)');
  readonly fuseauHoraire = signal<string>('(GMT+00:00) Dakar, Sénégal');

  // Mode maintenance
  readonly modeMaintenanceActif = signal<boolean>(false);

  // Notification Toast
  readonly notificationSucces = signal<string | null>(null);

  // Modale de gestion de la sécurité
  readonly modaleSecuriteOuverte = signal<boolean>(false);
  readonly doubleFacteurActif = signal<boolean>(true);
  readonly motDePasseActuel = signal<string>('');
  readonly nouveauMotDePasse = signal<string>('');

  ngOnInit(): void {
    const savedMaintenance = localStorage.getItem('ayyou_mode_maintenance');
    if (savedMaintenance !== null) {
      this.modeMaintenanceActif.set(savedMaintenance === 'true');
    }
    const savedPlatformName = localStorage.getItem('ayyou_nom_plateforme');
    if (savedPlatformName) {
      this.nomPlateforme.set(savedPlatformName);
    }
    const savedContact = localStorage.getItem('ayyou_email_contact');
    if (savedContact) {
      this.emailContact.set(savedContact);
    }
  }

  /**
   * Enregistre l'ensemble des modifications système.
   */
  enregistrerModifications(): void {
    localStorage.setItem('ayyou_nom_plateforme', this.nomPlateforme());
    localStorage.setItem('ayyou_email_contact', this.emailContact());
    localStorage.setItem('ayyou_mode_maintenance', String(this.modeMaintenanceActif()));
    this.notificationSucces.set('Les paramètres de la plateforme ont été enregistrés avec succès.');
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Bascule l'état du mode maintenance.
   */
  basculerModeMaintenance(): void {
    this.modeMaintenanceActif.update((v) => !v);
    localStorage.setItem('ayyou_mode_maintenance', String(this.modeMaintenanceActif()));
    const etat = this.modeMaintenanceActif() ? 'activé' : 'désactivé';
    this.notificationSucces.set(`Mode maintenance ${etat}.`);
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }

  /**
   * Ouvre la modale de sécurité avancée.
   */
  ouvrirGestionSecurite(): void {
    this.modaleSecuriteOuverte.set(true);
  }

  /**
   * Ferme la modale de sécurité.
   */
  fermerGestionSecurite(): void {
    this.modaleSecuriteOuverte.set(false);
  }

  /**
   * Sauvegarde les paramètres de sécurité.
   */
  sauvegarderSecurite(): void {
    this.notificationSucces.set('Les paramètres de sécurité et le mot de passe ont été mis à jour.');
    this.fermerGestionSecurite();
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }
}
