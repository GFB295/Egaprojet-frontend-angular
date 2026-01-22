import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TransactionService, Transaction, OperationRequest, VirementRequest, ReleveRequest } from '../../services/transaction.service';
import { CompteService, Compte } from '../../services/compte.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { DataCacheService } from '../../services/data-cache.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  comptes: Compte[] = [];
  showDepotForm: boolean = false;
  showRetraitForm: boolean = false;
  showVirementForm: boolean = false;
  showReleveForm: boolean = false;
  
  depotForm: FormGroup;
  retraitForm: FormGroup;
  virementForm: FormGroup;
  releveForm: FormGroup;
  
  errorMessage: string = '';
  releveTransactions: Transaction[] = [];
  successMessage: string = '';
  showSuccessAnimation: boolean = false;
  transactionType: string = '';

  constructor(
    private transactionService: TransactionService,
    private compteService: CompteService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private fb: FormBuilder,
    private dataCacheService: DataCacheService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.depotForm = this.fb.group({
      numeroCompte: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(0.01)]],
      description: ['']
    });

    this.retraitForm = this.fb.group({
      numeroCompte: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(0.01)]],
      description: ['']
    });

    this.virementForm = this.fb.group({
      compteSource: ['', Validators.required],
      compteDestinataire: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(0.01)]],
      description: ['']
    });

    this.releveForm = this.fb.group({
      numeroCompte: ['', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🚀 Transactions ngOnInit - DÉBUT avec cache');
    
    // S'abonner aux données du cache
    this.dataCacheService.dashboardData$.subscribe(data => {
      if (data) {
        console.log('💳 Données transactions reçues du cache');
        this.comptes = data.comptes;
        this.transactions = data.transactions;
      }
    });
    
    // Charger les données
    this.loadComptes();
    this.loadTransactions();
    
    // Recharger les données toutes les 60 secondes
    setInterval(() => {
      this.loadTransactions();
    }, 60000);
  }

  loadComptes(): void {
    console.log('🏦 loadComptes transactions - Utilisation du cache');
    
    // Vérifier si on a déjà des données en cache
    const cachedComptes = this.dataCacheService.getComptes();
    if (cachedComptes.length > 0) {
      console.log('✅ Comptes déjà en cache pour transactions:', cachedComptes.length);
      this.comptes = cachedComptes;
      return;
    }
    
    // Sinon, charger via le service de cache
    this.dataCacheService.getDashboardData().subscribe({
      next: (data) => {
        console.log('✅ Comptes chargés via cache service pour transactions');
      },
      error: (err) => {
        console.error('❌ Erreur comptes transactions:', err);
      }
    });
  }

  loadTransactions(): void {
    console.log('💳 loadTransactions - Utilisation du cache');
    
    // Vérifier si on a déjà des données en cache
    const cachedTransactions = this.dataCacheService.getTransactions();
    if (cachedTransactions.length > 0) {
      console.log('✅ Transactions déjà en cache:', cachedTransactions.length);
      this.transactions = cachedTransactions;
      return;
    }
    
    // Sinon, charger via le service de cache
    this.dataCacheService.getDashboardData().subscribe({
      next: (data) => {
        console.log('✅ Transactions chargées via cache service');
      },
      error: (err) => {
        console.error('❌ Erreur transactions:', err);
      }
    });
  }

  openDepotForm(): void {
    this.showDepotForm = true;
    this.depotForm.reset();
    this.errorMessage = '';
  }

  openRetraitForm(): void {
    this.showRetraitForm = true;
    this.retraitForm.reset();
    this.errorMessage = '';
  }

  openVirementForm(): void {
    this.showVirementForm = true;
    this.virementForm.reset();
    this.errorMessage = '';
  }

  openReleveForm(): void {
    this.showReleveForm = true;
    this.releveForm.reset();
    this.errorMessage = '';
    this.releveTransactions = [];
  }

  closeForms(): void {
    this.showDepotForm = false;
    this.showRetraitForm = false;
    this.showVirementForm = false;
    this.showReleveForm = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.showSuccessAnimation = false;
  }

  submitDepot(): void {
    if (this.depotForm.valid) {
      this.errorMessage = '';
      this.transactionService.depot(this.depotForm.value).subscribe({
        next: (transaction) => {
          this.showSuccessAnimation = true;
          this.transactionType = 'depot';
          const montant = this.formatCurrency(this.depotForm.value.montant);
          const soldeApres = transaction.soldeApres ? this.formatCurrency(transaction.soldeApres) : '';
          this.successMessage = `Dépôt de ${montant} effectué avec succès sur le compte ${this.depotForm.value.numeroCompte}. Nouveau solde: ${soldeApres}`;
          
          // Ajouter une notification
          this.notificationService.addTransactionNotification(
            'DEPOT',
            this.depotForm.value.montant,
            this.depotForm.value.numeroCompte
          );
          
          // Actualiser le cache immédiatement
          console.log('🔄 Actualisation du cache après dépôt...');
          this.dataCacheService.refreshData().subscribe({
            next: () => {
              console.log('✅ Cache actualisé après dépôt');
            },
            error: (err) => {
              console.error('❌ Erreur actualisation cache:', err);
            }
          });
          
          // Fermer le formulaire après 3 secondes avec feedback
          setTimeout(() => {
            this.closeForms();
            this.showSuccessAnimation = false;
            this.successMessage = '';
          }, 3000); // Réduit à 3 secondes pour une meilleure UX
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors du dépôt';
          this.showSuccessAnimation = false;
        }
      });
    }
  }

  submitRetrait(): void {
    if (this.retraitForm.valid) {
      this.errorMessage = '';
      this.transactionService.retrait(this.retraitForm.value).subscribe({
        next: (transaction) => {
          this.showSuccessAnimation = true;
          this.transactionType = 'retrait';
          const montant = this.formatCurrency(this.retraitForm.value.montant);
          const soldeApres = transaction.soldeApres ? this.formatCurrency(transaction.soldeApres) : '';
          this.successMessage = `Retrait de ${montant} effectué avec succès sur le compte ${this.retraitForm.value.numeroCompte}. Nouveau solde: ${soldeApres}`;
          
          // Ajouter une notification
          this.notificationService.addTransactionNotification(
            'RETRAIT',
            this.retraitForm.value.montant,
            this.retraitForm.value.numeroCompte
          );
          
          // Actualiser le cache immédiatement
          console.log('🔄 Actualisation du cache après retrait...');
          this.dataCacheService.refreshData().subscribe({
            next: () => {
              console.log('✅ Cache actualisé après retrait');
            },
            error: (err) => {
              console.error('❌ Erreur actualisation cache:', err);
            }
          });
          
          // Fermer le formulaire après 3 secondes avec feedback
          setTimeout(() => {
            this.closeForms();
            this.showSuccessAnimation = false;
            this.successMessage = '';
          }, 3000); // Réduit à 3 secondes pour une meilleure UX
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors du retrait';
          this.showSuccessAnimation = false;
        }
      });
    }
  }

  submitVirement(): void {
    if (this.virementForm.valid) {
      if (this.virementForm.value.compteSource === this.virementForm.value.compteDestinataire) {
        this.errorMessage = 'Le compte source et le compte destinataire doivent être différents';
        return;
      }
      this.errorMessage = '';
      this.transactionService.virement(this.virementForm.value).subscribe({
        next: (transaction) => {
          this.showSuccessAnimation = true;
          this.transactionType = 'virement';
          const montant = this.formatCurrency(this.virementForm.value.montant);
          const soldeApres = transaction.soldeApres ? this.formatCurrency(transaction.soldeApres) : '';
          this.successMessage = `Virement de ${montant} effectué avec succès depuis le compte ${this.virementForm.value.compteSource} vers ${this.virementForm.value.compteDestinataire}. Nouveau solde compte source: ${soldeApres}`;
          
          // Ajouter une notification
          this.notificationService.addTransactionNotification(
            'VIREMENT',
            this.virementForm.value.montant,
            this.virementForm.value.compteSource
          );
          
          // Actualiser le cache immédiatement
          console.log('🔄 Actualisation du cache après virement...');
          this.dataCacheService.refreshData().subscribe({
            next: () => {
              console.log('✅ Cache actualisé après virement');
            },
            error: (err) => {
              console.error('❌ Erreur actualisation cache:', err);
            }
          });
          
          // Fermer le formulaire après 3 secondes avec feedback
          setTimeout(() => {
            this.closeForms();
            this.showSuccessAnimation = false;
            this.successMessage = '';
          }, 3000); // Réduit à 3 secondes pour une meilleure UX
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors du virement';
          this.showSuccessAnimation = false;
        }
      });
    }
  }

  submitReleve(): void {
    if (this.releveForm.valid) {
      const request: ReleveRequest = this.releveForm.value;
      this.errorMessage = '';
      this.transactionService.getReleve(request).subscribe({
        next: (transactions) => {
          this.releveTransactions = transactions;
          if (transactions.length === 0) {
            this.errorMessage = 'Aucune transaction trouvée pour cette période';
          }
        },
        error: (err) => {
          console.error('Erreur lors de la récupération du relevé:', err);
          this.errorMessage = err.error?.message || 'Erreur lors de la récupération du relevé';
          this.releveTransactions = [];
        }
      });
    }
  }

  async imprimerReleve(): Promise<void> {
    if (this.releveForm.valid && this.releveTransactions.length > 0) {
      const request: ReleveRequest = this.releveForm.value;
      this.errorMessage = '';
      
      // Générer le PDF directement
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const compte = this.comptes.find(c => c.numeroCompte === request.numeroCompte);
      
      // En-tête
      doc.setFontSize(20);
      doc.text('RELEVE BANCAIRE', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      if (compte) {
        doc.text(`Compte: ${request.numeroCompte}`, 20, 35);
        doc.text(`Type: ${compte.typeCompte}`, 20, 42);
      }
      const dateDebut = new Date(request.dateDebut).toLocaleDateString('fr-FR');
      const dateFin = new Date(request.dateFin).toLocaleDateString('fr-FR');
      doc.text(`Période: ${dateDebut} - ${dateFin}`, 20, 49);
      
      // Tableau des transactions
      let y = 60;
      doc.setFontSize(10);
      doc.text('Date', 20, y);
      doc.text('Type', 60, y);
      doc.text('Montant', 100, y);
      doc.text('Solde après', 150, y);
      y += 10;
      
      this.releveTransactions.forEach(transaction => {
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
      const fileName = `releve_${request.numeroCompte}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } else {
      this.errorMessage = 'Veuillez d\'abord afficher le relevé';
    }
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  formatCurrencyForPDF(amount: number | undefined): string {
    if (amount === undefined || isNaN(amount)) return '0,00';
    // Formatage simple sans symboles spéciaux
    return amount.toFixed(2).replace('.', ',');
  }

  getTransactionTypeClass(type: string): string {
    switch (type) {
      case 'DEPOT':
        return 'badge badge-success';
      case 'RETRAIT':
        return 'badge badge-danger';
      case 'VIREMENT':
        return 'badge badge-info';
      default:
        return 'badge';
    }
  }
}
