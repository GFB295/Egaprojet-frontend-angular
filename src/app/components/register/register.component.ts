import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      dateNaissance: ['', [Validators.required]],
      sexe: ['', [Validators.required, Validators.pattern(/^[MF]$/)]],
      adresse: ['', [Validators.required]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
      courriel: ['', [Validators.required, Validators.email]],
      nationalite: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (!this.registerForm.valid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;
    
    // Préparer les données pour l'envoi
    const formData = { ...this.registerForm.value };
    
    console.log('🚨 URGENCE - Inscription client:', formData);
    
    // Utiliser le service AuthService au lieu d'un appel HTTP direct
    this.authService.register(formData).subscribe({
      next: (response) => {
        console.log('🚨 URGENCE - Inscription réussie:', response);
        this.isLoading = false;
        this.successMessage = 'Inscription réussie ! Redirection en cours...';
        
        console.log('🚨 URGENCE - Redirection vers profil...');
        
        // Redirection selon le rôle
        setTimeout(() => {
          if (response.role === 'ROLE_ADMIN') {
            this.router.navigate(['/dashboard']).then(success => {
              if (success) {
                console.log('✅ Navigation admin réussie');
              } else {
                console.log('❌ Échec navigation admin');
              }
            });
          } else {
            this.router.navigate(['/profil']).then(success => {
              if (success) {
                console.log('✅ Navigation client réussie');
              } else {
                console.log('❌ Échec navigation client');
              }
            });
          }
        }, 1000);
      },
      error: (err) => {
        console.error('🚨 URGENCE - Erreur inscription:', err);
        this.isLoading = false;
        this.successMessage = '';
        
        if (err.message.includes('contacter le serveur')) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 8080.';
        } else if (err.message.includes('existe déjà')) {
          this.errorMessage = 'Un compte avec ce nom d\'utilisateur ou cette adresse email existe déjà.';
        } else {
          this.errorMessage = err.message || 'Erreur lors de l\'inscription. Veuillez réessayer.';
        }
      }
    });
  }
}
