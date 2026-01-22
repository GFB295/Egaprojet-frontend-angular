import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-comptes-simple',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>🏦 MES COMPTES</h1>
      
      <div style="border: 2px solid #28a745; padding: 15px; margin: 10px 0; background: #f8fff8;">
        <h3>✅ PAGE COMPTES CHARGÉE</h3>
        <p>Cette page s'affiche correctement !</p>
        <div>Utilisateur: {{ currentUser?.username || 'Non défini' }}</div>
        <div>Rôle: {{ currentUser?.role || 'Non défini' }}</div>
      </div>

      <div style="border: 1px solid #007bff; padding: 15px; margin: 10px 0; background: #f0f8ff;">
        <h3>💳 Comptes Simulés</h3>
        <div style="border: 1px solid #ccc; padding: 10px; margin: 5px;">
          <strong>Compte Courant</strong><br>
          Numéro: 123456789<br>
          Solde: 1,250.00 €
        </div>
        <div style="border: 1px solid #ccc; padding: 10px; margin: 5px;">
          <strong>Compte Épargne</strong><br>
          Numéro: 987654321<br>
          Solde: 5,000.00 €
        </div>
      </div>

      <div style="border: 1px solid #6c757d; padding: 15px; margin: 10px 0; background: #f8f9fa;">
        <h3>🔗 Navigation</h3>
        <button routerLink="/profil" style="padding: 10px; margin: 5px; background: #007bff; color: white; border: none;">
          Mon Profil
        </button>
        <button routerLink="/transactions" style="padding: 10px; margin: 5px; background: #28a745; color: white; border: none;">
          Mes Transactions
        </button>
        <button (click)="logout()" style="padding: 10px; margin: 5px; background: #dc3545; color: white; border: none;">
          Déconnexion
        </button>
      </div>
    </div>
  `
})
export class ComptesSimpleComponent implements OnInit {
  currentUser: any = null;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    console.log('✅ ComptesSimpleComponent chargé avec succès');
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur actuel:', this.currentUser);
  }

  logout() {
    this.authService.logout();
  }
}