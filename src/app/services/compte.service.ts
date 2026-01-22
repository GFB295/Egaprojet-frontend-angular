import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Compte {
  id?: string;
  numeroCompte: string;
  typeCompte: 'COURANT' | 'EPARGNE';
  dateCreation?: string;
  solde?: number;
  clientId?: string;
  clientNom?: string;
  clientPrenom?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompteService {
  private apiUrl = 'http://localhost:8080/api/comptes';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Compte[]> {
    return this.http.get<Compte[]>(this.apiUrl);
  }

  getById(id: string): Observable<Compte> {
    return this.http.get<Compte>(`${this.apiUrl}/${id}`);
  }

  getByNumero(numeroCompte: string): Observable<Compte> {
    return this.http.get<Compte>(`${this.apiUrl}/numero/${numeroCompte}`);
  }

  getByClientId(clientId: string): Observable<Compte[]> {
    return this.http.get<Compte[]>(`${this.apiUrl}/client/${clientId}`);
  }

  // Method overloads for better TypeScript support
  create(clientId: string): Observable<Compte>;
  create(clientId: string, typeCompte: 'COURANT' | 'EPARGNE'): Observable<Compte>;
  create(clientId: string, typeCompte?: 'COURANT' | 'EPARGNE'): Observable<Compte> {
    // Default to COURANT if no type specified
    const accountType: 'COURANT' | 'EPARGNE' = typeCompte ?? 'COURANT';
    
    return this.http.post<Compte>(`${this.apiUrl}/client/${clientId}`, null, {
      params: { typeCompte: accountType }
    });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
