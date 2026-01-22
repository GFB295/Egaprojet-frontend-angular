import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, timer } from 'rxjs';
import { AuthService } from './auth.service';
import { ClientService, Client } from './client.service';
import { CompteService, Compte } from './compte.service';
import { TransactionService, Transaction } from './transaction.service';

export interface StableClientData {
  client: Client | null;
  comptes: Compte[];
  recentTransactions: Transaction[];
  allTransactions: Transaction[];
  isLoading: boolean;
  lastUpdated: Date;
  isPersonalized: boolean;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class StableDataService {
  private clientDataSubject = new BehaviorSubject<StableClientData>({
    client: null,
    comptes: [],
    recentTransactions: [],
    allTransactions: [],
    isLoading: false,
    lastUpdated: new Date(),
    isPersonalized: false,
    username: ''
  });

  public clientData$ = this.clientDataSubject.asObservable();
  private readonly STORAGE_KEY = 'ega_bank_stable_data';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🏦 StableDataService initialisé');
    
    if (isPlatformBrowser(this.platformId)) {
      this.initializeService();
      this.setupAutoRefresh();
    }
  }

  private initializeService(): void {
    console.log('🏦 Initialisation du service de données stables...');
    
    // Charger les données sauvegardées
    this.loadFromStorage();
    
    // Surveiller les changements d'authentification
    this.authService.currentUser$.subscribe(user => {
      const currentData = this.clientDataSubject.value;
      const newUsername = user?.username || '';
      
      console.log('🏦 Changement utilisateur:', newUsername);
      
      if (currentData.username !== newUsername) {
        console.log('🏦 Nouvel utilisateur détecté, rechargement des données');
        this.loadStableData(true);
      }
    });
    
    // Charger les données initiales
    setTimeout(() => {
      this.loadStableData();
    }, 100);
  }

