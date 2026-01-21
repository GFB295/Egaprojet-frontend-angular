import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { DataCacheService } from '../../services/data-cache.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css']
})
export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  showForm: boolean = false;
  clientForm: FormGroup;
  editingClient: Client | null = null;
  errorMessage: string = '';
  isLoading: boolean = true;

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder,
    private authService: AuthService,
    private dataCacheService: DataCacheService
  ) {
    this.clientForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      sexe: ['', [Validators.required, Validators.pattern(/^[MF]$/)]],
      adresse: ['', Validators.required],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
      courriel: ['', [Validators.required, Validators.email]],
      nationalite: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🚀 Clients ngOnInit - DÉBUT avec cache');
    console.log('🚀 Clients ngOnInit - Utilisateur connecté:', this.authService?.isAuthenticated());
    
    // S'abonner aux données du cache
    this.dataCacheService.dashboardData$.subscribe(data => {
      if (data) {
        console.log('👥 Clients reçus du cache:', data.clients.length);
        this.clients = data.clients;
        this.isLoading = false;
      }
    });

    // S'abonner à l'état de chargement
    this.dataCacheService.isLoading$.subscribe(loading => {
      this.isLoading = loading;
    });
    
    // Charger les données si pas encore en cache
    this.loadClients();
  }

  loadClients(): void {
    console.log('👥 loadClients - Utilisation du cache');
    
    // Vérifier si on a déjà des données en cache
    const cachedClients = this.dataCacheService.getClients();
    if (cachedClients.length > 0) {
      console.log('✅ Clients déjà en cache:', cachedClients.length);
      this.clients = cachedClients;
      this.isLoading = false;
      return;
    }
    
    // Sinon, charger via le service de cache
    this.dataCacheService.getDashboardData().subscribe({
      next: (data) => {
        console.log('✅ Clients chargés via cache service');
      },
      error: (err) => {
        console.error('❌ ERREUR complète clients:', err);
        this.errorMessage = 'Erreur lors du chargement des clients: ' + (err.message || 'Erreur inconnue');
        this.isLoading = false;
        this.clients = [];
      }
    });
  }

  openAddForm(): void {
    this.editingClient = null;
    this.clientForm.reset();
    this.showForm = true;
    this.errorMessage = '';
  }

  openEditForm(client: Client): void {
    this.editingClient = client;
    this.clientForm.patchValue(client);
    this.showForm = true;
    this.errorMessage = '';
  }

  closeForm(): void {
    this.showForm = false;
    this.editingClient = null;
    this.clientForm.reset();
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.clientForm.valid) {
      const clientData = this.clientForm.value;
      this.errorMessage = '';

      if (this.editingClient) {
        this.clientService.update(this.editingClient.id!, clientData).subscribe({
          next: () => {
            this.loadClients();
            this.closeForm();
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Erreur lors de la modification';
          }
        });
      } else {
        this.clientService.create(clientData).subscribe({
          next: () => {
            this.loadClients();
            this.closeForm();
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Erreur lors de la création';
          }
        });
      }
    }
  }

  deleteClient(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      this.clientService.delete(id).subscribe({
        next: () => {
          this.loadClients();
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors de la suppression';
        }
      });
    }
  }

  testConnection(): void {
    console.log('🧪 Test connexion clients démarré');
    console.log('🧪 Utilisateur authentifié:', this.authService.isAuthenticated());
    console.log('🧪 Token présent:', !!this.authService.getToken());
    
    this.clientService.getAll().subscribe({
      next: (clients) => {
        console.log('🧪 ✅ Test clients réussi:', clients.length);
        alert(`Test réussi: ${clients.length} clients trouvés`);
        this.clients = clients;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('🧪 ❌ Test clients échoué:', err);
        alert(`Test échoué: ${err.status} - ${err.message}`);
      }
    });
  }
}
