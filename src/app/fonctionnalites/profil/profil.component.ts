import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuthentification } from '../../socle/services/service-authentification.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      <!-- En-tête de la page -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-extrabold text-slate-900 font-['Outfit']">Mon Profil</h1>
        
        <!-- Indicateur de statut -->
        @if (serviceAuthentification.estVisiteur()) {
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            <i class="fa-regular fa-eye text-xs"></i>
            <span>Mode Visiteur</span>
          </span>
        } @else {
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <i class="fa-solid fa-circle-check text-xs"></i>
            <span>Connecté</span>
          </span>
        }
      </div>

      <!-- =================================================================== -->
      <!-- CAS 1 : UTILISATEUR CONNECTÉ                                        -->
      <!-- =================================================================== -->
      @if (serviceAuthentification.estAuthentifie()) {
        <!-- Carte d'identité du profil -->
        <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex items-center gap-4">
          <div class="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-red-100 shrink-0">
            <img
              [src]="serviceAuthentification.utilisateurConnecte()?.adressePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'"
              alt="Avatar"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-extrabold text-slate-900 truncate">
                {{ serviceAuthentification.utilisateurConnecte()?.prenom }} {{ serviceAuthentification.utilisateurConnecte()?.nom }}
              </h2>
              @if (serviceAuthentification.estGerant()) {
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700">Gérant</span>
              } @else if (serviceAuthentification.estLivreur()) {
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">Livreur</span>
              } @else if (serviceAuthentification.estAdministrateur()) {
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">Admin</span>
              } @else {
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">Client</span>
              }
            </div>
            <div class="text-xs text-slate-500">{{ serviceAuthentification.utilisateurConnecte()?.courriel }}</div>
            <div class="text-xs text-slate-500">{{ serviceAuthentification.utilisateurConnecte()?.telephone }}</div>
          </div>
        </div>

        <!-- Menu des options et accès pro sécurisé selon le rôle -->
        <div class="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-2">
          
          <!-- Accès 1 : Espace Gérant Restaurant (Exclusivement pour RESTAURANT) -->
          @if (serviceAuthentification.estGerant()) {
            <a
              routerLink="/gerant"
              class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer border border-orange-200/60 bg-orange-50/20"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-orange-100 text-[#E51824] flex items-center justify-center">
                  <i class="fa-solid fa-utensils"></i>
                </div>
                <div>
                  <span class="block text-slate-900">Espace Gérant Restaurant</span>
                  <span class="block text-xs font-normal text-slate-500">Gérer les commandes, le menu et le studio</span>
                </div>
              </div>
              <i class="fa-solid fa-chevron-right text-xs text-orange-500"></i>
            </a>
          }

          <!-- Accès 2 : Espace Livreur (Exclusivement pour LIVREUR) -->
          @if (serviceAuthentification.estLivreur()) {
            <a
              routerLink="/livreur"
              class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer border border-blue-200/60 bg-blue-50/20"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <i class="fa-solid fa-motorcycle"></i>
                </div>
                <div>
                  <span class="block text-slate-900">Espace Livreur</span>
                  <span class="block text-xs font-normal text-slate-500">Gérer mes courses et mes gains</span>
                </div>
              </div>
              <i class="fa-solid fa-chevron-right text-xs text-blue-500"></i>
            </a>
          }

          <!-- Accès 3 : Espace Superadmin (Exclusivement pour ADMINISTRATEUR) -->
          @if (serviceAuthentification.estAdministrateur()) {
            <a
              routerLink="/administration"
              class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer border border-slate-200 bg-slate-50/50"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                  <span class="block text-slate-900">Espace Superadmin</span>
                  <span class="block text-xs font-normal text-slate-500">Tableau de bord & validations de partenaires</span>
                </div>
              </div>
              <i class="fa-solid fa-chevron-right text-xs text-slate-400"></i>
            </a>
          }

          <!-- Options Client (Commandes & Historique pour les clients réguliers) -->
          @if (serviceAuthentification.estClient()) {
            <a
              routerLink="/commandes"
              class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer border border-slate-100"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-rose-50 text-[#E51824] flex items-center justify-center">
                  <i class="fa-solid fa-receipt"></i>
                </div>
                <div>
                  <span class="block text-slate-900">Mes Commandes</span>
                  <span class="block text-xs font-normal text-slate-400">Suivre et consulter l'historique de mes repas</span>
                </div>
              </div>
              <i class="fa-solid fa-chevron-right text-xs text-slate-400"></i>
            </a>
          }

          <!-- Déconnexion -> Retour au Mode Visiteur -->
          <button
            type="button"
            (click)="deconnecter()"
            class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
              <span>Se déconnecter (Passer en Mode Visiteur)</span>
            </div>
            <i class="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      } @else {
        <!-- =================================================================== -->
        <!-- CAS 2 : MODE VISITEUR (NON CONNECTÉ)                                -->
        <!-- =================================================================== -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl text-center space-y-6">
          
          <div class="w-20 h-20 rounded-3xl bg-red-50 text-[#E51824] flex items-center justify-center text-3xl mx-auto shadow-sm ring-4 ring-red-100/60">
            <i class="fa-solid fa-user-lock"></i>
          </div>

          <div class="space-y-2 max-w-md mx-auto">
            <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit']">
              Connectez-vous à votre espace AYYOU
            </h2>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Le mode visiteur vous permet d'explorer les plats et vidéos de Dakar.
              Connectez-vous pour commander, liker des plats, suivre des restaurants et gérer votre profil.
            </p>
          </div>

          <div class="max-w-sm mx-auto space-y-3 pt-2">
            <!-- Bouton Se connecter -->
            <a
              routerLink="/connexion"
              class="w-full py-3.5 px-6 rounded-2xl bg-[#E51824] hover:bg-red-700 text-white font-extrabold text-sm shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <i class="fa-solid fa-arrow-right-to-bracket text-sm"></i>
              <span>Se connecter</span>
            </a>

            <!-- Bouton Créer un compte -->
            <a
              routerLink="/inscription"
              class="w-full py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <i class="fa-solid fa-user-plus text-sm text-slate-500"></i>
              <span>Créer un compte</span>
            </a>

            <!-- Connexion rapide démo 1 clic -->
            <button
              type="button"
              (click)="connexionRapideClient()"
              class="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <i class="fa-solid fa-bolt text-amber-600"></i>
              <span>Connexion rapide Démo (Fatou Diop)</span>
            </button>
          </div>

          <!-- Lien retour à l'accueil -->
          <div class="pt-2">
            <a
              routerLink="/accueil"
              class="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <i class="fa-solid fa-arrow-left text-xs"></i>
              <span>Retourner au fil vidéo d'accueil</span>
            </a>
          </div>

        </div>
      }

    </div>
  `
})
export class ProfilComponent {
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly routeur = inject(Router);

  connexionRapideClient(): void {
    this.serviceAuthentification.connexionRapideClientVisiteur().subscribe();
  }

  deconnecter(): void {
    this.serviceAuthentification.deconnecter();
    this.routeur.navigate(['/accueil']);
  }
}
