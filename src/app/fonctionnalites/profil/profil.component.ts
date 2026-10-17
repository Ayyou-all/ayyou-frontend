import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuthentification } from '../../socle/services/service-authentification.service';
import { ServiceLivreurService } from '../../socle/services/service-livreur.service';

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
        <div class="bg-white rounded-3xl p-6 border border-slate-100 flex items-center gap-4">
          <div class="w-16 h-16 rounded-full overflow-hidden bg-rose-50 border-2 border-red-100 shrink-0 flex items-center justify-center text-[#E51824] font-black text-xl">
            @if (serviceAuthentification.utilisateurConnecte()?.adressePhoto) {
              <img
                [src]="serviceAuthentification.utilisateurConnecte()?.adressePhoto"
                alt="Avatar"
                class="w-full h-full object-cover"
              />
            } @else {
              <span>{{ (serviceAuthentification.utilisateurConnecte()?.prenom?.[0] || 'U') + (serviceAuthentification.utilisateurConnecte()?.nom?.[0] || '') }}</span>
            }
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

        <!-- =================================================================== -->
        <!-- SECTIONS PROFIL LIVREUR (DONNÉES RÉELLES DE LA BASE)                 -->
        <!-- =================================================================== -->
        @if (serviceAuthentification.estLivreur()) {
          <!-- Statut du compte & disponibilité -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white rounded-3xl p-4 border border-slate-100">
              <span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Statut du compte</span>
              @if (profilLivreur().statutValidation === 'ACTIF') {
                <span class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black border border-emerald-200">
                  <i class="fa-solid fa-circle-check text-[10px]"></i> Validé
                </span>
              } @else {
                <span class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-black border border-amber-200">
                  <i class="fa-solid fa-clock text-[10px]"></i> {{ profilLivreur().statutValidation || 'En attente' }}
                </span>
              }
            </div>
            <div class="bg-white rounded-3xl p-4 border border-slate-100">
              <span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Disponibilité</span>
              <span
                [class]="profilLivreur().estDisponible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border"
              >
                <span [class]="profilLivreur().estDisponible ? 'bg-emerald-500' : 'bg-slate-400'" class="w-2 h-2 rounded-full"></span>
                {{ profilLivreur().estDisponible ? 'En ligne' : 'Hors ligne' }}
              </span>
            </div>
          </div>

          <!-- Activité du jour & de la semaine -->
          <div class="bg-[#E51824] rounded-3xl p-5 text-white">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-black uppercase tracking-wider text-white/90">Mon activité</h3>
              <i class="fa-solid fa-chart-line text-white/70"></i>
            </div>
            <div class="grid grid-cols-3 gap-3 mt-4">
              <div>
                <span class="block text-[10px] font-bold text-white/70 uppercase">Gains du jour</span>
                <span class="text-lg font-black font-['Outfit']">{{ profilLivreur().gainsDuJourFcfa | number }}</span>
                <span class="text-[10px] font-bold text-white/80"> FCFA</span>
              </div>
              <div>
                <span class="block text-[10px] font-bold text-white/70 uppercase">Courses jour</span>
                <span class="text-lg font-black font-['Outfit']">{{ profilLivreur().nombreLivraisonsJour }}</span>
              </div>
              <div>
                <span class="block text-[10px] font-bold text-white/70 uppercase">Semaine</span>
                <span class="text-lg font-black font-['Outfit']">{{ serviceLivreur.gainsSemaine().montantTotalFcfa | number }}</span>
                <span class="text-[10px] font-bold text-white/80"> FCFA</span>
              </div>
            </div>
          </div>

          <!-- Informations personnelles -->
          <div class="bg-white rounded-3xl p-5 border border-slate-100 space-y-3">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-id-card text-[#E51824]"></i> Informations personnelles
            </h3>
            <div class="divide-y divide-slate-100 text-sm">
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">Prénom & Nom</span>
                <span class="font-bold text-slate-900 text-right">{{ profilLivreur().prenom || serviceAuthentification.utilisateurConnecte()?.prenom }} {{ profilLivreur().nom || serviceAuthentification.utilisateurConnecte()?.nom }}</span>
              </div>
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">Téléphone</span>
                <span class="font-bold text-slate-900">{{ profilLivreur().telephone || serviceAuthentification.utilisateurConnecte()?.telephone || '—' }}</span>
              </div>
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">E-mail</span>
                <span class="font-bold text-slate-900 truncate max-w-[60%]">{{ profilLivreur().courriel || serviceAuthentification.utilisateurConnecte()?.courriel }}</span>
              </div>
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">Adresse</span>
                <span class="font-bold text-slate-900 text-right max-w-[60%]">{{ profilLivreur().adresse || 'Non renseignée' }}</span>
              </div>
            </div>
          </div>

          <!-- Véhicule & zone de livraison -->
          <div class="bg-white rounded-3xl p-5 border border-slate-100 space-y-3">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-motorcycle text-[#E51824]"></i> Véhicule & zone de livraison
            </h3>
            <div class="divide-y divide-slate-100 text-sm">
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">Type de véhicule</span>
                <span class="font-bold text-slate-900">{{ libelleVehicule(profilLivreur().typeVehicule) }}</span>
              </div>
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">Modèle</span>
                <span class="font-bold text-slate-900">{{ profilLivreur().nomVehicule || 'Non renseigné' }}</span>
              </div>
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">Immatriculation</span>
                <span class="font-mono font-bold text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100">{{ profilLivreur().immatriculation || '—' }}</span>
              </div>
              <div class="flex items-center justify-between py-2.5">
                <span class="text-slate-500">Zone principale</span>
                <span class="font-bold text-slate-900 text-right max-w-[60%]">{{ profilLivreur().zonePrincipale || 'Non renseignée' }}</span>
              </div>
            </div>
          </div>

          <!-- Bouton modifier -->
          <a
            routerLink="/livreur/profil"
            class="w-full py-3.5 rounded-2xl bg-[#E51824] hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Modifier mes informations</span>
          </a>
        }

        <!-- Menu des options et accès pro sécurisé selon le rôle -->
        <div class="bg-white rounded-3xl p-4 border border-slate-100 space-y-2">
          
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
              routerLink="/livreur/profil"
              class="w-full p-3.5 rounded-2xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer border border-blue-200/60 bg-blue-50/20"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <i class="fa-solid fa-motorcycle"></i>
                </div>
                <div>
                  <span class="block text-slate-900">Mon Profil & Espace Livreur</span>
                  <span class="block text-xs font-normal text-slate-500">Modifier mes informations, véhicule et gains</span>
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
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 text-center space-y-6">
          
          <div class="w-20 h-20 rounded-3xl bg-red-50 text-[#E51824] flex items-center justify-center text-3xl mx-auto ring-4 ring-red-100/60">
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
              class="w-full py-3.5 px-6 rounded-2xl bg-[#E51824] hover:bg-red-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
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
export class ProfilComponent implements OnInit {
  readonly serviceAuthentification = inject(ServiceAuthentification);
  readonly serviceLivreur = inject(ServiceLivreurService);
  readonly routeur = inject(Router);
  readonly profilLivreur = this.serviceLivreur.profilLivreur;

  libelleVehicule(type?: string): string {
    const libelles: Record<string, string> = { MOTO: 'Moto', SCOOTER: 'Scooter', VELO: 'Vélo', VOITURE: 'Voiture' };
    return type ? libelles[type.toUpperCase()] || type : 'Non renseigné';
  }

  ngOnInit(): void {
    if (this.serviceAuthentification.estLivreur()) {
      // Chargement des informations réelles du livreur depuis l'API Django
      this.serviceLivreur.chargerProfilLivreur();
      return;
    }
    if (this.serviceAuthentification.estGerant()) {
      this.routeur.navigate(['/gerant/profil'], { replaceUrl: true });
      return;
    }
  }

  deconnecter(): void {
    this.serviceAuthentification.deconnecter();
    this.routeur.navigate(['/accueil']);
  }
}
