import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { CompteService, Compte } from '../../services/compte.service';
import { TransactionService, Transaction } from '../../services/transaction.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css']
})
export class ProfilComponent implements OnInit {
  client: Client | null = null;
  comptes: Compte[] = [];
  recentTransactions: Transaction[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    public authService: AuthService,
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.loadClientData();
  }

  loadClientData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.clientId) {
      this.errorMessage = 'Aucune information client disponible';
      this.isLoading = false;
      return;
    }

    this.clientService.getById(currentUser.clientId).subscribe({
      next: (client) => {
        this.client = client;
        this.loadComptes();
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des données client';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadComptes(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.clientId) {
      this.isLoading = false;
      return;
    }

    this.compteService.getByClientId(currentUser.clientId).subscribe({
      next: (comptes) => {
        this.comptes = comptes;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des comptes';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
