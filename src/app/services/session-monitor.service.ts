import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { DataCacheService } from './data-cache.service';
import { interval, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SessionMonitorService {
  private monitoringSubscription?: Subscription;
  private readonly CHECK_INTERVAL = 60000; // Vérifier toutes les minutes

  constructor(
    private authService: AuthService,
    private dataCacheService: DataCacheService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    console.log('🔍 Démarrage du monitoring de session');
    
    this.monitoringSubscription = interval(this.CHECK_INTERVAL).subscribe(() => {
      this.checkSession();
    });
  }

  private checkSession(): void {
    if (!this.authService.isAuthenticated()) {
      console.log('🔍 Session expirée détectée');
      this.handleSessionExpired();
      return;
    }

    if (this.authService.isTokenExpiringSoon()) {
      console.log('⚠️ Token expire bientôt');
      this.handleTokenExpiringSoon();
    }
  }

  private handleSessionExpired(): void {
    console.log('🔍 Gestion de l\'expiration de session');
    this.dataCacheService.clearCache();
    this.stopMonitoring();
  }

  private handleTokenExpiringSoon(): void {
    console.log('⚠️ Token expire dans moins de 5 minutes');
    // Ici on pourrait implémenter un refresh automatique
    // Pour l'instant, on prévient juste l'utilisateur
  }

  public stopMonitoring(): void {
    if (this.monitoringSubscription) {
      console.log('🔍 Arrêt du monitoring de session');
      this.monitoringSubscription.unsubscribe();
      this.monitoringSubscription = undefined;
    }
  }

  public restartMonitoring(): void {
    this.stopMonitoring();
    this.startMonitoring();
  }
}