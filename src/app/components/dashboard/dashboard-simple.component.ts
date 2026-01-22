import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-simple',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>📊 DASHBOARD ADMIN</h1>
      
      <div style="border: 2px solid #dc3545; padding: 15px; margin: 10px 0; background: #fff8f8;">
        <h3>✅ PAGE DASHBOARD CHARGÉE</h3>
        <p>Cette page s'affiche correctement !</p>
        <div>Utilisateur: {{ currentUser?.username || 'Non défini' }}</div>
        <div>Rôle: {{ currentUser?.role || 'Non défini' }}</div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
        <div style="border: 1px solid #007bff; padding: 15px; background: #f0f8ff; text-align: center;">
          <h3>👥 Clients</h3>
          <div style="font-size: 2em; color: #007bff;">25</div>
          <small>Clients actifs</small>
        </div>
        <div style="border: 1px solid #28a745; padding: 15px; background: #f8fff8; text-align: center;">
          <h3>🏦 Comptes</h3>
          <div style="font-size: 2em; color: #28a745;">48</div>
          <small>Comptes ouverts</small>
        </div>
        <div style="border: 1px solid #ffc107; padding: 15px; background: #fffbf0; text-align: center;">
          <h3>💳 Transactions</h3>
          <div style="font-size: 2em; color: #ffc107;">156</div>
          <small>Ce mois</small>
        </div>
        <div style="border: 1px solid #17a2b8; padding: 15px; background: #f0f8ff; text-align: center;">
          <h3>💰 Solde Total</h3>
          <div style="font-size: 2em; color: #17a2b8;">€125,450</div>
          <small>Tous comptes</small>
        </div>
      </div>

      <div style="border: 1px solid #6c757d; padding: 15px; margin: 10px 0; background: #f8f9fa;">
        <h3>🔗 Navigation Admin</h3>
        <button routerLink="/clients" style="padding: 10px; margin: 5px; background: #007bff; color: white; border: none;">
          Gérer Clients
        </button>
        <button routerLink="/comptes" style="padding: 10px; margin: 5px; background: #28a745; color: white; border: none;">
          Gérer Comptes
        </button>
        <button routerLink="/transactions" style="padding: 10px; margin: 5px; background: #ffc107; color: black; border: none;">
          Voir Transactions
        </button>
        <button (click)="logout()" style="padding: 10px; margin: 5px; background: #dc3545; color: white; border: none;">
          Déconnexion
        </button>
      </div>
    </div>
  `
})
export class DashboardSimpleComponent implements OnInit {
  currentUser: any = null;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    console.log('✅ DashboardSimpleComponent chargé avec succès');
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur actuel:', this.currentUser);
  }

  logout() {
    this.authService.logout();
  }
}