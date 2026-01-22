import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profil-simple',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>👤 PROFIL CLIENT</h1>
      
      <div style="border: 2px solid #007bff; padding: 15px; margin: 10px 0; background: #f8f9fa;">
        <h3>✅ PAGE PROFIL CHARGÉE</h3>
        <p>Cette page s'affiche correctement !</p>
        <div>Utilisateur: {{ currentUser?.username || 'Non défini' }}</div>
        <div>Rôle: {{ currentUser?.role || 'Non défini' }}</div>
        <div>Client ID: {{ currentUser?.clientId || 'Non défini' }}</div>
      </div>

      <div style="border: 1px solid #28a745; padding: 15px; margin: 10px 0; background: #f8fff8;">
        <h3>🔗 Navigation</h3>
        <button routerLink="/comptes" style="padding: 10px; margin: 5px; background: #28a745; color: white; border: none;">
          Mes Comptes
        </button>
        <button routerLink="/transactions" style="padding: 10px; margin: 5px; background: #007bff; color: white; border: none;">
          Mes Transactions
        </button>
        <button (click)="logout()" style="padding: 10px; margin: 5px; background: #dc3545; color: white; border: none;">
          Déconnexion
        </button>
      </div>

      <div style="border: 1px solid #ffc107; padding: 15px; margin: 10px 0; background: #fffbf0;">
        <h3>📝 Informations</h3>
        <p>Cette version simplifiée du profil confirme que :</p>
        <ul>
          <li>✅ L'authentification fonctionne</li>
          <li>✅ La navigation fonctionne</li>
          <li>✅ Les guards autorisent l'accès</li>
          <li>✅ Le composant se charge correctement</li>
        </ul>
      </div>
    </div>
  `
})
export class ProfilSimpleComponent implements OnInit {
  currentUser: any = null;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    console.log('✅ ProfilSimpleComponent chargé avec succès');
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur actuel:', this.currentUser);
  }

  logout() {
    this.authService.logout();
  }
}