import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ Auth Guard - Vérification de l\'authentification');
  
  if (authService.isAuthenticated()) {
    console.log('🛡️ Auth Guard - Utilisateur authentifié, accès autorisé');
    return true;
  } else {
    console.log('🛡️ Auth Guard - Utilisateur non authentifié, redirection vers login');
    router.navigate(['/login']);
    return false;
  }
};

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ Admin Guard - Vérification des droits admin');
  
  if (authService.isAuthenticated() && authService.isAdmin()) {
    console.log('🛡️ Admin Guard - Utilisateur admin, accès autorisé');
    return true;
  } else {
    console.log('🛡️ Admin Guard - Accès refusé, redirection');
    router.navigate(['/dashboard']);
    return false;
  }
};