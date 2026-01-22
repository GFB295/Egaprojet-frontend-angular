import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError, timer, of } from 'rxjs';
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
  expiresIn?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Exposer le subject pour les corrections d'urgence
  public get currentUserSubjectPublic() { return this.currentUserSubject; }
  
  private tokenExpirationTimer?: any;
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes avant expiration
  private isInitialized = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🔐 AuthService constructor appelé');
    if (isPlatformBrowser(this.platformId)) {
      // Forcer l'initialisation immédiate
      setTimeout(() => {
        this.initializeAuthState();
      }, 0);
    }
  }

  private initializeAuthState(): void {
    if (this.isInitialized || !isPlatformBrowser(this.platformId)) return;
    
    console.log('🔐 Initialisation AuthService...');
    
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('currentUser');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    
    console.log('🔐 Données localStorage:');
    console.log('  - Token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('  - User:', userStr ? 'présent' : 'null');
    console.log('  - Expiry:', tokenExpiry ? new Date(parseInt(tokenExpiry)).toLocaleString() : 'null');
    
    if (token && userStr && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      const now = Date.now();
      
      console.log('🔐 Vérification expiration:', now < expiryTime ? 'valide' : 'expiré');
      
      if (now < expiryTime) {
        try {
          const user = JSON.parse(userStr);
          console.log('🔐 ✅ Restauration session:', user.username, user.role);
          this.currentUserSubject.next(user);
          this.scheduleTokenRefresh(expiryTime - now);
        } catch (e) {
          console.error('🔐 ❌ Erreur parsing user data:', e);
          this.clearAuthData();
        }
      } else {
        console.log('🔐 Token expiré, nettoyage');
        this.clearAuthData();
      }
    } else {
      console.log('🔐 Aucune session sauvegardée trouvée');
    }
    
    this.isInitialized = true;
    console.log('🔐 Initialisation terminée. État final:', this.isAuthenticated());
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    console.log('📝 Tentative d\'inscription pour:', request.username);
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap(response => {
        console.log('✅ Inscription réussie:', response.username, response.role);
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
      
      console.log('🔐 getToken() appelé - Token présent:', !!token, 'Expiry présent:', !!tokenExpiry);
      
      if (token && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const now = Date.now();
        console.log('🔐 Vérification expiration:', now < expiryTime ? 'valide' : 'expiré');
        
        if (now < expiryTime) {
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
    // Ne pas initialiser côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    
    // Forcer la réinitialisation si pas encore fait
    if (!this.isInitialized) {
      console.log('🔐 Service non initialisé, initialisation forcée');
      this.initializeAuthState();
    }
    
    const token = this.getToken();
    const user = this.getCurrentUser();
    const isAuth = !!(token && user);
    
    console.log('🔐 Vérification authentification:', isAuth);
    console.log('  - Token:', !!token);
    console.log('  - User:', !!user);
    console.log('  - User details:', user ? `${user.username} (${user.role})` : 'null');
    
    return isAuth;
  }

  getCurrentUser(): AuthResponse | null {
    // Ne pas initialiser côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    
    // Forcer la réinitialisation si pas encore fait
    if (!this.isInitialized) {
      console.log('🔐 getCurrentUser: Service non initialisé, initialisation forcée');
      this.initializeAuthState();
    }
    
    const user = this.currentUserSubject.value;
    console.log('🔐 getCurrentUser() appelé - User:', user ? `${user.username} (${user.role})` : 'null');
    return user;
  }

  isAdmin(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    
    const user = this.getCurrentUser();
    const isAdminRole = user?.role === 'ROLE_ADMIN';
    console.log('👑 Vérification admin:', isAdminRole, 'Role:', user?.role);
    return isAdminRole;
  }

  isClient(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    
    const user = this.getCurrentUser();
    const isClientRole = user?.role === 'ROLE_CLIENT';
    console.log('👤 Vérification client:', isClientRole, 'Role:', user?.role);
    return isClientRole;
  }

  // Méthode pour gérer les erreurs 401/403
  handleUnauthorized(): void {
    console.log('🔐 Erreur 401/403 détectée, déconnexion forcée');
    
    // Éviter les boucles infinies
    if (this.router.url === '/login') {
      return;
    }
    
    this.clearAuthData();
    this.router.navigate(['/login']).then(() => {
      console.log('🔐 Redirection vers login terminée');
    });
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

  // Méthode pour forcer la réinitialisation de l'état d'authentification
  reinitializeAuth(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    console.log('🔄 Réinitialisation forcée de l\'authentification');
    this.isInitialized = false;
    this.initializeAuthState();
    
    // Forcer la mise à jour du subject avec les données actuelles
    const token = this.getToken();
    const userStr = localStorage.getItem('currentUser');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('🔄 Restauration utilisateur:', user.username, user.role);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('❌ Erreur parsing user data:', e);
        this.clearAuthData();
      }
    }
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
      console.log('🔐 Utilisateur:', response.username, 'Role:', response.role);
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
      console.log('🗑️ Données d\'authentification supprimées');
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
