import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { CompteService, Compte } from '../../services/compte.service';
import { TransactionService, Transaction, ReleveRequest } from '../../services/transaction.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.css']
})
export class ClientDashboardComponent implements OnInit {
  client: Client | null = null;
  comptes: Compte[] = [];
  recentTransactions: Transaction[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  
  // États des modals
  showDepotForm: boolean = false;
  showRetraitForm: boolean = false;
  showVirementForm: boolean = false;
  showReleveForm: boolean = false;
  showCreateAccountForm: boolean = false;
  
  // Formulaires
  depotForm = {
    numeroCompte: '',
    montant: 0,
    description: ''
  };
  
  retraitForm = {
    numeroCompte: '',
    montant: 0,
    description: ''
  };
  
  virementForm = {
    compteSource: '',
    compteDestinataire: '',
    montant: 0,
    description: ''
  };
  
  releveForm: ReleveRequest = {
    numeroCompte: '',
    dateDebut: '',
    dateFin: ''
  };
  
  createAccountForm = {
    typeCompte: 'COURANT'
  };

  constructor(
    public authService: AuthService,
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('ClientDashboard: Initialisation...');
    this.loadClientData();
  }

  loadClientData(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (!currentUser.clientId) {
      this.errorMessage = 'Aucune information client disponible';
      this.isLoading = false;
      return;
    }

    this.clientService.getById(currentUser.clientId).subscribe({
      next: (client) => {
        this.client = client;
        this.loadComptes();
      },
      error: (err) => {
        console.error('Erreur chargement client:', err);
        this.errorMessage = 'Impossible de charger vos informations';
        this.isLoading = false;
      }
    });
  }

  loadComptes(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.clientId) return;

    this.compteService.getByClientId(currentUser.clientId).subscribe({
      next: (comptes) => {
        this.comptes = comptes || [];
        this.loadRecentTransactions();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement comptes:', err);
        this.comptes = [];
        this.isLoading = false;
      }
    });
  }

  loadRecentTransactions(): void {
    if (this.comptes.length === 0) return;
    
    const allTransactionsPromises = this.comptes.map(compte => 
      this.transactionService.getByCompte(compte.numeroCompte).toPromise()
    );

    Promise.all(allTransactionsPromises).then(results => {
      const allTransactions = results
        .filter(t => t !== undefined)
        .flat() as Transaction[];
      
      allTransactions.sort((a, b) => {
        const dateA = a.dateTransaction ? new Date(a.dateTransaction).getTime() : 0;
        const dateB = b.dateTransaction ? new Date(b.dateTransaction).getTime() : 0;
        return dateB - dateA;
      });
      
      this.recentTransactions = allTransactions.slice(0, 5);
    }).catch(err => {
      console.error('Erreur chargement transactions:', err);
      this.recentTransactions = [];
    });
  }

  // Gestion des opérations bancaires
  openDepotForm(): void {
    if (this.comptes.length > 0) {
      this.depotForm.numeroCompte = this.comptes[0].numeroCompte;
    }
    this.showDepotForm = true;
  }

  effectuerDepot(): void {
    if (!this.depotForm.numeroCompte || this.depotForm.montant <= 0) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement';
      return;
    }

