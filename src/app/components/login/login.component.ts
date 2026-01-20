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
    
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Rediriger selon le rôle
        if (response.role === 'ROLE_ADMIN') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/profil']);
        }
      },
      error: (err) => {
        this.isLoading = false;
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
