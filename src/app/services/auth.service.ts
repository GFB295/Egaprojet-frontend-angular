import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('currentUser');
      if (token && userStr) {
        this.currentUserSubject.next(JSON.parse(userStr));
      }
    }
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap(response => {
        this.setAuthData(response);
      })
    );
  }

  login(request: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => {
        this.setAuthData(response);
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
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

  private setAuthData(response: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response));
    }
    this.currentUserSubject.next(response);
  }
}
