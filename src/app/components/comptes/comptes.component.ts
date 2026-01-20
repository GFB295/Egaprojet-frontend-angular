import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompteService, Compte } from '../../services/compte.service';
import { ClientService, Client } from '../../services/client.service';

@Component({
  selector: 'app-comptes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comptes.component.html',
  styleUrls: ['./comptes.component.css']
})
export class ComptesComponent implements OnInit {
  comptes: Compte[] = [];
  clients: Client[] = [];
  showForm: boolean = false;
  selectedClientId: string | null = null;
  selectedType: 'COURANT' | 'EPARGNE' = 'COURANT';
  errorMessage: string = '';

  constructor(
    private compteService: CompteService,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.loadComptes();
    this.loadClients();
  }

  loadComptes(): void {
    this.compteService.getAll().subscribe({
      next: (comptes) => {
        this.comptes = comptes;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des comptes';
      }
    });
  }

  loadClients(): void {
    this.clientService.getAll().subscribe({
      next: (clients) => {
        this.clients = clients;
      }
    });
  }

  openAddForm(): void {
    this.selectedClientId = null;
    this.selectedType = 'COURANT';
    this.showForm = true;
    this.errorMessage = '';
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedClientId = null;
    this.errorMessage = '';
  }

  createCompte(): void {
    if (this.selectedClientId) {
      this.compteService.create(this.selectedClientId, this.selectedType).subscribe({
        next: () => {
          this.loadComptes();
          this.closeForm();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création du compte';
        }
      });
    }
  }

  deleteCompte(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) {
      this.compteService.delete(id).subscribe({
        next: () => {
          this.loadComptes();
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors de la suppression';
        }
      });
    }
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
}
