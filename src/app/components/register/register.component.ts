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
    console.log('=== onSubmit appelé ===');
    console.log('Formulaire valide:', this.registerForm.valid);
    console.log('Valeurs du formulaire:', this.registerForm.value);
    
    if (!this.registerForm.valid) {
      console.log('Formulaire invalide - Erreurs:', this.registerForm.errors);
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
          console.log(`Champ ${key} invalide:`, control.errors);
        }
      });
      return;
    }

    this.errorMessage = '';
    console.log('Appel de authService.register...');
    
    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        console.log('✅ Inscription réussie ! Réponse:', response);
        console.log('Redirection vers /dashboard...');
        this.router.navigate(['/dashboard']).then(
          (success) => {
            console.log('✅ Navigation réussie:', success);
          },
          (error) => {
            console.error('❌ Erreur de navigation:', error);
            this.errorMessage = 'Inscription réussie mais erreur de redirection';
          }
        );
      },
      error: (err) => {
        console.error('❌ Erreur inscription:', err);
        console.error('Status:', err.status);
        console.error('Status Text:', err.statusText);
        console.error('Message:', err.message);
        console.error('Error body:', err.error);
        
        if (err.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré.';
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = err.message || 'Erreur lors de l\'inscription';
        }
      }
    });
  }
}
