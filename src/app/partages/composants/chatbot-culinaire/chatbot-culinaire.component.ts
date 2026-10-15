import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartePlatChatbot, ServiceIaService } from '../../../socle/services/service-ia.service';
import { ServiceCatalogueService } from '../../../socle/services/service-catalogue.service';
import { ServicePanierService } from '../../../socle/services/service-panier.service';

@Component({
  selector: 'app-chatbot-culinaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-culinaire.component.html',
  styleUrl: './chatbot-culinaire.component.css'
})
export class ChatbotCulinaireComponent {
  readonly serviceIa = inject(ServiceIaService);
  readonly serviceCatalogue = inject(ServiceCatalogueService);
  readonly servicePanier = inject(ServicePanierService);
  readonly routeur = inject(Router);

  readonly messageSaisi = signal<string>('');
  readonly suggestionsRapides: string[] = [
    'J\'ai 3 500 FCFA pour midi',
    'Un bon Thieboudienne aux Almadies',
    'Un burger rapide sous 5 000 FCFA',
    'Des pastels croustillants pour le goûter'
  ];

  envoyerMessage(): void {
    const texte = this.messageSaisi().trim();
    if (!texte || this.serviceIa.chargementChatbot()) {
      return;
    }

    this.messageSaisi.set('');
    this.serviceIa.envoyerMessage(texte).subscribe();
  }

  utiliserSuggestion(suggestion: string): void {
    this.messageSaisi.set(suggestion);
    this.envoyerMessage();
  }

  consulterPlat(carte: CartePlatChatbot): void {
    this.serviceCatalogue.ouvrirDetailPlat({
      identifiant: String(carte.id),
      identifiantRestaurant: String(carte.restaurant_id),
      nomRestaurant: carte.restaurant_nom,
      nom: carte.nom,
      description: carte.description,
      prixFcfa: carte.prix_fcfa,
      adresseImage: carte.image_url,
      categorie: 'Plats',
      statut: 'DISPONIBLE'
    });
    this.serviceIa.fermerChatbot();
  }

  commanderDirectement(carte: CartePlatChatbot): void {
    this.servicePanier.ajouterPlat({
      identifiant: String(carte.id),
      identifiantRestaurant: String(carte.restaurant_id),
      nomRestaurant: carte.restaurant_nom,
      nom: carte.nom,
      description: carte.description,
      prixFcfa: carte.prix_fcfa,
      adresseImage: carte.image_url,
      categorie: 'Plats',
      statut: 'DISPONIBLE'
    }, 1);

    this.serviceIa.fermerChatbot();
    this.routeur.navigate(['/panier']);
  }
}
