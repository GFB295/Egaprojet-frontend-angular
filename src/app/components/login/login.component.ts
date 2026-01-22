import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    // Marquer tous les champs comme touchés si le formulaire est invalide
    if (!this.loginForm.valid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    
    const loginData = this.loginForm.value;
    console.log('🚨 URGENCE - Tentative de connexion:', loginData);
    console.log('🚨 DEBUG - Username:', JSON.stringify(loginData.username));
    console.log('🚨 DEBUG - Password:', JSON.stringify(loginData.password));
    console.log('🚨 DEBUG - Username length:', loginData.username?.length);
    console.log('🚨 DEBUG - Password length:', loginData.password?.length);
    
    // Utiliser le service AuthService au lieu d'un appel HTTP direct
    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('🚨 URGENCE - Connexion réussie:', response);
        this.isLoading = false;
        
        // Redirection selon le rôle
        if (response.role === 'ROLE_ADMIN') {
          console.log('👑 ADMIN - Redirection dashboard');
          this.router.navigate(['/dashboard']).then(success => {
            if (success) {
              console.log('✅ Navigation router réussie');
            } else {
              console.log('❌ Router échoué, problème de route');
              console.log('🔍 Routes disponibles:', this.router.config);
            }
          }).catch(err => {
            console.error('❌ Erreur navigation:', err);
          });
        } else {
          console.log('👤 CLIENT - Redirection interface client');
          this.router.navigate(['/profil']).then(success => {
            if (success) {
              console.log('✅ Navigation router réussie vers profil');
            } else {
              console.log('❌ Router échoué, problème de route');
              console.log('🔍 Routes disponibles:', this.router.config);
            }
          }).catch(err => {
            console.error('❌ Erreur navigation:', err);
          });
        }
      },
      error: (err) => {
        console.error('🚨 URGENCE - Erreur connexion:', err);
        console.error('🚨 DEBUG - Error details:', JSON.stringify(err, null, 2));
        this.isLoading = false;
        
        if (err.message.includes('contacter le serveur')) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 8080.';
        } else if (err.message.includes('Identifiants incorrects') || err.message.includes('Bad credentials')) {
          this.errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect.';
        } else {
          this.errorMessage = err.message || 'Erreur lors de la connexion';
        }
      }
    });
  }
}
