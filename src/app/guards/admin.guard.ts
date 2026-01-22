import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  console.log('🛡️ Admin Guard - Vérification des droits admin');
  
  // Ne pas vérifier côté serveur
  if (!isPlatformBrowser(platformId)) {
    console.log('🛡️ Admin Guard - Côté serveur, autorisation par défaut');
    return true;
  }
  
  // Forcer la réinitialisation de l'auth si nécessaire
  authService.reinitializeAuth();
  
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();
  const currentUser = authService.getCurrentUser();
  
  console.log('🛡️ Admin Guard - Authentifié:', isAuthenticated, 'Admin:', isAdmin, 'Role:', currentUser?.role);
  
  if (isAuthenticated && isAdmin && currentUser) {
    console.log('🛡️ Admin Guard - Utilisateur admin, accès autorisé');
    return true;
  } else if (isAuthenticated && !isAdmin) {
    console.log('🛡️ Admin Guard - Utilisateur client, redirection vers profil');
    router.navigate(['/profil']);
    return false;
  } else {
    console.log('🛡️ Admin Guard - Non authentifié, redirection vers login');
    router.navigate(['/login']);
    return false;
  }
};
