import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ClientService, Client } from './client.service';
import { CompteService, Compte } from './compte.service';
import { TransactionService, Transaction } from './transaction.service';
import { AuthService } from './auth.service';

export interface DashboardData {
  clients: Client[];
  comptes: Compte[];
  transactions: Transaction[];
  clientsCount: number;
  comptesCount: number;
  transactionsCount: number;
  totalSolde: number;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DataCacheService {
  private dashboardDataSubject = new BehaviorSubject<DashboardData | null>(null);
  public dashboardData$ = this.dashboardDataSubject.asObservable();
  
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();
  
  private lastUpdateTime: Date | null = null;
  private readonly CACHE_DURATION = 30000; // 30 secondes

  constructor(
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService,
    private authService: AuthService
  ) {
    console.log('🗄️ DataCacheService initialisé');
    
    // Surveiller les changements d'authentification avec un délai
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        console.log('🗄️ Utilisateur déconnecté, vidage du cache');
        this.clearCache();
      } else {
        console.log('🗄️ Utilisateur connecté:', user.username, user.role);
        // Attendre un peu avant de charger les données pour s'assurer que l'auth est stable
        setTimeout(() => {
          if (this.authService.isAuthenticated()) {
            console.log('🗄️ Chargement automatique des données après connexion');
            this.getDashboardData(true).subscribe({
              next: (data) => console.log('✅ Données chargées automatiquement:', data.clientsCount, 'clients'),
              error: (err) => console.error('❌ Erreur chargement auto:', err)
            });
          }
        }, 500);
      }
    });
  }

  // Vérifier si les données en cache sont encore valides
  private isCacheValid(): boolean {
    if (!this.lastUpdateTime) return false;
    const now = new Date();
    const timeDiff = now.getTime() - this.lastUpdateTime.getTime();
    return timeDiff < this.CACHE_DURATION;
  }

  // Obtenir les données du dashboard (avec cache)
  getDashboardData(forceRefresh: boolean = false): Observable<DashboardData> {
    console.log('🗄️ getDashboardData appelé, forceRefresh:', forceRefresh);
    
    // Vérifier l'authentification avant tout
    if (!this.authService.isAuthenticated()) {
      console.log('❌ Utilisateur non authentifié, impossible de charger les données');
      this.clearCache();
      return of({
        clients: [],
        comptes: [],
        transactions: [],
        clientsCount: 0,
        comptesCount: 0,
        transactionsCount: 0,
        totalSolde: 0,
        lastUpdated: new Date()
      });
    }
    
    // Si on a des données en cache et qu'elles sont valides, les retourner
    const currentData = this.getCurrentCachedData();
    if (!forceRefresh && currentData && this.isCacheValid()) {
      console.log('✅ Données en cache valides, retour immédiat');
      return of(currentData);
    }

    // Si on est déjà en train de charger, retourner les données actuelles si disponibles
    if (this.isLoadingSubject.value && currentData) {
      console.log('⏳ Chargement en cours, retour des données actuelles');
      return of(currentData);
    }

    // Sinon, charger les données fraîches
    console.log('🔄 Chargement de nouvelles données...');
    return this.loadFreshData();
  }

  // Charger les données fraîches depuis l'API
  private loadFreshData(): Observable<DashboardData> {
    console.log('🔄 loadFreshData - DÉBUT');
    this.isLoadingSubject.next(true);

    return new Observable(observer => {
      if (!this.authService.isAuthenticated()) {
        console.log('❌ Utilisateur non authentifié');
        this.isLoadingSubject.next(false);
        observer.error('Non authentifié');
        return;
      }

      let clients: Client[] = [];
      let comptes: Compte[] = [];
      let transactions: Transaction[] = [];
      let completedRequests = 0;
      let hasErrors = false;
      const totalRequests = 2; // clients et comptes

      const checkCompletion = () => {
        completedRequests++;
        console.log(`📊 Requêtes terminées: ${completedRequests}/${totalRequests}`);
        
        if (completedRequests >= totalRequests) {
          if (hasErrors) {
            console.log('⚠️ Certaines données n\'ont pas pu être chargées');
          }
          
          // Charger les transactions après avoir les comptes
          this.loadTransactionsForComptes(comptes).then(allTransactions => {
            transactions = allTransactions;
            
            const dashboardData: DashboardData = {
              clients,
              comptes,
              transactions,
              clientsCount: clients.length,
              comptesCount: comptes.length,
              transactionsCount: transactions.length,
              totalSolde: comptes.reduce((total, compte) => total + (compte.solde || 0), 0),
              lastUpdated: new Date()
            };

            console.log('✅ Données complètes chargées:', dashboardData);
            this.dashboardDataSubject.next(dashboardData);
            this.lastUpdateTime = new Date();
            this.isLoadingSubject.next(false);
            
            observer.next(dashboardData);
            observer.complete();
          }).catch(err => {
            console.error('❌ Erreur chargement transactions:', err);
            // Même en cas d'erreur sur les transactions, on retourne les autres données
            const dashboardData: DashboardData = {
              clients,
              comptes,
              transactions: [],
              clientsCount: clients.length,
              comptesCount: comptes.length,
              transactionsCount: 0,
              totalSolde: comptes.reduce((total, compte) => total + (compte.solde || 0), 0),
              lastUpdated: new Date()
            };
            
            this.dashboardDataSubject.next(dashboardData);
            this.lastUpdateTime = new Date();
            this.isLoadingSubject.next(false);
            
            observer.next(dashboardData);
            observer.complete();
          });
        }
      };

      // Charger les clients
      this.clientService.getAll().subscribe({
        next: (clientsData) => {
          console.log('✅ Clients chargés:', clientsData.length);
          clients = clientsData;
          checkCompletion();
        },
        error: (err) => {
          console.error('❌ Erreur clients:', err);
          hasErrors = true;
          clients = [];
          
          // Vérifier si c'est une erreur d'authentification
          if (err.status === 401 || err.status === 403) {
            console.log('❌ Erreur d\'authentification détectée');
            this.isLoadingSubject.next(false);
            observer.error('Erreur d\'authentification');
            return;
          }
          
          checkCompletion();
        }
      });

      // Charger les comptes
      this.compteService.getAll().subscribe({
        next: (comptesData) => {
          console.log('✅ Comptes chargés:', comptesData.length);
          comptes = comptesData;
          checkCompletion();
        },
        error: (err) => {
          console.error('❌ Erreur comptes:', err);
          hasErrors = true;
          comptes = [];
          
          // Vérifier si c'est une erreur d'authentification
          if (err.status === 401 || err.status === 403) {
            console.log('❌ Erreur d\'authentification détectée');
            this.isLoadingSubject.next(false);
            observer.error('Erreur d\'authentification');
            return;
          }
          
          checkCompletion();
        }
      });
    });
  }

  // Charger les transactions pour tous les comptes
  private async loadTransactionsForComptes(comptes: Compte[]): Promise<Transaction[]> {
    console.log('💳 Chargement transactions pour', comptes.length, 'comptes');
    
    if (comptes.length === 0) {
      return [];
    }

    try {
      const transactionPromises = comptes.map(compte =>
        this.transactionService.getByCompte(compte.numeroCompte).toPromise()
          .catch(err => {
            console.error(`❌ Erreur transactions compte ${compte.numeroCompte}:`, err);
            return [];
          })
      );

      const results = await Promise.all(transactionPromises);
      const allTransactions = results
        .filter(t => t !== undefined && Array.isArray(t))
        .flat() as Transaction[];

      // Trier par date (plus récentes en premier)
      allTransactions.sort((a, b) => {
        const dateA = a.dateTransaction ? new Date(a.dateTransaction).getTime() : 0;
        const dateB = b.dateTransaction ? new Date(b.dateTransaction).getTime() : 0;
        return dateB - dateA;
      });

      console.log('✅ Total transactions chargées:', allTransactions.length);
      return allTransactions;
    } catch (err) {
      console.error('❌ Erreur lors du chargement des transactions:', err);
      return [];
    }
  }

  // Forcer le rechargement des données
  refreshData(): Observable<DashboardData> {
    console.log('🔄 Actualisation forcée des données');
    return this.getDashboardData(true);
  }

  // Obtenir les données actuelles du cache (synchrone)
  getCurrentCachedData(): DashboardData | null {
    return this.dashboardDataSubject.value;
  }

  // Obtenir les clients depuis le cache
  getClients(): Client[] {
    const data = this.getCurrentCachedData();
    return data ? data.clients : [];
  }

  // Obtenir les comptes depuis le cache
  getComptes(): Compte[] {
    const data = this.getCurrentCachedData();
    return data ? data.comptes : [];
  }

  // Obtenir les transactions depuis le cache
  getTransactions(): Transaction[] {
    const data = this.getCurrentCachedData();
    return data ? data.transactions : [];
  }

  // Vider le cache (utile lors de la déconnexion)
  clearCache(): void {
    console.log('🗑️ Cache vidé');
    this.dashboardDataSubject.next(null);
    this.lastUpdateTime = null;
    this.isLoadingSubject.next(false);
  }

  // Obtenir l'état de chargement
  isLoading(): boolean {
    return this.isLoadingSubject.value;
  }
}