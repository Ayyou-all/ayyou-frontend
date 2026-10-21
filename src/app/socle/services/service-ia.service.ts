/**
 * Service Angular pour les fonctionnalités d'Intelligence Artificielle AYYOU.
 * Communique avec la passerelle Django /api/ia/ adossée au microservice FastAPI.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Plat } from '../modeles/plat.modele';

/** Filtres compris par l'IA à partir d'une phrase dictée (recherche vocale). */
export interface AnalyseRechercheVocale {
  texte: string;
  specialites: string[];
  termes_recherche: string[];
  mots_libres: string[];
  budget_max_fcfa: number | null;
  quartier: string | null;
  tri: 'PRIX' | null;
  ouvert_seulement: boolean;
  source: 'FASTAPI_IA' | 'REPLI_LOCAL';
}

export interface CartePlatChatbot {
  id: number | string;
  nom: string;
  restaurant_nom: string;
  restaurant_id: number | string;
  prix_fcfa: number;
  image_url: string;
  description: string;
}

export interface ReponseChatbotIA {
  reponse_texte: string;
  cartes_plats: CartePlatChatbot[];
  budget_detecte_fcfa: number | null;
  intention: string;
  source: string;
}

export interface RecommandationPlatIA {
  plat: Plat;
  score_pertinence: number;
  motif_recommandation: string;
}

export interface PrevisionHeureRestaurant {
  heure: string;
  volume_estime: number;
  niveau_affluence: 'CALME' | 'MODERE' | 'COUP_DE_FEU';
  conseil_cuisine: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceIaService {
  private readonly http = inject(HttpClient);

  // État de la fenêtre du chatbot (ouvert / fermé)
  readonly chatbotOuvert = signal<boolean>(false);
  readonly chargementChatbot = signal<boolean>(false);

  // Historique des messages de la session de chat
  readonly messagesChat = signal<
    {
      auteur: 'UTILISATEUR' | 'ASSISTANT';
      texte: string;
      cartesPlats?: CartePlatChatbot[];
      heure: string;
    }[]
  >([
    {
      auteur: 'ASSISTANT',
      texte:
        'Dalal ak jàmm ! Je suis votre chef virtuel AYYOU. Dites-moi ce dont vous avez envie ou indiquez-moi votre budget pour que je vous propose les meilleurs plats réels disponibles à Dakar ! 🍲🇸🇳',
      heure: 'À l\'instant'
    }
  ]);

  basculerChatbot(): void {
    this.chatbotOuvert.update((ouvert) => !ouvert);
  }

  ouvrirChatbot(): void {
    this.chatbotOuvert.set(true);
  }

  fermerChatbot(): void {
    this.chatbotOuvert.set(false);
  }

  /**
   * Envoie un message au chatbot culinaire sous contrainte budgétaire.
   */
  envoyerMessage(message: string, budgetFcfa?: number, quartier?: string): Observable<ReponseChatbotIA> {
    this.chargementChatbot.set(true);

    const dateNow = new Date();
    const heureStr = `${dateNow.getHours().toString().padStart(2, '0')}:${dateNow.getMinutes().toString().padStart(2, '0')}`;

    // Ajout du message utilisateur
    this.messagesChat.update((msgs) => [
      ...msgs,
      {
        auteur: 'UTILISATEUR',
        texte: message,
        heure: heureStr
      }
    ]);

    const payload: any = { message };
    if (budgetFcfa) payload.budget_fcfa = budgetFcfa;
    if (quartier) payload.quartier = quartier;

    return this.http.post<any>(`${environment.apiUrl}/ia/chatbot/`, payload).pipe(
      map((reponse: any) => {
        this.chargementChatbot.set(false);
        const texte = reponse.reponse_texte || reponse.texteReponse || '';
        const cartes = reponse.cartes_plats || reponse.plats || [];
        this.messagesChat.update((msgs) => [
          ...msgs,
          {
            auteur: 'ASSISTANT',
            texte: texte,
            cartesPlats: cartes,
            heure: heureStr
          }
        ]);
        return {
          reponse_texte: texte,
          cartes_plats: cartes,
          budget_detecte_fcfa: reponse.budget_detecte_fcfa ?? reponse.budgetRespecte ?? null,
          intention: reponse.intention || 'SUGGESTION',
          source: reponse.source || 'FASTAPI_IA'
        } as ReponseChatbotIA;
      }),
      catchError((erreur) => {
        this.chargementChatbot.set(false);
        const reponseSecours: ReponseChatbotIA = {
          reponse_texte:
            'Désolé, je rencontre une petite difficulté pour consulter les cuisines dakarorises à cet instant. N\'hésitez pas à explorer notre catalogue !',
          cartes_plats: [],
          budget_detecte_fcfa: null,
          intention: 'erreur',
          source: 'secours_local'
        };
        this.messagesChat.update((msgs) => [
          ...msgs,
          {
            auteur: 'ASSISTANT',
            texte: reponseSecours.reponse_texte,
            cartesPlats: [],
            heure: heureStr
          }
        ]);
        return of(reponseSecours);
      })
    );
  }

  /**
   * Recommandations personnalisées de plats selon l'heure à Dakar et l'historique client.
   */
  obtenirRecommandations(budgetMaxFcfa?: number, limite: number = 6): Observable<any[]> {
    let url = `${environment.apiUrl}/ia/recommandations/?limite=${limite}`;
    if (budgetMaxFcfa) {
      url += `&budget_max_fcfa=${budgetMaxFcfa}`;
    }
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.plats)) return res.plats;
        if (res && Array.isArray(res.recommandations)) return res.recommandations;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Recherche vocale : transforme la phrase dictée en filtres (plats, budget, quartier, prix, ouverture).
   */
  analyserRechercheVocale(texte: string): Observable<AnalyseRechercheVocale> {
    return this.http.post<AnalyseRechercheVocale>(`${environment.apiUrl}/ia/recherche-vocale/`, { texte });
  }

  /**
   * Prévisions d'affluence et coups de feu pour le restaurant connecté.
   */
  /**
   * Réponse : { donnees_suffisantes, message?, previsions_par_heure, heure_de_pointe }.
   * Si donnees_suffisantes est faux, afficher `message` (« Données insuffisantes… »).
   */
  obtenirPrevisionsRestaurant(): Observable<{
    donnees_suffisantes: boolean;
    message?: string;
    previsions_par_heure: PrevisionHeureRestaurant[];
    heure_de_pointe?: string;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/ia/restaurant/previsions/`);
  }

  /**
   * Rapport hebdomadaire IA de performance pour le restaurant connecté.
   */
  obtenirRapportHebdoRestaurant(): Observable<any> {
    // Même règle : si donnees_suffisantes est faux, afficher `message` et aucun chiffre inventé.
    return this.http.get<any>(`${environment.apiUrl}/ia/restaurant/rapport-hebdo/`);
  }
}
