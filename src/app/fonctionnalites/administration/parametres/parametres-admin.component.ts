import { Component } from '@angular/core';
import { FormulaireCompteComponent } from '../../../partages/composants/formulaire-compte/formulaire-compte.component';

/**
 * « Mon compte » de l'administrateur (route /administration/parametres conservée).
 * Remplace l'ancienne page « Paramètres » dont les réglages n'étaient enregistrés
 * que dans le navigateur, sans aucun enregistrement côté serveur.
 */
@Component({
  selector: 'app-parametres-admin',
  standalone: true,
  imports: [FormulaireCompteComponent],
  templateUrl: './parametres-admin.component.html'
})
export class ParametresAdminComponent {}