  private setupAutoRefresh(): void {
    // Actualiser les données toutes les 2 minutes si l'utilisateur est authentifié
    timer(0, 2 * 60 * 1000).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        const currentData = this.clientDataSubject.value;
        const timeSinceUpdate = Date.now() - currentData.lastUpdated.getTime();
        
        if (timeSinceUpdate > this.CACHE_DURATION) {
          console.log('🏦 Actualisation automatique des données');
          this.loadStableData(false, true);
        }
      }
    });
  }

  public loadStableData(forceRefresh: boolean = false, silent: boolean = false): void {
    const currentData = this.clientDataSubject.value;
    
    if (!silent && !forceRefresh && this.isCacheValid(currentData)) {
      console.log('🏦 Données en cache valides, pas de rechargement');
      return;
    }

    if (!silent) {
      this.updateLoadingState(true);
    }

    const currentUser = this.authService.getCurrentUser();
    const username = currentUser?.username || '';

    console.log('🏦 Chargement données pour utilisateur:', username);

    if (this.authService.isAuthenticated() && currentUser?.clientId) {
      this.loadAuthenticatedUserData(currentUser.clientId, username, silent);
    } else {
      this.loadPersonalizedDemoData(username, silent);
    }
  }

  private loadAuthenticatedUserData(clientId: string, username: string, silent: boolean): void {
    console.log('🏦 Chargement données authentifiées pour client:', clientId);

    this.clientService.getById(clientId).subscribe({
      next: (client) => {
        console.log('🏦 Client réel chargé:', client.nom, client.prenom);
        this.loadUserAccounts(clientId, client, username, true, silent);
      },
      error: (err) => {
        console.error('🏦 Erreur chargement client réel:', err);
        this.loadPersonalizedDemoData(username, silent);
      }
    });
  }

  private loadUserAccounts(clientId: string, client: Client, username: string, isReal: boolean, silent: boolean): void {
    this.compteService.getByClientId(clientId).subscribe({
      next: (comptes) => {
        console.log('🏦 Comptes chargés:', comptes.length);
        this.loadUserTransactions(comptes, client, username, isReal, silent);
      },
      error: (err) => {
        console.error('🏦 Erreur chargement comptes:', err);
        if (isReal) {
          // Fallback vers les données de démo
          this.loadPersonalizedDemoData(username, silent);
        } else {
          this.finalizeDataLoading(client, [], [], username, false, silent);
        }
      }
    });
  }

  private loadUserTransactions(comptes: Compte[], client: Client, username: string, isReal: boolean, silent: boolean): void {
    if (comptes.length === 0) {
      this.finalizeDataLoading(client, comptes, [], username, isReal, silent);
      return;
    }

    const transactionPromises = comptes.map(compte =>
      this.transactionService.getByCompte(compte.numeroCompte).subscribe({
        next: (transactions) => transactions,
        error: () => []
      })
    );

    // Pour l'instant, on utilise des transactions vides pour éviter les erreurs
    const allTransactions: Transaction[] = [];
    
    // Trier par date
    allTransactions.sort((a, b) => {
      const dateA = a.dateTransaction ? new Date(a.dateTransaction).getTime() : 0;
      const dateB = b.dateTransaction ? new Date(b.dateTransaction).getTime() : 0;
      return dateB - dateA;
    });

    console.log('🏦 Transactions chargées:', allTransactions.length);
    this.finalizeDataLoading(client, comptes, allTransactions, username, isReal, silent);
  }

  private loadPersonalizedDemoData(username: string, silent: boolean): void {
    console.log('🏦 Chargement données démo personnalisées pour:', username);

    const client = this.createPersonalizedClient(username);
    const comptes = this.createPersonalizedAccounts(client.id || 'demo');
    const transactions = this.createPersonalizedTransactions(comptes);

    this.finalizeDataLoading(client, comptes, transactions, username, false, silent);
  }

  private finalizeDataLoading(
    client: Client, 
    comptes: Compte[], 
    allTransactions: Transaction[], 
    username: string, 
    isReal: boolean, 
    silent: boolean
  ): void {
    const recentTransactions = allTransactions.slice(0, 10);
    
    const stableData: StableClientData = {
      client,
      comptes,
      recentTransactions,
      allTransactions,
      isLoading: false,
      lastUpdated: new Date(),
      isPersonalized: true,
      username
    };

    console.log('🏦 Données finalisées:', {
      client: client.nom + ' ' + client.prenom,
      comptes: comptes.length,
      transactions: allTransactions.length,
      isReal
    });

    this.clientDataSubject.next(stableData);
    
    if (!silent) {
      this.updateLoadingState(false);
    }
    
    this.saveToStorage(stableData);
  }

  private createPersonalizedClient(username: string): Client {
    const personalizations: { [key: string]: { nom: string; prenom: string; sexe: string } } = {
      'testclient': { nom: 'Dupont', prenom: 'Jean', sexe: 'M' },
      'client1': { nom: 'Martin', prenom: 'Marie', sexe: 'F' },
      'client2': { nom: 'Bernard', prenom: 'Pierre', sexe: 'M' },
      'demo': { nom: 'Durand', prenom: 'Sophie', sexe: 'F' }
    };

    const personalization = personalizations[username] || { nom: 'Client', prenom: 'Test', sexe: 'M' };

    return {
      id: `stable-${username}`,
      nom: personalization.nom,
      prenom: personalization.prenom,
      courriel: `${username}@egabank.fr`,
      telephone: '06 12 34 56 78',
      adresse: '15 Avenue des Champs-Élysées, 75008 Paris',
      dateNaissance: '1985-03-15',
      nationalite: 'Française',
      sexe: personalization.sexe
    };
  }

  private createPersonalizedAccounts(clientId: string): Compte[] {
    // Les nouveaux comptes commencent toujours avec un solde de 0
    return [
      {
        id: `${clientId}-compte-1`,
        numeroCompte: this.generateStableIBAN(clientId, 1),
        typeCompte: 'COURANT',
        solde: 0.00, // Solde initial à 0
        dateCreation: new Date().toISOString().split('T')[0],
        clientId: clientId
      },
      {
        id: `${clientId}-compte-2`,
        numeroCompte: this.generateStableIBAN(clientId, 2),
        typeCompte: 'EPARGNE',
        solde: 0.00, // Solde initial à 0
        dateCreation: new Date().toISOString().split('T')[0],
        clientId: clientId
      }
    ];
  }

  private createPersonalizedTransactions(comptes: Compte[]): Transaction[] {
    // Pas de transactions initiales - elles seront créées uniquement après les opérations réelles
    return [];
  }

  private generateStableIBAN(clientId: string, accountNumber: number): string {
    const hash = this.simpleHash(clientId + accountNumber);
    const bankCode = (1000 + (hash % 9000)).toString();
    const accountCode = (10000000 + (hash % 90000000)).toString();
    return `FR76 ${bankCode} ${accountCode.substring(0, 4)} ${accountCode.substring(4, 8)} ${accountCode.substring(8, 12)} ${accountCode.substring(12, 16)} ${(hash % 900 + 100).toString()}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private isCacheValid(data: StableClientData): boolean {
    const timeSinceUpdate = Date.now() - data.lastUpdated.getTime();
    return timeSinceUpdate < this.CACHE_DURATION && data.isPersonalized;
  }

  private updateLoadingState(isLoading: boolean): void {
    const currentData = this.clientDataSubject.value;
    this.clientDataSubject.next({
      ...currentData,
      isLoading
    });
  }

  private saveToStorage(data: StableClientData): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          ...data,
          lastUpdated: data.lastUpdated.toISOString()
        }));
      } catch (e) {
        console.error('🏦 Erreur sauvegarde localStorage:', e);
      }
    }
  }

  private loadFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          data.lastUpdated = new Date(data.lastUpdated);
          
          if (this.isCacheValid(data)) {
            console.log('🏦 Données chargées depuis le localStorage');
            this.clientDataSubject.next(data);
          }
        }
      } catch (e) {
        console.error('🏦 Erreur chargement localStorage:', e);
      }
    }
  }

  // Méthodes publiques pour accéder aux données
  public getCurrentData(): StableClientData {
    return this.clientDataSubject.value;
  }

  public getClient(): Client | null {
    return this.clientDataSubject.value.client;
  }

  public getComptes(): Compte[] {
    return this.clientDataSubject.value.comptes;
  }

  public getTransactions(): Transaction[] {
    return this.clientDataSubject.value.allTransactions;
  }

  public getRecentTransactions(): Transaction[] {
    return this.clientDataSubject.value.recentTransactions;
  }

  public refreshData(): void {
    console.log('🏦 Actualisation forcée des données stables');
    this.loadStableData(true);
  }

  public updateAfterOperation(): void {
    console.log('🏦 Mise à jour après opération bancaire');
    this.loadStableData(true, true);
  }

  public clearData(): void {
    console.log('🏦 Nettoyage des données stables');
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.clientDataSubject.next({
      client: null,
      comptes: [],
      recentTransactions: [],
      allTransactions: [],
      isLoading: false,
      lastUpdated: new Date(),
      isPersonalized: false,
      username: ''
    });
  }

  public forceResetAllData(): void {
    console.log('🏦 RÉINITIALISATION COMPLÈTE - Suppression de toutes les données');
    
    // Supprimer toutes les données localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
      // Supprimer aussi d'autres clés potentielles
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('ega_bank') || key.includes('stable_data') || key.includes('client_data'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // Réinitialiser complètement le subject
    this.clientDataSubject.next({
      client: null,
      comptes: [],
      recentTransactions: [],
      allTransactions: [],
      isLoading: false,
      lastUpdated: new Date(),
      isPersonalized: false,
      username: ''
    });
    
    console.log('🏦 Réinitialisation terminée - Toutes les données supprimées');
  }

  // Méthodes pour les opérations bancaires réelles
  public executeDepot(numeroCompte: string, montant: number, description: string): void {
    console.log('🏦 Exécution dépôt:', numeroCompte, montant);
    
    const currentData = this.clientDataSubject.value;
    const updatedComptes = [...currentData.comptes];
    const compteIndex = updatedComptes.findIndex(c => c.numeroCompte === numeroCompte);
    
    if (compteIndex !== -1) {
      // Mettre à jour le solde
      const ancienSolde = updatedComptes[compteIndex].solde || 0;
      const nouveauSolde = ancienSolde + montant;
      updatedComptes[compteIndex].solde = nouveauSolde;
      
      // Créer la transaction
      const nouvelleTransaction: Transaction = {
        id: `trans-${Date.now()}`,
        typeTransaction: 'DEPOT',
        montant: montant,
        dateTransaction: new Date().toISOString(),
        compteNumero: numeroCompte,
        description: description,
        soldeApres: nouveauSolde
      };
      
      // Mettre à jour les transactions
      const updatedTransactions = [nouvelleTransaction, ...currentData.allTransactions];
      
      // Mettre à jour les données
      const updatedData: StableClientData = {
        ...currentData,
        comptes: updatedComptes,
        allTransactions: updatedTransactions,
        recentTransactions: updatedTransactions.slice(0, 10),
        lastUpdated: new Date()
      };
      
      this.clientDataSubject.next(updatedData);
      this.saveToStorage(updatedData);
      
      console.log('🏦 Dépôt exécuté - Nouveau solde:', nouveauSolde);
    }
  }

  public executeRetrait(numeroCompte: string, montant: number, description: string): void {
    console.log('🏦 Exécution retrait:', numeroCompte, montant);
    
    const currentData = this.clientDataSubject.value;
    const updatedComptes = [...currentData.comptes];
    const compteIndex = updatedComptes.findIndex(c => c.numeroCompte === numeroCompte);
    
    if (compteIndex !== -1) {
      const ancienSolde = updatedComptes[compteIndex].solde || 0;
      
      // Vérifier si le solde est suffisant
      if (ancienSolde < montant) {
        throw new Error('Solde insuffisant pour effectuer ce retrait');
      }
      
      // Mettre à jour le solde
      const nouveauSolde = ancienSolde - montant;
      updatedComptes[compteIndex].solde = nouveauSolde;
      
      // Créer la transaction
      const nouvelleTransaction: Transaction = {
        id: `trans-${Date.now()}`,
        typeTransaction: 'RETRAIT',
        montant: montant,
        dateTransaction: new Date().toISOString(),
        compteNumero: numeroCompte,
        description: description,
        soldeApres: nouveauSolde
      };
      
      // Mettre à jour les transactions
      const updatedTransactions = [nouvelleTransaction, ...currentData.allTransactions];
      
      // Mettre à jour les données
      const updatedData: StableClientData = {
        ...currentData,
        comptes: updatedComptes,
        allTransactions: updatedTransactions,
        recentTransactions: updatedTransactions.slice(0, 10),
        lastUpdated: new Date()
      };
      
      this.clientDataSubject.next(updatedData);
      this.saveToStorage(updatedData);
      
      console.log('🏦 Retrait exécuté - Nouveau solde:', nouveauSolde);
    }
  }

  public executeVirement(compteSource: string, compteDestinataire: string, montant: number, description: string): void {
    console.log('🏦 Exécution virement:', compteSource, '→', compteDestinataire, montant);
    
    const currentData = this.clientDataSubject.value;
    const updatedComptes = [...currentData.comptes];
    
    const compteSourceIndex = updatedComptes.findIndex(c => c.numeroCompte === compteSource);
    const compteDestIndex = updatedComptes.findIndex(c => c.numeroCompte === compteDestinataire);
    
    if (compteSourceIndex !== -1) {
      const ancienSoldeSource = updatedComptes[compteSourceIndex].solde || 0;
      
      // Vérifier si le solde est suffisant
      if (ancienSoldeSource < montant) {
        throw new Error('Solde insuffisant pour effectuer ce virement');
      }
      
      // Mettre à jour le solde du compte source
      const nouveauSoldeSource = ancienSoldeSource - montant;
      updatedComptes[compteSourceIndex].solde = nouveauSoldeSource;
      
      // Mettre à jour le solde du compte destinataire (si c'est un compte du même client)
      let nouveauSoldeDest = 0;
      if (compteDestIndex !== -1) {
        const ancienSoldeDest = updatedComptes[compteDestIndex].solde || 0;
        nouveauSoldeDest = ancienSoldeDest + montant;
        updatedComptes[compteDestIndex].solde = nouveauSoldeDest;
      }
      
      // Créer les transactions
      const transactionSource: Transaction = {
        id: `trans-${Date.now()}-source`,
        typeTransaction: 'VIREMENT',
        montant: montant,
        dateTransaction: new Date().toISOString(),
        compteNumero: compteSource,
        description: `Virement vers ${compteDestinataire.slice(-4)} - ${description}`,
        soldeApres: nouveauSoldeSource
      };
      
      const transactions = [transactionSource];
      
      // Ajouter transaction destinataire si c'est un compte du même client
      if (compteDestIndex !== -1) {
        const transactionDest: Transaction = {
          id: `trans-${Date.now()}-dest`,
          typeTransaction: 'VIREMENT',
          montant: montant,
          dateTransaction: new Date().toISOString(),
          compteNumero: compteDestinataire,
          description: `Virement reçu de ${compteSource.slice(-4)} - ${description}`,
          soldeApres: nouveauSoldeDest
        };
        transactions.push(transactionDest);
      }
      
      // Mettre à jour les transactions
      const updatedTransactions = [...transactions, ...currentData.allTransactions];
      
      // Mettre à jour les données
      const updatedData: StableClientData = {
        ...currentData,
        comptes: updatedComptes,
        allTransactions: updatedTransactions,
        recentTransactions: updatedTransactions.slice(0, 10),
        lastUpdated: new Date()
      };
      
      this.clientDataSubject.next(updatedData);
      this.saveToStorage(updatedData);
      
      console.log('🏦 Virement exécuté - Soldes mis à jour');
    }
  }

  public createNewAccount(typeCompte: 'COURANT' | 'EPARGNE'): void {
    console.log('🏦 Création nouveau compte:', typeCompte);
    
    const currentData = this.clientDataSubject.value;
    const clientId = currentData.client?.id || 'demo';
    
    const nouveauCompte: Compte = {
      id: `${clientId}-compte-${Date.now()}`,
      numeroCompte: this.generateStableIBAN(clientId, currentData.comptes.length + 1),
      typeCompte: typeCompte,
      solde: 0.00, // Nouveau compte commence à 0
      dateCreation: new Date().toISOString().split('T')[0],
      clientId: clientId
    };
    
    const updatedComptes = [...currentData.comptes, nouveauCompte];
    
    const updatedData: StableClientData = {
      ...currentData,
      comptes: updatedComptes,
      lastUpdated: new Date()
    };
    
    this.clientDataSubject.next(updatedData);
    this.saveToStorage(updatedData);
    
    console.log('🏦 Nouveau compte créé:', nouveauCompte.numeroCompte);
  }
}