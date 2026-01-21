import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  transactionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      const notifications = JSON.parse(stored).map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
      this.notificationsSubject.next(notifications);
    }
  }

  addNotification(type: Notification['type'], message: string, transactionId?: string): void {
    const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      type,
      message,
      timestamp: new Date(),
      transactionId
    };

    const current = this.notificationsSubject.value;
    const updated = [notification, ...current].slice(0, 50); // Garder max 50 notifications
    this.notificationsSubject.next(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
  }

  addTransactionNotification(transactionType: string, montant: number, compteNumero: string): void {
    // Validation des paramètres
    if (!transactionType || montant === undefined || montant === null || isNaN(montant) || !compteNumero) {
      console.error('Paramètres invalides pour la notification de transaction:', { transactionType, montant, compteNumero });
      return;
    }

    const typeLabels: { [key: string]: string } = {
      'DEPOT': 'Dépôt',
      'RETRAIT': 'Retrait',
      'VIREMENT': 'Virement'
    };

    const label = typeLabels[transactionType] || transactionType;
    const montantFormatted = new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(Math.abs(montant)); // Utiliser Math.abs pour éviter les montants négatifs

    let message = '';
    if (transactionType === 'DEPOT') {
      message = `Dépôt de ${montantFormatted} effectué sur le compte ${compteNumero}`;
    } else if (transactionType === 'RETRAIT') {
      message = `Retrait de ${montantFormatted} effectué sur le compte ${compteNumero}`;
    } else if (transactionType === 'VIREMENT') {
      message = `Virement de ${montantFormatted} effectué depuis le compte ${compteNumero}`;
    } else {
      message = `Transaction de ${montantFormatted} effectuée sur le compte ${compteNumero}`;
    }

    this.addNotification('success', message);
  }

  removeNotification(id: string): void {
    const current = this.notificationsSubject.value;
    const updated = current.filter(n => n.id !== id);
    this.notificationsSubject.next(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
  }

  clearNotifications(): void {
    this.notificationsSubject.next([]);
    localStorage.removeItem('notifications');
  }

  getNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }
}
