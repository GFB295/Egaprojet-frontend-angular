import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompteService, Compte } from '../../services/compte.service';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';

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
  successMessage: string = '';
  isAdmin: boolean = false;

  constructor(
    private compteService: CompteService,
    private clientService: ClientService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.loadComptes();
    if (this.isAdmin) {
      this.loadClients();
    }
  }

  loadComptes(): void {
    // getAll() retourne maintenant uniquement les comptes du client connecté (ou tous pour admin)
    this.compteService.getAll().subscribe({
      next: (comptes) => {
        this.comptes = comptes;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des comptes';
        console.error(err);
      }
    });
  }

  loadClients(): void {
    // Seuls les admins peuvent voir tous les clients
    if (this.isAdmin) {
      this.clientService.getAll().subscribe({
        next: (clients) => {
          this.clients = clients;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des clients:', err);
        }
      });
    }
  }

  openAddForm(): void {
    const currentUser = this.authService.getCurrentUser();
    // Si c'est un client, utiliser son ID directement
    if (!this.isAdmin && currentUser?.clientId) {
      this.selectedClientId = currentUser.clientId;
    } else {
      this.selectedClientId = null;
    }
    this.selectedType = 'COURANT';
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedClientId = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  createCompte(): void {
    const currentUser = this.authService.getCurrentUser();
    const clientId = this.isAdmin ? this.selectedClientId : (currentUser?.clientId || null);
    
    if (!clientId) {
      this.errorMessage = 'Impossible de déterminer le client';
      return;
    }

    this.compteService.create(clientId, this.selectedType).subscribe({
      next: () => {
        this.successMessage = `Compte ${this.selectedType === 'COURANT' ? 'Courant' : 'Épargne'} créé avec succès !`;
        // Recharger les comptes immédiatement
        this.loadComptes();
        setTimeout(() => {
          this.closeForm();
          this.successMessage = '';
        }, 2000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la création du compte';
        console.error(err);
      }
    });
  }

  deleteCompte(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) {
      this.compteService.delete(id).subscribe({
        next: () => {
          // Recharger immédiatement après suppression
          this.loadComptes();
          this.successMessage = 'Compte supprimé avec succès';
          setTimeout(() => {
            this.successMessage = '';
          }, 2000);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la suppression';
        }
      });
    }
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
}
