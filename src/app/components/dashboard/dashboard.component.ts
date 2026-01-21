import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientService, Client } from '../../services/client.service';
import { CompteService, Compte } from '../../services/compte.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { DataCacheService, DashboardData } from '../../services/data-cache.service';
import { SessionMonitorService } from '../../services/session-monitor.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  clientsCount: number = 0;
  comptesCount: number = 0;
  transactionsCount: number = 0;
  totalSolde: number = 0;
  recentTransactions: Transaction[] = [];
  isLoading: boolean = true;
  private refreshSubscription?: Subscription;

  constructor(
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService,
    public authService: AuthService,
    private dataCacheService: DataCacheService,
    private sessionMonitorService: SessionMonitorService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Dashboard ngOnInit - DÉBUT avec cache');
    console.log('🚀 Dashboard ngOnInit - Utilisateur connecté:', this.authService.isAuthenticated());
    
    // S'abonner aux données du cache
    this.dataCacheService.dashboardData$.subscribe(data => {
      if (data) {
        console.log('📊 Données reçues du cache:', data);
        this.clientsCount = data.clientsCount;
        this.comptesCount = data.comptesCount;
        this.transactionsCount = data.transactionsCount;
        this.totalSolde = data.totalSolde;
        this.recentTransactions = data.transactions.slice(0, 5);
      }
    });

    // S'abonner à l'état de chargement
    this.dataCacheService.isLoading$.subscribe(loading => {
      this.isLoading = loading;
    });
    
    // Charger les données (depuis le cache ou l'API)
    this.loadDashboardData();
    
    // Rafraîchir automatiquement toutes les 60 secondes
    this.refreshSubscription = interval(60000).subscribe(() => {
      console.log('⏰ Rafraîchissement automatique du dashboard');
      if (this.authService.isAuthenticated()) {
        this.dataCacheService.refreshData().subscribe();
      } else {
        console.log('⚠️ Utilisateur non authentifié, arrêt du rafraîchissement');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadDashboardData(): void {
    console.log('🔄 loadDashboardData - Utilisation du cache');
    this.dataCacheService.getDashboardData().subscribe({
      next: (data) => {
        console.log('✅ Données dashboard chargées via cache');
      },
      error: (err) => {
        console.error('❌ Erreur chargement dashboard:', err);
      }
    });
  }

  refreshData(): void {
    console.log('🔄 refreshData - Actualisation forcée');
    this.dataCacheService.refreshData().subscribe({
      next: (data) => {
        console.log('✅ Données actualisées avec succès');
      },
      error: (err) => {
        console.error('❌ Erreur actualisation:', err);
      }
    });
  }

  testConnection(): void {
    console.log('🧪 Test de connexion démarré');
    console.log('🧪 Utilisateur authentifié:', this.authService.isAuthenticated());
    console.log('🧪 Token:', this.authService.getToken()?.substring(0, 30) + '...');
    console.log('🧪 Utilisateur actuel:', this.authService.getCurrentUser());
    
    // Test direct de l'API clients via le cache
    this.dataCacheService.refreshData().subscribe({
      next: (data) => {
        console.log('🧪 ✅ Test cache réussi:', data);
        alert(`Test réussi: ${data.clientsCount} clients, ${data.comptesCount} comptes`);
      },
      error: (err) => {
        console.error('🧪 ❌ Test cache échoué:', err);
        alert(`Test échoué: ${err.message || err}`);
      }
    });
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
