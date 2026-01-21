import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { CompteService, Compte } from '../../services/compte.service';
import { TransactionService, Transaction, ReleveRequest } from '../../services/transaction.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css']
})
export class ProfilComponent implements OnInit {
  client: Client | null = null;
  comptes: Compte[] = [];
  recentTransactions: Transaction[] = [];
  allTransactions: Transaction[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Pour le relevé PDF
  showReleveForm: boolean = false;
  releveForm: ReleveRequest = {
    numeroCompte: '',
    dateDebut: '',
    dateFin: ''
  };

  constructor(
    public authService: AuthService,
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    console.log('ProfilComponent: Initialisation...');
    this.loadClientData();
  }

  loadClientData(): void {
    console.log('ProfilComponent: Chargement des données client...');
    this.isLoading = true;
    this.errorMessage = '';
    
    const currentUser = this.authService.getCurrentUser();
    console.log('Utilisateur actuel:', currentUser);
    
    if (!currentUser) {
      this.errorMessage = 'Vous devez être connecté pour voir votre profil';
      this.isLoading = false;
      return;
    }

    if (!currentUser.clientId) {
      this.errorMessage = 'Aucune information client disponible. Vous êtes peut-être un administrateur.';
      this.isLoading = false;
      return;
    }

    this.clientService.getById(currentUser.clientId).subscribe({
      next: (client) => {
        console.log('Client chargé avec succès:', client);
        this.client = client;
        this.loadComptes();
      },
      error: (err) => {
        console.error('Erreur lors du chargement du client:', err);
        this.errorMessage = 'Impossible de charger vos informations. Veuillez réessayer.';
        this.isLoading = false;
      }
    });
  }

  loadComptes(): void {
    console.log('ProfilComponent: Chargement des comptes...');
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.clientId) {
      this.isLoading = false;
      return;
    }

    this.compteService.getByClientId(currentUser.clientId).subscribe({
      next: (comptes) => {
        console.log('Comptes chargés:', comptes);
        this.comptes = comptes;
        this.loadRecentTransactions();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des comptes:', err);
        this.errorMessage = 'Erreur lors du chargement des comptes';
        this.isLoading = false;
      }
    });
  }

