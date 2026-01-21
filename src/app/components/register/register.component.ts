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
      return;
    }

    this.errorMessage = '';
    
    // Préparer les données pour l'envoi
    const formData = { ...this.registerForm.value };
    
    console.log('📤 Envoi des données d\'inscription:', formData);
    
    this.authService.register(formData).subscribe({
      next: (response) => {
        console.log('✅ Inscription réussie ! Réponse:', response);
        // Rediriger selon le rôle (les nouveaux clients vont vers profil)
        if (response.role === 'ROLE_ADMIN') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/profil']);
        }
      },
      error: (err) => {
        console.error('❌ Erreur inscription:', err);
        console.error('Status:', err.status);
        console.error('Status Text:', err.statusText);
        console.error('Message:', err.message);
        console.error('Error body:', err.error);
        
        if (err.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 8080.';
        } else if (err.status === 400 && err.error) {
          // Erreurs de validation du backend
          if (typeof err.error === 'string') {
            this.errorMessage = err.error;
          } else if (err.error.message) {
            this.errorMessage = err.error.message;
          } else {
            // Erreurs de validation multiples
            const errorMessages = Object.values(err.error).join(', ');
            this.errorMessage = errorMessages || 'Erreur de validation';
          }
        } else {
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de l\'inscription';
        }
      }
    });
  }
}
