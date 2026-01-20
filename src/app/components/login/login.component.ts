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

  onSubmit(): void {
    console.log('Login onSubmit appelé !', {
      valid: this.loginForm.valid,
      value: this.loginForm.value,
      errors: this.loginForm.errors,
      controls: Object.keys(this.loginForm.controls).reduce((acc, key) => {
        const control = this.loginForm.get(key);
        acc[key] = {
          valid: control?.valid,
          errors: control?.errors,
          value: control?.value
        };
        return acc;
      }, {} as any)
    });

    // Marquer tous les champs comme touchés si le formulaire est invalide
    if (!this.loginForm.valid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.errorMessage = '';
    console.log('Appel de authService.login...');
    
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('✅ Login réussi ! Réponse:', response);
        console.log('Redirection vers /dashboard...');
        this.router.navigate(['/dashboard']).then(
          (success) => {
            console.log('✅ Navigation réussie:', success);
          },
          (error) => {
            console.error('❌ Erreur de navigation:', error);
            this.errorMessage = 'Connexion réussie mais erreur de redirection';
          }
        );
      },
      error: (err) => {
        console.error('❌ Erreur login:', err);
        console.error('Status:', err.status);
        console.error('Status Text:', err.statusText);
        console.error('Message:', err.message);
        console.error('Error body:', err.error);
        
        if (err.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré.';
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = err.message || 'Erreur lors de la connexion';
        }
      }
    });
  }
}
