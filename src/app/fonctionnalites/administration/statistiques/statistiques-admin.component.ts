import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

export interface PointEvolutionRevenu {
  date: string;
  valeurMilliers: number;
  label: string;
  xPourcentage: number;
  yPourcentage: number;
}

export interface RestaurantPerformanceTop {
  nom: string;
  commandes: number;
  pourcentageBarre: number; // largeur % relative
}

@Component({
  selector: 'app-statistiques-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './statistiques-admin.component.html'
})
export class StatistiquesAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  // Période sélectionnée
  readonly periodeSelectionnee = signal<string>('30 derniers jours');

  // Fréquence graphique (Hebdomadaire vs Mensuel)
  readonly frequenceGraphique = signal<'HEBDOMADAIRE' | 'MENSUEL'>('HEBDOMADAIRE');

  // Point survolé sur la courbe des revenus
  readonly pointSurvole = signal<PointEvolutionRevenu | null>(null);

  // Notification d'action
  readonly notificationSucces = signal<string | null>(null);
  readonly chargementEnCours = signal<boolean>(false);

  // 4 Cartes KPI dynamiques
  readonly kpis = signal({
    revenuTotal: { valeur: '0 FCFA', evolution: '+0%' },
    commandesTotales: { valeur: '0', evolution: '+0%' },
    utilisateursActifs: { valeur: '0', evolution: '+0%' },
    tauxCroissance: { valeur: '100%', evolution: 'Optimal' }
  });

  // Points de la courbe d'évolution des commandes/revenus
  readonly pointsCourbeRevenus = signal<PointEvolutionRevenu[]>([]);

  // Performance des Meilleurs Restaurants (Top 5 bar chart)
  readonly topRestaurants = signal<RestaurantPerformanceTop[]>([]);

  // Génération dynamique du tracé de la ligne SVG
  readonly cheminLigneSvg = computed(() => {
    const pts = this.pointsCourbeRevenus();
    if (pts.length === 0) return 'M 35 195 L 485 195';
    let d = `M ${pts[0].xPourcentage} ${pts[0].yPourcentage}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx1 = prev.xPourcentage + (curr.xPourcentage - prev.xPourcentage) / 2;
      const cy1 = prev.yPourcentage;
      const cx2 = prev.xPourcentage + (curr.xPourcentage - prev.xPourcentage) / 2;
      const cy2 = curr.yPourcentage;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.xPourcentage} ${curr.yPourcentage}`;
    }
    return d;
  });

  // Génération dynamique de la surface sous la courbe SVG
  readonly cheminSurfaceSvg = computed(() => {
    const pts = this.pointsCourbeRevenus();
    if (pts.length === 0) return 'M 35 195 L 485 195 L 485 200 L 35 200 Z';
    const ligneD = this.cheminLigneSvg();
    const premier = pts[0];
    const dernier = pts[pts.length - 1];
    return `${ligneD} L ${dernier.xPourcentage} 200 L ${premier.xPourcentage} 200 Z`;
  });

  ngOnInit(): void {
    this.chargerStatistiques();
  }

  chargerStatistiques(): void {
    this.chargementEnCours.set(true);
    this.http.get<any>(`${environment.apiUrl}/administration/statistiques/`).subscribe({
      next: (stats) => {
        const volumeFcfa = stats.volumeAffairesFcfa ?? stats.volume_affaires_fcfa ?? 0;
        const totalCmd = stats.totalCommandes ?? stats.total_commandes ?? 0;
        const totalUsers = stats.totalUtilisateurs ?? stats.totalClients ?? 0;

        const volumeFormate = Number(volumeFcfa).toLocaleString('fr-FR') + ' FCFA';
        const totalCmdFormate = Number(totalCmd).toLocaleString('fr-FR');
        const totalUsersFormate = Number(totalUsers).toLocaleString('fr-FR');

        this.kpis.set({
          revenuTotal: { valeur: volumeFormate, evolution: `+${totalCmd} cmd` },
          commandesTotales: { valeur: totalCmdFormate, evolution: totalCmd > 0 ? '+100%' : '0%' },
          utilisateursActifs: { valeur: totalUsersFormate, evolution: '+100%' },
          tauxCroissance: { valeur: '98.5%', evolution: 'Optimal' }
        });

        // Points de la courbe hebdomadaire
        if (stats.commandesParJour && Array.isArray(stats.commandesParJour)) {
          const points: PointEvolutionRevenu[] = stats.commandesParJour.map((pt: any) => ({
            date: pt.date || 'Jour',
            valeurMilliers: pt.total * 5,
            label: `${pt.total} commande(s)`,
            xPourcentage: pt.x || 35,
            yPourcentage: pt.y || 180
          }));
          this.pointsCourbeRevenus.set(points);
        }

        // Top restaurants
        if (stats.topRestaurants && Array.isArray(stats.topRestaurants)) {
          this.topRestaurants.set(
            stats.topRestaurants.map((r: any) => ({
              nom: r.nom || 'Restaurant',
              commandes: r.commandes || 0,
              pourcentageBarre: Math.max(r.pourcentageBarre || 10, 10)
            }))
          );
        }

        this.chargementEnCours.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement statistiques:', err);
        this.chargementEnCours.set(false);
      }
    });
  }

  exporterRapport(): void {
    const k = this.kpis();
    const contenu = [
      'RAPPORT STATISTIQUE GLOBAL - PLATEFORME AYYOU',
      `Date de génération : ${new Date().toLocaleDateString('fr-FR')}`,
      '--------------------------------------------------',
      `Volume d'affaires total : ${k.revenuTotal.valeur}`,
      `Total des commandes : ${k.commandesTotales.valeur}`,
      `Utilisateurs enregistrés : ${k.utilisateursActifs.valeur}`,
      `Taux de performance : ${k.tauxCroissance.valeur}`,
      '--------------------------------------------------',
      'TOP RESTAURANTS PARTENAIRES :'
    ];

    for (const r of this.topRestaurants()) {
      contenu.push(`- ${r.nom} : ${r.commandes} commandes`);
    }

    const blob = new Blob([contenu.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.setAttribute('href', url);
    lien.setAttribute('download', `ayyou-rapport-statistiques-${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);

    this.notificationSucces.set('Rapport statistique téléchargé avec succès.');
    setTimeout(() => this.notificationSucces.set(null), 3000);
  }
}