  loadRecentTransactions(): void {
    console.log('ProfilComponent: Chargement des transactions...');
    if (this.comptes.length === 0) {
      this.isLoading = false;
      return;
    }
    
    // Charger les transactions pour tous les comptes du client
    const allTransactionsPromises = this.comptes.map(compte => 
      this.transactionService.getByCompte(compte.numeroCompte).toPromise()
    );

    Promise.all(allTransactionsPromises).then(results => {
      this.allTransactions = results
        .filter(t => t !== undefined)
        .flat() as Transaction[];
      
      // Trier par date (plus récentes en premier) et prendre les 10 dernières
      this.allTransactions.sort((a, b) => {
        const dateA = a.dateTransaction ? new Date(a.dateTransaction).getTime() : 0;
        const dateB = b.dateTransaction ? new Date(b.dateTransaction).getTime() : 0;
        return dateB - dateA;
      });
      
      this.recentTransactions = this.allTransactions.slice(0, 10);
      console.log('Transactions récentes chargées:', this.recentTransactions);
      this.isLoading = false;
    }).catch(err => {
      console.error('Erreur lors du chargement des transactions:', err);
      this.isLoading = false;
    });
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  formatCurrencyForPDF(amount: number | undefined): string {
    if (amount === undefined || isNaN(amount)) return '0,00';
    // Formatage simple sans symboles spéciaux
    return amount.toFixed(2).replace('.', ',');
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  formatDateTime(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getSexeLabel(sexe: string): string {
    return sexe === 'M' ? 'Homme' : 'Femme';
  }

  getCurrentUserRole(): string {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ROLE_ADMIN' ? 'ADMIN' : 'CLIENT';
  }

  getAccountStatus(): string {
    return 'Actif';
  }

  getCurrentSession(): string {
    // Générer un ID de session aléatoire
    return Math.random().toString(36).substring(2, 10) + '....' + Math.random().toString(36).substring(2, 6);
  }

  getCreationDate(): string {
    // Date d'inscription approximative (on pourrait l'ajouter au backend)
    return new Date().toLocaleDateString('fr-FR');
  }

  getLastActivity(): string {
    return new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

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

  closeReleveForm(): void {
    this.showReleveForm = false;
  }

  downloadRelevePDF(): void {
    if (!this.releveForm.numeroCompte || !this.releveForm.dateDebut || !this.releveForm.dateFin) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    // Vérifier que le compte appartient au client connecté
    const compte = this.comptes.find(c => c.numeroCompte === this.releveForm.numeroCompte);
    if (!compte) {
      this.errorMessage = 'Ce compte ne vous appartient pas';
      return;
    }

    this.errorMessage = '';
    this.transactionService.getReleve(this.releveForm).subscribe({
      next: (transactions) => {
        // Générer automatiquement le PDF
        this.generatePDF(transactions);
        this.successMessage = 'Relevé PDF téléchargé avec succès';
        this.showReleveForm = false;
        setTimeout(() => this.successMessage = '', 5000); // Augmenté à 5 secondes
      },
      error: (err) => {
        console.error('Erreur lors de la génération du relevé:', err);
        if (err.status === 403) {
          this.errorMessage = 'Vous n\'avez pas accès aux relevés de ce compte';
        } else {
          this.errorMessage = err.error?.message || 'Erreur lors de la génération du relevé';
        }
      }
    });
  }

  async generatePDF(transactions: Transaction[]): Promise<void> {
    // Utiliser jsPDF pour générer le PDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const compte = this.comptes.find(c => c.numeroCompte === this.releveForm.numeroCompte);
    
    // En-tête
    doc.setFontSize(20);
    doc.text('RELEVE BANCAIRE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Client: ${this.client?.prenom} ${this.client?.nom}`, 20, 35);
    doc.text(`Compte: ${this.releveForm.numeroCompte}`, 20, 42);
    const dateDebut = new Date(this.releveForm.dateDebut).toLocaleDateString('fr-FR');
    const dateFin = new Date(this.releveForm.dateFin).toLocaleDateString('fr-FR');
    doc.text(`Période: ${dateDebut} - ${dateFin}`, 20, 49);
    
    // Tableau des transactions
    let y = 60;
    doc.setFontSize(10);
    doc.text('Date', 20, y);
    doc.text('Type', 60, y);
    doc.text('Montant', 100, y);
    doc.text('Solde après', 150, y);
    y += 10;
    
    transactions.forEach(transaction => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const transDate = transaction.dateTransaction ? new Date(transaction.dateTransaction).toLocaleDateString('fr-FR') : '';
      doc.text(transDate, 20, y);
      doc.text(transaction.typeTransaction, 60, y);
      const montant = transaction.montant ? this.formatCurrencyForPDF(transaction.montant) + ' €' : '0.00 €';
      doc.text(montant, 100, y, { align: 'right' });
      const solde = transaction.soldeApres ? this.formatCurrencyForPDF(transaction.soldeApres) + ' €' : '0.00 €';
      doc.text(solde, 150, y, { align: 'right' });
      y += 8;
    });
    
    // Solde final
    if (compte && compte.solde !== undefined) {
      y += 5;
      doc.setFontSize(12);
      doc.text(`Solde actuel: ${this.formatCurrencyForPDF(compte.solde)} €`, 20, y);
    }
    
    // Sauvegarder
    const fileName = `releve_${this.releveForm.numeroCompte}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  changePassword(): void {
    // TODO: Implémenter le changement de mot de passe
    this.successMessage = 'Fonctionnalité de changement de mot de passe à venir';
    setTimeout(() => this.successMessage = '', 5000); // Augmenté à 5 secondes
  }

  logout(): void {
    this.authService.logout();
  }

  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'DEPOT': 'Dépôt',
      'RETRAIT': 'Retrait',
      'VIREMENT': 'Virement'
    };
    return labels[type] || type;
  }

  getTransactionTypeClass(type: string): string {
    const classes: { [key: string]: string } = {
      'DEPOT': 'transaction-depot',
      'RETRAIT': 'transaction-retrait',
      'VIREMENT': 'transaction-virement'
    };
    return classes[type] || '';
  }
}
