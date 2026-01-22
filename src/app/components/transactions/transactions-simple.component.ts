import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-transactions-simple',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>💳 MES TRANSACTIONS</h1>
      
      <div style="border: 2px solid #17a2b8; padding: 15px; margin: 10px 0; background: #f0f8ff;">
        <h3>✅ PAGE TRANSACTIONS CHARGÉE</h3>
        <p>Cette page s'affiche correctement !</p>
        <div>Utilisateur: {{ currentUser?.username || 'Non défini' }}</div>
        <div>Rôle: {{ currentUser?.role || 'Non défini' }}</div>
      </div>

      <div style="border: 1px solid #28a745; padding: 15px; margin: 10px 0; background: #f8fff8;">
        <h3>📊 Transactions Récentes Simulées</h3>
        <div style="border: 1px solid #ccc; padding: 10px; margin: 5px;">
          <strong>Dépôt</strong> - 500.00 € - 22/01/2026 - Compte: 123456789
        </div>
        <div style="border: 1px solid #ccc; padding: 10px; margin: 5px;">
          <strong>Retrait</strong> - 150.00 € - 21/01/2026 - Compte: 123456789
        </div>
        <div style="border: 1px solid #ccc; padding: 10px; margin: 5px;">
          <strong>Virement</strong> - 200.00 € - 20/01/2026 - Vers: 987654321
        </div>
      </div>

      <div style="border: 1px solid #ffc107; padding: 15px; margin: 10px 0; background: #fffbf0;">
        <h3>⚡ Actions Rapides</h3>
        <button style="padding: 10px; margin: 5px; background: #28a745; color: white; border: none;">
          Nouveau Dépôt
        </button>
        <button style="padding: 10px; margin: 5px; background: #dc3545; color: white; border: none;">
          Nouveau Retrait
        </button>
        <button style="padding: 10px; margin: 5px; background: #007bff; color: white; border: none;">
          Nouveau Virement
        </button>
      </div>

      <div style="border: 1px solid #6c757d; padding: 15px; margin: 10px 0; background: #f8f9fa;">
        <h3>🔗 Navigation</h3>
        <button routerLink="/profil" style="padding: 10px; margin: 5px; background: #007bff; color: white; border: none;">
          Mon Profil
        </button>
        <button routerLink="/comptes" style="padding: 10px; margin: 5px; background: #28a745; color: white; border: none;">
          Mes Comptes
        </button>
        <button (click)="logout()" style="padding: 10px; margin: 5px; background: #dc3545; color: white; border: none;">
          Déconnexion
        </button>
      </div>
    </div>
  `
})
export class TransactionsSimpleComponent implements OnInit {
  currentUser: any = null;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    console.log('✅ TransactionsSimpleComponent chargé avec succès');
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur actuel:', this.currentUser);
  }

  logout() {
    this.authService.logout();
  }
}