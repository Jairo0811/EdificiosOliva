import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ManualReconciliationRequest,
  PaymentIntentAdmin,
  PaymentIntentsService,
} from '../../../core/services/payment-intents';

@Component({
  selector: 'app-payment-intents-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-intents-admin.html',
  styleUrl: './payment-intents-admin.css',
})
export class PaymentIntentsAdmin implements OnInit {
  private readonly service = inject(PaymentIntentsService);

  intents: PaymentIntentAdmin[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  search = '';
  provider = '';
  status = 0;

  selected: PaymentIntentAdmin | null = null;
  reconciliation: ManualReconciliationRequest = {
    outcome: 1,
    providerTransactionId: '',
    notes: '',
  };

  ngOnInit(): void {
    this.load();
  }

  get needsReviewCount(): number {
    return this.intents.filter((intent) => intent.needsReview).length;
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service
      .getAll({
        page: 1,
        pageSize: 100,
        search: this.search,
        provider: this.provider,
        status: this.status || undefined,
      })
      .subscribe({
        next: (result) => {
          this.intents = result.items;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No fue posible cargar los intentos de pago.';
        },
      });
  }

  openReconciliation(intent: PaymentIntentAdmin): void {
    this.selected = intent;
    this.reconciliation = {
      outcome: 1,
      providerTransactionId: '',
      notes: '',
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeReconciliation(): void {
    if (!this.saving) {
      this.selected = null;
    }
  }

  reconcile(): void {
    if (!this.selected || !this.reconciliation.notes.trim()) {
      this.errorMessage = 'Describe cómo verificaste el resultado en el proveedor.';
      return;
    }

    if (
      this.reconciliation.outcome === 1 &&
      !this.reconciliation.providerTransactionId?.trim()
    ) {
      this.errorMessage =
        'Para confirmar un pago debes indicar la referencia verificada en el portal del proveedor.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.service
      .reconcile(this.selected.id, {
        outcome: this.reconciliation.outcome,
        providerTransactionId:
          this.reconciliation.providerTransactionId?.trim() || null,
        notes: this.reconciliation.notes.trim(),
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.selected = null;
          this.successMessage = 'Conciliación registrada correctamente.';
          this.load();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage =
            error?.error?.detail ||
            error?.error?.title ||
            'No fue posible guardar la conciliación.';
        },
      });
  }

  statusLabel(status: number): string {
    return (
      {
        1: 'Creado',
        2: 'Procesando',
        3: 'Esperando pago',
        4: 'Pagado',
        5: 'Fallido',
        6: 'Cancelado',
        7: 'Reembolsado',
      }[status] ?? 'Desconocido'
    );
  }

  shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }
}
