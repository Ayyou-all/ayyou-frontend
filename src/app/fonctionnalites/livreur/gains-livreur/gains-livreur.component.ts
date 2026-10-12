import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ServiceLivreurService } from '../../../socle/services/service-livreur.service';

@Component({
  selector: 'app-gains-livreur',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gains-livreur.component.html'
})
export class GainsLivreurComponent {
  readonly serviceLivreur = inject(ServiceLivreurService);
}
