import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { StableDataService, StableClientData } from '../../services/stable-data.service';
import { Compte } from '../../services/compte.service';

@Component({
  selector: 'app-comptes-stable',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="comptes-container">
      <div class="header">
        <h2>Mes Comptes Bancaires</h2>
        <button class="btn-refresh" (click)="refreshData()" [disabled]="isLoading">
          {{ isLoading ? 'Chargement...' : 'Actualiser' }}
        </button>
      </div>

      <div class="comptes-grid" *ngIf="comptes.length > 0">
        <div class="compte-card" *ngFor="let compte of comptes">
          <div class="compte-header">
            <h3>{{ getCompteTypeLabel(compte.typeCompte) }}</h3>
            <span class="compte-status">Actif</span>
          </div>
          
          <div class="compte-details">
            <div class="compte-numero">
              <label>Numéro de compte :</label>
              <span>{{ compte.numeroCompte }}</span>
            </div>
            
            <div class="compte-solde">
              <label>Solde disponible :</label>
              <span class="solde-amount" [class.positive]="(compte.solde || 0) > 0">
                {{ formatCurrency(compte.solde) }}
              </span>
            </div>
            
            <div class="compte-date">
              <label>Date d'ouverture :</label>
              <span>{{ formatDate(compte.dateCreation) }}</span>
            </div>
          </div>
          
          <div class="compte-actions">
            <button class="btn-primary" routerLink="/profil">Voir détails</button>
            <button class="btn-secondary" (click)="downloadRIB(compte)">Télécharger RIB</button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="comptes.length === 0 && !isLoading">
        <h3>Aucun compte trouvé</h3>
        <p>Vous n'avez pas encore de compte bancaire.</p>
        <button class="btn-primary" routerLink="/profil">Créer un compte</button>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Chargement de vos comptes...</p>
      </div>

      <div class="summary-card" *ngIf="comptes.length > 0">
        <h3>Résumé</h3>
        <div class="summary-item">
          <span>Nombre de comptes :</span>
          <span>{{ comptes.length }}</span>
        </div>
        <div class="summary-item">
          <span>Solde total :</span>
          <span class="total-solde">{{ formatCurrency(getTotalSolde()) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comptes-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .header h2 {
      color: #2c3e50;
      margin: 0;
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

    .comptes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .compte-card {
      background: white;
      border-radius: 10px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-left: 4px solid #3498db;
    }

    .compte-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .compte-header h3 {
      color: #2c3e50;
      margin: 0;
    }

    .compte-status {
      background: #27ae60;
      color: white;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }

    .compte-details {
      margin-bottom: 20px;
    }

    .compte-details > div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .compte-details label {
      font-weight: 500;
      color: #7f8c8d;
    }

    .compte-details span {
      font-weight: 600;
      color: #2c3e50;
    }

    .solde-amount {
      font-size: 18px;
      font-weight: bold;
    }

    .solde-amount.positive {
      color: #27ae60;
    }

    .compte-actions {
      display: flex;
      gap: 10px;
    }

    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-secondary {
      background: #ecf0f1;
      color: #2c3e50;
    }

    .btn-secondary:hover {
      background: #d5dbdb;
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

    .summary-card {
      background: white;
      border-radius: 10px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-left: 4px solid #27ae60;
    }

    .summary-card h3 {
      color: #2c3e50;
      margin: 0 0 20px 0;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: 500;
    }

    .total-solde {
      font-size: 18px;
      font-weight: bold;
      color: #27ae60;
    }
  `]
})
export class ComptesStableComponent implements OnInit, OnDestroy {
  comptes: Compte[] = [];
  isLoading: boolean = false;
  private dataSubscription?: Subscription;

  constructor(private stableDataService: StableDataService) {}

  ngOnInit(): void {
    console.log('ComptesStableComponent: Initialisation...');
    
    // S'abonner aux données stables
    this.dataSubscription = this.stableDataService.clientData$.subscribe(
      (data: StableClientData) => {
        console.log('ComptesStableComponent: Données reçues:', data.comptes.length, 'comptes');
        this.comptes = data.comptes;
        this.isLoading = data.isLoading;
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
    console.log('ComptesStableComponent: Actualisation des données...');
    this.stableDataService.refreshData();
  }

  getCompteTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'COURANT': 'Compte Courant',
      'EPARGNE': 'Compte Épargne'
    };
    return labels[type] || type;
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  getTotalSolde(): number {
    return this.comptes.reduce((total, compte) => total + (compte.solde || 0), 0);
  }

  downloadRIB(compte: Compte): void {
    // Simuler le téléchargement d'un RIB
    const ribContent = `
RELEVÉ D'IDENTITÉ BANCAIRE
==========================

Titulaire du compte : ${this.stableDataService.getClient()?.prenom} ${this.stableDataService.getClient()?.nom}
Numéro de compte : ${compte.numeroCompte}
Type de compte : ${this.getCompteTypeLabel(compte.typeCompte)}
Date d'ouverture : ${this.formatDate(compte.dateCreation)}

EGA BANK
15 Avenue des Champs-Élysées
75008 Paris, France
    `;

    const blob = new Blob([ribContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RIB_${compte.typeCompte}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}