    this.transactionService.depot({
      numeroCompte: this.depotForm.numeroCompte,
      montant: this.depotForm.montant,
      description: this.depotForm.description || 'Dépôt'
    }).subscribe({
      next: () => {
        this.successMessage = `Dépôt de ${this.formatCurrency(this.depotForm.montant)} effectué avec succès`;
        this.showDepotForm = false;
        this.resetDepotForm();
        this.loadComptes();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors du dépôt';
      }
    });
  }

  openRetraitForm(): void {
    if (this.comptes.length > 0) {
      this.retraitForm.numeroCompte = this.comptes[0].numeroCompte;
    }
    this.showRetraitForm = true;
  }

  effectuerRetrait(): void {
    if (!this.retraitForm.numeroCompte || this.retraitForm.montant <= 0) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement';
      return;
    }

    this.transactionService.retrait({
      numeroCompte: this.retraitForm.numeroCompte,
      montant: this.retraitForm.montant,
      description: this.retraitForm.description || 'Retrait'
    }).subscribe({
      next: () => {
        this.successMessage = `Retrait de ${this.formatCurrency(this.retraitForm.montant)} effectué avec succès`;
        this.showRetraitForm = false;
        this.resetRetraitForm();
        this.loadComptes();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors du retrait';
      }
    });
  }

  openVirementForm(): void {
    if (this.comptes.length > 0) {
      this.virementForm.compteSource = this.comptes[0].numeroCompte;
    }
    this.showVirementForm = true;
  }

  effectuerVirement(): void {
    if (!this.virementForm.compteSource || !this.virementForm.compteDestinataire || this.virementForm.montant <= 0) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement';
      return;
    }

    if (this.virementForm.compteSource === this.virementForm.compteDestinataire) {
      this.errorMessage = 'Le compte source et destinataire ne peuvent pas être identiques';
      return;
    }

    this.transactionService.virement({
      compteSource: this.virementForm.compteSource,
      compteDestinataire: this.virementForm.compteDestinataire,
      montant: this.virementForm.montant,
      description: this.virementForm.description || 'Virement'
    }).subscribe({
      next: () => {
        this.successMessage = `Virement de ${this.formatCurrency(this.virementForm.montant)} effectué avec succès`;
        this.showVirementForm = false;
        this.resetVirementForm();
        this.loadComptes();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors du virement';
      }
    });
  }

  openCreateAccountForm(): void {
    this.showCreateAccountForm = true;
  }

  creerCompte(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.clientId) return;

    this.compteService.create(currentUser.clientId, this.createAccountForm.typeCompte as 'COURANT' | 'EPARGNE').subscribe({
      next: () => {
        this.successMessage = `Compte ${this.createAccountForm.typeCompte.toLowerCase()} créé avec succès`;
        this.showCreateAccountForm = false;
        this.loadComptes();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la création du compte';
      }
    });
  }

  // Gestion du relevé PDF
  openReleveForm(): void {
    if (this.comptes.length > 0) {
      this.releveForm.numeroCompte = this.comptes[0].numeroCompte;
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      this.releveForm.dateDebut = firstDay.toISOString().split('T')[0];
      this.releveForm.dateFin = today.toISOString().split('T')[0];
    }
    this.showReleveForm = true;
  }

  downloadRelevePDF(): void {
    if (!this.releveForm.numeroCompte || !this.releveForm.dateDebut || !this.releveForm.dateFin) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.transactionService.getReleve(this.releveForm).subscribe({
      next: (transactions) => {
        this.generatePDF(transactions);
        this.successMessage = 'Relevé PDF téléchargé avec succès';
        this.showReleveForm = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la génération du relevé';
      }
    });
  }

  async generatePDF(transactions: Transaction[]): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const compte = this.comptes.find(c => c.numeroCompte === this.releveForm.numeroCompte);
    
    // En-tête
    doc.setFontSize(20);
    doc.text('EGA BANK - RELEVE BANCAIRE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Client: ${this.client?.prenom} ${this.client?.nom}`, 20, 35);
    doc.text(`Compte: ${this.releveForm.numeroCompte}`, 20, 42);
    doc.text(`Type: ${compte?.typeCompte}`, 20, 49);
    
    const dateDebut = new Date(this.releveForm.dateDebut).toLocaleDateString('fr-FR');
    const dateFin = new Date(this.releveForm.dateFin).toLocaleDateString('fr-FR');
    doc.text(`Période: ${dateDebut} - ${dateFin}`, 20, 56);
    
    // Tableau des transactions
    let y = 70;
    doc.setFontSize(10);
    doc.text('Date', 20, y);
    doc.text('Type', 60, y);
    doc.text('Description', 100, y);
    doc.text('Montant', 150, y);
    doc.text('Solde', 180, y);
    y += 10;
    
    transactions.forEach(transaction => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const transDate = transaction.dateTransaction ? new Date(transaction.dateTransaction).toLocaleDateString('fr-FR') : '';
      doc.text(transDate, 20, y);
      doc.text(transaction.typeTransaction, 60, y);
      doc.text(transaction.description || '', 100, y);
      const montant = transaction.montant ? transaction.montant.toFixed(2) + ' €' : '0.00 €';
      doc.text(montant, 150, y);
      const solde = transaction.soldeApres ? transaction.soldeApres.toFixed(2) + ' €' : '0.00 €';
      doc.text(solde, 180, y);
      y += 8;
    });
    
    // Solde final
    if (compte && compte.solde !== undefined) {
      y += 10;
      doc.setFontSize(12);
      doc.text(`Solde actuel: ${compte.solde.toFixed(2)} €`, 20, y);
    }
    
    const fileName = `releve_${this.releveForm.numeroCompte}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  // Utilitaires
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatDateTime(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleString('fr-FR');
  }

  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'DEPOT': 'Dépôt',
      'RETRAIT': 'Retrait',
      'VIREMENT': 'Virement'
    };
    return labels[type] || type;
  }

  getTotalSolde(): number {
    return this.comptes.reduce((total, compte) => total + (compte.solde || 0), 0);
  }

  // Reset forms
  resetDepotForm(): void {
    this.depotForm = { numeroCompte: '', montant: 0, description: '' };
  }

  resetRetraitForm(): void {
    this.retraitForm = { numeroCompte: '', montant: 0, description: '' };
  }

  resetVirementForm(): void {
    this.virementForm = { compteSource: '', compteDestinataire: '', montant: 0, description: '' };
  }

  // Fermeture des modals
  closeDepotForm(): void { this.showDepotForm = false; }
  closeRetraitForm(): void { this.showRetraitForm = false; }
  closeVirementForm(): void { this.showVirementForm = false; }
  closeReleveForm(): void { this.showReleveForm = false; }
  closeCreateAccountForm(): void { this.showCreateAccountForm = false; }

  logout(): void {
    this.authService.logout();
  }
}