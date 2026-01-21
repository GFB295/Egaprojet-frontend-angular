import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientService, Client } from '../../services/client.service';
import { CompteService, Compte } from '../../services/compte.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
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
  recentTransactions: Transaction[] = [];
  isLoading: boolean = true;
  private refreshSubscription?: Subscription;

  constructor(
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    // Rafraîchir automatiquement toutes les 5 secondes
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.loadDashboardData();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    
    // Charger le nombre de clients
    this.clientService.getAll().subscribe({
      next: (clients) => {
        this.clientsCount = clients.length;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des clients:', err);
      }
    });

    // Charger le nombre de comptes
    this.compteService.getAll().subscribe({
      next: (comptes) => {
        this.comptesCount = comptes.length;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des comptes:', err);
      }
    });

    // Charger toutes les transactions pour compter
    this.loadTransactionsCount();
  }

  loadTransactionsCount(): void {
    // Pour compter les transactions, on doit récupérer toutes les transactions de tous les comptes
    // On va utiliser une approche différente : compter les transactions via les comptes
    this.compteService.getAll().subscribe({
      next: (comptes) => {
        if (comptes.length === 0) {
          this.transactionsCount = 0;
          this.isLoading = false;
          return;
        }

        // Charger les transactions pour chaque compte
        const transactionPromises = comptes.map(compte =>
          this.transactionService.getByCompte(compte.numeroCompte).toPromise()
        );

        Promise.all(transactionPromises).then(results => {
          const allTransactions = results
            .filter(t => t !== undefined)
            .flat() as Transaction[];
          
          this.transactionsCount = allTransactions.length;
          
          // Trier et prendre les 5 dernières transactions
          allTransactions.sort((a, b) => {
            const dateA = a.dateTransaction ? new Date(a.dateTransaction).getTime() : 0;
            const dateB = b.dateTransaction ? new Date(b.dateTransaction).getTime() : 0;
            return dateB - dateA;
          });
          
          this.recentTransactions = allTransactions.slice(0, 5);
          this.isLoading = false;
        }).catch(err => {
          console.error('Erreur lors du chargement des transactions:', err);
          this.isLoading = false;
        });
      },
      error: (err) => {
        console.error('Erreur lors du chargement des comptes:', err);
        this.isLoading = false;
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
