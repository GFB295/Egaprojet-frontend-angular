import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ClientService, Client } from '../../services/client.service';

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

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder
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
    this.loadClients();
  }

  loadClients(): void {
    this.clientService.getAll().subscribe({
      next: (clients) => {
        this.clients = clients;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des clients';
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

  deleteClient(id: number): void {
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
}
