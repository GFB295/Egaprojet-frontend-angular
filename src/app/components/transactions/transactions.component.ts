import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TransactionService, Transaction, OperationRequest, VirementRequest, ReleveRequest } from '../../services/transaction.service';
import { CompteService, Compte } from '../../services/compte.service';

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
    private fb: FormBuilder,
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
    this.loadComptes();
    this.loadTransactions();
  }

  loadComptes(): void {
    this.compteService.getAll().subscribe({
      next: (comptes) => {
        this.comptes = comptes;
      }
    });
  }

  loadTransactions(): void {
    // Load recent transactions or all transactions
    // For now, we'll show all
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
        next: () => {
          this.showSuccessAnimation = true;
          this.transactionType = 'depot';
          this.successMessage = `Dépôt de ${this.formatCurrency(this.depotForm.value.montant)} effectué avec succès !`;
          this.loadComptes();
          setTimeout(() => {
            this.closeForms();
            this.showSuccessAnimation = false;
            this.successMessage = '';
          }, 2500);
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
        next: () => {
          this.showSuccessAnimation = true;
          this.transactionType = 'retrait';
          this.successMessage = `Retrait de ${this.formatCurrency(this.retraitForm.value.montant)} effectué avec succès !`;
          this.loadComptes();
          setTimeout(() => {
            this.closeForms();
            this.showSuccessAnimation = false;
            this.successMessage = '';
          }, 2500);
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
        next: () => {
          this.showSuccessAnimation = true;
          this.transactionType = 'virement';
          this.successMessage = `Virement de ${this.formatCurrency(this.virementForm.value.montant)} effectué avec succès !`;
          this.loadComptes();
          setTimeout(() => {
            this.closeForms();
            this.showSuccessAnimation = false;
            this.successMessage = '';
          }, 2500);
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
      this.transactionService.getReleve(request).subscribe({
        next: (transactions) => {
          this.releveTransactions = transactions;
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors de la récupération du relevé';
        }
      });
    }
  }

  imprimerReleve(): void {
    if (this.releveForm.valid) {
      const request: ReleveRequest = this.releveForm.value;
      this.transactionService.imprimerReleve(request).subscribe({
        next: (blob) => {
          if (isPlatformBrowser(this.platformId)) {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `releve_${request.numeroCompte}.txt`;
            link.click();
            window.URL.revokeObjectURL(url);
          }
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors de l\'impression du relevé';
        }
      });
    }
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '0.00';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
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
