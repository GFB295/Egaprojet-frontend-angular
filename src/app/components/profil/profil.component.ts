import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { CompteService, Compte } from '../../services/compte.service';
import { TransactionService, Transaction, ReleveRequest } from '../../services/transaction.service';
import { StableDataService, StableClientData } from '../../services/stable-data.service';

// Interface pour les données de démonstration
interface MockClient extends Client {
  id: string;
  nom: string;
  prenom: string;
  courriel: string;
  telephone: string;
  adresse: string;
  dateNaissance: string;
  nationalite: string;
  sexe: string;
}

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css']
})
export class ProfilComponent implements OnInit, OnDestroy {
  client: Client | null = null;
  comptes: Compte[] = [];
  recentTransactions: Transaction[] = [];
  allTransactions: Transaction[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  private dataSubscription?: Subscription;
  
  // États des modals
  showDepotForm: boolean = false;
  showRetraitForm: boolean = false;
  showVirementForm: boolean = false;
  showReleveForm: boolean = false;
  showCreateAccountForm: boolean = false;
  showEditForm: boolean = false;
  
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

  editForm: any = {};

  constructor(
    public authService: AuthService,
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService,
    private stableDataService: StableDataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('ProfilComponent: Initialisation avec données stables...');
    
    // S'abonner aux données stables
    this.dataSubscription = this.stableDataService.clientData$.subscribe(
      (data: StableClientData) => {
        console.log('ProfilComponent: Nouvelles données stables reçues:', data);
        this.updateComponentData(data);
      }
    );
    
    // Charger les données stables
    this.stableDataService.loadStableData();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  private updateComponentData(data: StableClientData): void {
    this.client = data.client;
    this.comptes = data.comptes;
    this.recentTransactions = data.recentTransactions;
    this.allTransactions = data.allTransactions;
    this.isLoading = data.isLoading;
    
    console.log('ProfilComponent: Données mises à jour:', {
      client: this.client?.nom + ' ' + this.client?.prenom,
      comptes: this.comptes.length,
      transactions: this.recentTransactions.length
    });
  }

  // Méthode pour recharger les données réelles
  reloadData(): void {
    console.log('ProfilComponent: Rechargement des données...');
    this.errorMessage = '';
    this.successMessage = '';
    
    // Utiliser le service de données stables
    this.stableDataService.refreshData();
  }

  private reloadClientDataAfterOperation(): void {
    console.log('ProfilComponent: Rechargement après opération...');
    
    // Utiliser le service de données stables pour la mise à jour
    this.stableDataService.updateAfterOperation();
  }

  // Méthode pour réinitialiser complètement toutes les données
  resetAllData(): void {
    const confirmation = confirm(
      'ATTENTION: Cette action va supprimer TOUTES vos données (comptes, soldes, transactions). ' +
      'Vous repartirez avec des comptes complètement vides. Êtes-vous sûr ?'
    );
    
    if (confirmation) {
      console.log('ProfilComponent: Réinitialisation complète demandée');
      this.stableDataService.forceResetAllData();
      
      // Recharger les données après réinitialisation
      setTimeout(() => {
        this.stableDataService.loadStableData(true);
      }, 500);
      
      this.successMessage = 'Toutes les données ont été réinitialisées. Vos comptes sont maintenant complètement vides.';
      setTimeout(() => this.successMessage = '', 8000);
    }
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return 'Aucun solde';
    if (amount === 0) return 'Compte vide';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  formatCurrencySimple(amount: number | undefined): string {
    if (amount === undefined || amount === null || amount === 0) return '0,00 €';
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

    try {
      // Utiliser le service de données stables pour l'opération
      this.stableDataService.executeDepot(
        this.depotForm.numeroCompte,
        this.depotForm.montant,
        this.depotForm.description || 'Dépôt'
      );
      
      this.successMessage = `Dépôt de ${this.formatCurrency(this.depotForm.montant)} effectué avec succès`;
      this.showDepotForm = false;
      this.resetDepotForm();
      setTimeout(() => this.successMessage = '', 5000);
      
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors du dépôt';
    }
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

    try {
      // Utiliser le service de données stables pour l'opération
      this.stableDataService.executeRetrait(
        this.retraitForm.numeroCompte,
        this.retraitForm.montant,
        this.retraitForm.description || 'Retrait'
      );
      
      this.successMessage = `Retrait de ${this.formatCurrency(this.retraitForm.montant)} effectué avec succès`;
      this.showRetraitForm = false;
      this.resetRetraitForm();
      setTimeout(() => this.successMessage = '', 5000);
      
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors du retrait';
    }
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

    try {
      // Utiliser le service de données stables pour l'opération
      this.stableDataService.executeVirement(
        this.virementForm.compteSource,
        this.virementForm.compteDestinataire,
        this.virementForm.montant,
        this.virementForm.description || 'Virement'
      );
      
      this.successMessage = `Virement de ${this.formatCurrency(this.virementForm.montant)} effectué avec succès`;
      this.showVirementForm = false;
      this.resetVirementForm();
      setTimeout(() => this.successMessage = '', 5000);
      
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors du virement';
    }
  }

  openCreateAccountForm(): void {
    console.log('ProfilComponent: Ouverture formulaire création compte...');
    
    // Réinitialiser le formulaire
    this.createAccountForm.typeCompte = 'COURANT';
    this.errorMessage = '';
    this.successMessage = '';
    
    this.showCreateAccountForm = true;
  }

  creerCompte(): void {
    try {
      // Utiliser le service de données stables pour créer le compte
      this.stableDataService.createNewAccount(this.createAccountForm.typeCompte as 'COURANT' | 'EPARGNE');
      
      this.successMessage = `Compte ${this.createAccountForm.typeCompte.toLowerCase()} créé avec succès`;
      this.showCreateAccountForm = false;
      
      console.log('ProfilComponent: Nombre total de comptes:', this.comptes.length);
      setTimeout(() => this.successMessage = '', 5000);
      
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors de la création du compte';
    }
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
  closeCreateAccountForm(): void { this.showCreateAccountForm = false; }

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
    
    // Filtrer les transactions pour ce compte et cette période
    const dateDebut = new Date(this.releveForm.dateDebut);
    const dateFin = new Date(this.releveForm.dateFin);
    dateFin.setHours(23, 59, 59, 999); // Inclure toute la journée de fin
    
    const transactionsFiltrees = this.allTransactions.filter(transaction => {
      if (transaction.compteNumero !== this.releveForm.numeroCompte) return false;
      
      const dateTransaction = new Date(transaction.dateTransaction || '');
      return dateTransaction >= dateDebut && dateTransaction <= dateFin;
    });
    
    console.log('Transactions filtrées pour le relevé:', transactionsFiltrees.length);
    
    // Générer automatiquement le PDF
    this.generatePDF(transactionsFiltrees);
    this.successMessage = 'Relevé PDF téléchargé avec succès';
    this.showReleveForm = false;
    setTimeout(() => this.successMessage = '', 5000);
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

  editProfile(): void {
    if (this.client) {
      this.editForm = { ...this.client };
      this.showEditForm = true;
    }
  }

  closeEditForm(): void {
    this.showEditForm = false;
    this.editForm = {};
  }

  saveProfile(): void {
    if (!this.client?.id) return;
    
    this.clientService.update(this.client.id, this.editForm).subscribe({
      next: (updatedClient) => {
        this.client = updatedClient;
        this.successMessage = 'Profil mis à jour avec succès';
        this.showEditForm = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour';
      }
    });
  }

  deleteAccount(): void {
    if (!this.client?.id) return;
    
    const confirmation = confirm(
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et supprimera toutes vos données.'
    );
    
    if (confirmation) {
      this.clientService.delete(this.client.id).subscribe({
        next: () => {
          alert('Votre compte a été supprimé avec succès.');
          this.authService.logout();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la suppression du compte';
        }
      });
    }
  }
}
