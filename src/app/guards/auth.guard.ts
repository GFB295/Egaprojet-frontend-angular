import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  console.log('🛡️ Auth Guard - Vérification de l\'authentification');
  console.log('🛡️ Auth Guard - URL actuelle:', router.url);
  
  // Ne pas vérifier l'authentification côté serveur
  if (!isPlatformBrowser(platformId)) {
    console.log('🛡️ Auth Guard - Côté serveur, autorisation par défaut');
    return true;
  }
  
  // Permettre l'accès à /profil même sans authentification (mode démo)
  if (router.url === '/profil' || router.url.startsWith('/profil')) {
    console.log('🛡️ Auth Guard - ✅ Accès profil autorisé (mode démo possible)');
    return true;
  }
  
  // Forcer la réinitialisation de l'auth si nécessaire
  authService.reinitializeAuth();
  
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const token = authService.getToken();
  
  console.log('🛡️ Auth Guard - Authentifié:', isAuthenticated);
  console.log('🛡️ Auth Guard - User présent:', !!currentUser);
  console.log('🛡️ Auth Guard - Token présent:', !!token);
  console.log('🛡️ Auth Guard - User details:', currentUser);
  
  if (isAuthenticated && currentUser && token) {
    console.log('🛡️ Auth Guard - ✅ Utilisateur authentifié, accès autorisé');
    return true;
  } else {
    console.log('🛡️ Auth Guard - ❌ Utilisateur non authentifié, redirection vers login');
    console.log('🛡️ Auth Guard - Détails du problème:');
    console.log('  - isAuthenticated():', isAuthenticated);
    console.log('  - currentUser:', currentUser);
    console.log('  - token:', token ? 'présent' : 'absent');
    
    // Vérifier localStorage seulement côté browser
    if (isPlatformBrowser(platformId)) {
      console.log('  - localStorage token:', localStorage.getItem('token') ? 'présent' : 'absent');
      console.log('  - localStorage user:', localStorage.getItem('currentUser') ? 'présent' : 'absent');
    }
    
    router.navigate(['/login']);
    return false;
  }
};