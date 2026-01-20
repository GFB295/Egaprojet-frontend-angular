import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Compte {
  id?: number;
  numeroCompte: string;
  typeCompte: 'COURANT' | 'EPARGNE';
  dateCreation?: string;
  solde?: number;
  clientId?: number;
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

  getById(id: number): Observable<Compte> {
    return this.http.get<Compte>(`${this.apiUrl}/${id}`);
  }

  getByNumero(numeroCompte: string): Observable<Compte> {
    return this.http.get<Compte>(`${this.apiUrl}/numero/${numeroCompte}`);
  }

  getByClientId(clientId: number): Observable<Compte[]> {
    return this.http.get<Compte[]>(`${this.apiUrl}/client/${clientId}`);
  }

  create(clientId: number, typeCompte: 'COURANT' | 'EPARGNE'): Observable<Compte> {
    return this.http.post<Compte>(`${this.apiUrl}/client/${clientId}`, null, {
      params: { typeCompte }
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
