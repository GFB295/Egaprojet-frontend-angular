import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  console.log('🔐 Auth Interceptor - URL:', req.url);
  
  // Contourner l'intercepteur si header spécial présent
  if (req.headers.has('X-Skip-Interceptor')) {
    console.log('🚨 URGENCE - Contournement intercepteur détecté');
    // Supprimer le header personnalisé avant d'envoyer la requête
    const cleanReq = req.clone({
      headers: req.headers.delete('X-Skip-Interceptor')
    });
    return next(cleanReq);
  }
  
  const token = authService.getToken();
  console.log('🔐 Auth Interceptor - Token présent:', !!token);

  // Ajouter le token si disponible
  if (token) {
    console.log('🔐 Auth Interceptor - Ajout du token à la requête');
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    console.log('⚠️ Auth Interceptor - Aucun token disponible');
  }

  // Gérer les erreurs d'authentification
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('🔐 Auth Interceptor - Erreur détectée:', error.status, error.message);
      
      if (error.status === 401 || error.status === 403) {
        console.log('🔐 Auth Interceptor - Erreur d\'authentification, déconnexion');
        // Éviter les boucles infinies en vérifiant si on n'est pas déjà sur la page de login
        if (!req.url.includes('/login') && !req.url.includes('/register')) {
          authService.handleUnauthorized();
        }
      }
      
      // Logs détaillés pour le debugging
      if (error.status === 0) {
        console.error('🔐 Erreur réseau - Backend inaccessible');
      } else if (error.status >= 500) {
        console.error('🔐 Erreur serveur:', error.status);
      }
      
      return throwError(() => error);
    })
  );
};
