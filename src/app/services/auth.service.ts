import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError, timer } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
  adresse: string;
  telephone: string;
  courriel: string;
  nationalite: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  userId: string;
  username: string;
  clientId: string | null;
  role: string;
  expiresIn?: number; // Durée en secondes
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenExpirationTimer?: any;
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes avant expiration

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeAuthState();
    }
  }

  private initializeAuthState(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('currentUser');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    
    if (token && userStr && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      const now = Date.now();
      
      if (now < expiryTime) {
        console.log('🔐 Token valide trouvé, restauration de la session');
        this.currentUserSubject.next(JSON.parse(userStr));
        this.scheduleTokenRefresh(expiryTime - now);
      } else {
        console.log('🔐 Token expiré, nettoyage');
        this.clearAuthData();
      }
    }
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap(response => {
        this.setAuthData(response);
      }),
      catchError(this.handleAuthError.bind(this))
    );
  }

  login(request: AuthRequest): Observable<AuthResponse> {
    console.log('🔐 Tentative de connexion pour:', request.username);
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => {
        console.log('✅ Connexion réussie:', response.username, response.role);
        this.setAuthData(response);
      }),
      catchError(this.handleAuthError.bind(this))
    );
  }

  logout(): void {
    console.log('🔐 Déconnexion utilisateur');
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      
      if (token && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        if (Date.now() < expiryTime) {
          return token;
        } else {
          console.log('🔐 Token expiré, nettoyage automatique');
          this.clearAuthData();
        }
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const isAuth = !!token;
    console.log('🔐 Vérification authentification:', isAuth);
    return isAuth;
  }

  getCurrentUser(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ROLE_ADMIN';
  }

  isClient(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ROLE_CLIENT' || !user?.role;
  }

  // Méthode pour gérer les erreurs 401/403
  handleUnauthorized(): void {
    console.log('🔐 Erreur 401/403 détectée, déconnexion forcée');
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  // Vérifier si le token expire bientôt
  isTokenExpiringSoon(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!tokenExpiry) return true;
    
    const expiryTime = parseInt(tokenExpiry);
    const timeUntilExpiry = expiryTime - Date.now();
    
    return timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD;
  }

  private setAuthData(response: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      // Calculer l'expiration (par défaut 24h si non spécifié)
      const expiresInMs = (response.expiresIn || 24 * 60 * 60) * 1000;
      const expiryTime = Date.now() + expiresInMs;
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response));
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      
      console.log('🔐 Données d\'authentification sauvegardées');
      console.log('🔐 Expiration prévue:', new Date(expiryTime).toLocaleString());
      
      this.scheduleTokenRefresh(expiresInMs - this.TOKEN_REFRESH_THRESHOLD);
    }
    this.currentUserSubject.next(response);
  }

  private clearAuthData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('tokenExpiry');
    }
    
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
    
    this.currentUserSubject.next(null);
  }

  private scheduleTokenRefresh(delayMs: number): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    
    if (delayMs > 0) {
      console.log('🔐 Programmation du refresh token dans', Math.round(delayMs / 1000 / 60), 'minutes');
      this.tokenExpirationTimer = setTimeout(() => {
        console.log('⚠️ Token expire bientôt, déconnexion préventive');
        this.logout();
      }, delayMs);
    }
  }

  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    console.error('🔐 Erreur d\'authentification:', error);
    
    let errorMessage = 'Erreur d\'authentification';
    
    if (error.status === 401) {
      errorMessage = 'Identifiants incorrects';
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé';
    } else if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
