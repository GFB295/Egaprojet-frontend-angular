import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StableDataService, StableClientData } from '../../services/stable-data.service';
import { Transaction } from '../../services/transaction.service';

@Component({
  selector: 'app-transactions-stable',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="transactions-container">
      <div class="header">
        <h2>Historique des Transactions</h2>
        <div class="header-actions">
          <select [(ngModel)]="filterType" (change)="applyFilters()" class="filter-select">
            <option value="">Tous les types</option>
            <option value="DEPOT">Dépôts</option>
            <option value="RETRAIT">Retraits</option>
            <option value="VIREMENT">Virements</option>
          </select>
          <button class="btn-refresh" (click)="refreshData()" [disabled]="isLoading">
            {{ isLoading ? 'Chargement...' : 'Actualiser' }}
          </button>
        </div>
      </div>

      <div class="stats-cards" *ngIf="transactions.length > 0">
        <div class="stat-card">
          <h3>Total Transactions</h3>
          <span class="stat-value">{{ filteredTransactions.length }}</span>
        </div>
        <div class="stat-card">
          <h3>Dépôts</h3>
          <span class="stat-value positive">{{ getTransactionsByType('DEPOT').length }}</span>
        </div>
        <div class="stat-card">
          <h3>Retraits</h3>
          <span class="stat-value negative">{{ getTransactionsByType('RETRAIT').length }}</span>
        </div>
        <div class="stat-card">
          <h3>Virements</h3>
          <span class="stat-value neutral">{{ getTransactionsByType('VIREMENT').length }}</span>
        </div>
      </div>

      <div class="transactions-list" *ngIf="filteredTransactions.length > 0">
        <div class="transaction-item" 
             *ngFor="let transaction of paginatedTransactions" 
             [class]="getTransactionClass(transaction.typeTransaction)">
          
          <div class="transaction-icon">
            <i [class]="getTransactionIcon(transaction.typeTransaction)"></i>
          </div>
          
          <div class="transaction-details">
            <div class="transaction-main">
              <h4>{{ getTransactionTypeLabel(transaction.typeTransaction) }}</h4>
              <span class="transaction-amount" 
                    [class]="getAmountClass(transaction.typeTransaction)">
                {{ formatAmount(transaction.montant, transaction.typeTransaction) }}
              </span>
            </div>
            
            <div class="transaction-meta">
              <span class="transaction-date">{{ formatDateTime(transaction.dateTransaction) }}</span>
              <span class="transaction-account">{{ formatAccountNumber(transaction.compteNumero) }}</span>
            </div>
            
            <div class="transaction-description" *ngIf="transaction.description">
              {{ transaction.description }}
            </div>
            
            <div class="transaction-balance" *ngIf="transaction.soldeApres !== undefined">
              Solde après : {{ formatCurrency(transaction.soldeApres) }}
            </div>
          </div>
        </div>
      </div>

      <div class="pagination" *ngIf="totalPages > 1">
        <button class="btn-page" 
                (click)="goToPage(currentPage - 1)" 
                [disabled]="currentPage === 1">
          Précédent
        </button>
        
        <span class="page-info">
          Page {{ currentPage }} sur {{ totalPages }}
        </span>
        
        <button class="btn-page" 
                (click)="goToPage(currentPage + 1)" 
                [disabled]="currentPage === totalPages">
          Suivant
        </button>
      </div>

      <div class="empty-state" *ngIf="filteredTransactions.length === 0 && !isLoading">
        <h3>Aucune transaction trouvée</h3>
        <p *ngIf="filterType">Aucune transaction de type "{{ getTransactionTypeLabel(filterType) }}" trouvée.</p>
        <p *ngIf="!filterType">Vous n'avez pas encore effectué de transactions.</p>
        <button class="btn-primary" routerLink="/profil">Effectuer une transaction</button>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Chargement de vos transactions...</p>
      </div>
    </div>
  `,
  styles: [`
    .transactions-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header h2 {
      color: #2c3e50;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 5px;
      background: white;
    }

    .btn-refresh {
      padding: 10px 20px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #2980b9;
    }

    .btn-refresh:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }

    .stat-card h3 {
      color: #7f8c8d;
      font-size: 14px;
      margin: 0 0 10px 0;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }

    .stat-value.positive { color: #27ae60; }
    .stat-value.negative { color: #e74c3c; }
    .stat-value.neutral { color: #f39c12; }

    .transactions-list {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
      margin-bottom: 20px;
    }

    .transaction-item {
      display: flex;
      align-items: flex-start;
      padding: 20px;
      border-bottom: 1px solid #ecf0f1;
      transition: background 0.3s;
    }

    .transaction-item:last-child {
      border-bottom: none;
    }

    .transaction-item:hover {
      background: #f8f9fa;
    }

    .transaction-item.depot {
      border-left: 4px solid #27ae60;
    }

    .transaction-item.retrait {
      border-left: 4px solid #e74c3c;
    }

    .transaction-item.virement {
      border-left: 4px solid #f39c12;
    }

    .transaction-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      font-size: 20px;
      color: white;
    }

    .transaction-item.depot .transaction-icon {
      background: #27ae60;
    }

    .transaction-item.retrait .transaction-icon {
      background: #e74c3c;
    }

    .transaction-item.virement .transaction-icon {
      background: #f39c12;
    }

    .transaction-details {
      flex: 1;
    }

    .transaction-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .transaction-main h4 {
      color: #2c3e50;
      margin: 0;
      font-size: 16px;
    }

    .transaction-amount {
      font-size: 18px;
      font-weight: bold;
    }

    .transaction-amount.positive { color: #27ae60; }
    .transaction-amount.negative { color: #e74c3c; }
    .transaction-amount.neutral { color: #f39c12; }

    .transaction-meta {
      display: flex;
      gap: 20px;
      margin-bottom: 5px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .transaction-description {
      font-size: 14px;
      color: #2c3e50;
      margin-bottom: 5px;
    }

    .transaction-balance {
      font-size: 12px;
      color: #7f8c8d;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 20px;
    }

    .btn-page {
      padding: 8px 16px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-page:hover:not(:disabled) {
      background: #2980b9;
    }

    .btn-page:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .page-info {
      color: #7f8c8d;
      font-weight: 500;
    }

    .empty-state, .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #ecf0f1;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .btn-primary {
      padding: 12px 24px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.3s;
    }

    .btn-primary:hover {
      background: #2980b9;
    }
  `]
})
export class TransactionsStableComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];
  isLoading: boolean = false;
  filterType: string = '';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  
  private dataSubscription?: Subscription;

  constructor(private stableDataService: StableDataService) {}

  ngOnInit(): void {
    console.log('TransactionsStableComponent: Initialisation...');
    
    // S'abonner aux données stables
    this.dataSubscription = this.stableDataService.clientData$.subscribe(
      (data: StableClientData) => {
        console.log('TransactionsStableComponent: Données reçues:', data.allTransactions.length, 'transactions');
        this.transactions = data.allTransactions;
        this.isLoading = data.isLoading;
        this.applyFilters();
      }
    );
    
    // Charger les données si nécessaire
    this.stableDataService.loadStableData();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  refreshData(): void {
    console.log('TransactionsStableComponent: Actualisation des données...');
    this.stableDataService.refreshData();
  }

  applyFilters(): void {
    this.filteredTransactions = this.transactions.filter(transaction => {
      if (this.filterType && transaction.typeTransaction !== this.filterType) {
        return false;
      }
      return true;
    });
    
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTransactions = this.filteredTransactions.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getTransactionsByType(type: string): Transaction[] {
    return this.transactions.filter(t => t.typeTransaction === type);
  }

  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'DEPOT': 'Dépôt',
      'RETRAIT': 'Retrait',
      'VIREMENT': 'Virement'
    };
    return labels[type] || type;
  }

  getTransactionClass(type: string): string {
    return type.toLowerCase();
  }

  getTransactionIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'DEPOT': '↓',
      'RETRAIT': '↑',
      'VIREMENT': '→'
    };
    return icons[type] || '•';
  }

  getAmountClass(type: string): string {
    const classes: { [key: string]: string } = {
      'DEPOT': 'positive',
      'RETRAIT': 'negative',
      'VIREMENT': 'neutral'
    };
    return classes[type] || '';
  }

  formatAmount(amount: number, type: string): string {
    const prefix = type === 'DEPOT' ? '+' : type === 'RETRAIT' ? '-' : '';
    return prefix + this.formatCurrency(amount);
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  }

  formatDateTime(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatAccountNumber(accountNumber: string | undefined): string {
    if (!accountNumber) return '';
    // Afficher seulement les 4 derniers chiffres
    return '***' + accountNumber.slice(-4);
  }
}