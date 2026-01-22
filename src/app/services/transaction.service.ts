import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  id?: string;
  typeTransaction: 'DEPOT' | 'RETRAIT' | 'VIREMENT';
  montant: number;
  dateTransaction?: string;
  compteId?: string;
  compteNumero?: string;
  compteDestinataireId?: string;
  compteDestinataireNumero?: string;
  description?: string;
  soldeApres?: number;
}

export interface OperationRequest {
  numeroCompte: string;
  montant: number;
  description?: string;
}

export interface VirementRequest {
  compteSource: string;
  compteDestinataire: string;
  montant: number;
  description?: string;
}

export interface ReleveRequest {
  numeroCompte: string;
  dateDebut: string;
  dateFin: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'http://localhost:8080/api/transactions';
  private releveUrl = 'http://localhost:8080/api/releves';

  constructor(private http: HttpClient) {}

  depot(request: OperationRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/depot`, request);
  }

  retrait(request: OperationRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/retrait`, request);
  }

  virement(request: VirementRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/virement`, request);
  }

  getByCompte(numeroCompte: string): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/compte/${numeroCompte}`);
  }

  getReleve(request: ReleveRequest): Observable<Transaction[]> {
    return this.http.post<Transaction[]>(`${this.apiUrl}/releve`, request);
  }

  getById(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/${id}`);
  }

  imprimerReleve(request: ReleveRequest): Observable<Blob> {
    return this.http.post(`${this.releveUrl}/imprimer`, request, {
      responseType: 'blob'
    });
  }
}
