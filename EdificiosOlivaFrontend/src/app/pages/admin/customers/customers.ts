import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { Customers as CustomersService } from '../../../core/services/customers';

@Component({
  selector: 'app-customers',
  imports: [FormsModule],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class Customers implements OnInit {
  private readonly customersService = inject(CustomersService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  customers: Customer[] = [];
  search = '';
  statusFilter: 'Todos' | 'Activo' | 'Inactivo' = 'Todos';
  showForm = false;
  editingId: string | null = null;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  customerForm: Omit<Customer, 'id' | 'createdAt'> = this.getEmptyForm();

  ngOnInit(): void {
    void this.loadCustomers();
  }

  get filteredCustomers(): Customer[] {
    return this.customers;
  }

  async applyFilters(): Promise<void> {
    await this.loadCustomers();
  }

  openCreateForm(): void {
    this.editingId = null;
    this.customerForm = this.getEmptyForm();
    this.clearMessages();
    this.showForm = true;
  }

  openEditForm(customer: Customer): void {
    this.editingId = customer.id ?? null;
    this.customerForm = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      bookings: customer.bookings,
      status: customer.status,
    };
    this.clearMessages();
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
    this.editingId = null;
    this.customerForm = this.getEmptyForm();
  }

  async saveCustomer(): Promise<void> {
    this.clearMessages();

    const name = this.customerForm.name.trim();
    const email = this.customerForm.email.trim().toLowerCase();
    const phone = this.customerForm.phone.trim();

    if (!name || !email || !phone) {
      this.errorMessage = 'Completa nombre, correo y teléfono.';
      return;
    }

    const payload = {
      name,
      email,
      phone,
      status: this.customerForm.status,
    };

    this.saving = true;
    this.changeDetectorRef.markForCheck();

    try {
      if (this.editingId) {
        await firstValueFrom(this.customersService.update(this.editingId, payload));
        this.successMessage = 'Cliente actualizado correctamente.';
      } else {
        await firstValueFrom(this.customersService.create(payload));
        this.successMessage = 'Cliente creado correctamente.';
      }

      this.showForm = false;
      this.editingId = null;
      this.customerForm = this.getEmptyForm();
      await this.loadCustomers(false);
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar el cliente.';
    } finally {
      this.saving = false;
      this.changeDetectorRef.markForCheck();
    }
  }

  async deleteCustomer(customer: Customer): Promise<void> {
    if (!customer.id || !confirm(`¿Deseas eliminar a "${customer.name}"?`)) return;

    this.clearMessages();
    try {
      await firstValueFrom(this.customersService.delete(customer.id));
      this.successMessage = 'Cliente eliminado correctamente.';
      await this.loadCustomers(false);
    } catch (error: unknown) {
      this.errorMessage = error instanceof Error ? error.message : 'No fue posible eliminar el cliente.';
    }
  }

  shortId(id?: string): string {
    return id ? id.slice(0, 8) : '—';
  }

  private async loadCustomers(clearMessages = true): Promise<void> {
    this.loading = true;
    if (clearMessages) this.clearMessages();
    this.changeDetectorRef.markForCheck();

    try {
      this.customers = await firstValueFrom(
        this.customersService.getAll(this.search, this.statusFilter),
      );
    } catch (error: unknown) {
      this.customers = [];
      this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar los clientes.';
    } finally {
      this.loading = false;
      this.changeDetectorRef.markForCheck();
    }
  }

  private getEmptyForm(): Omit<Customer, 'id' | 'createdAt'> {
    return {
      name: '',
      email: '',
      phone: '',
      bookings: 0,
      status: 'Activo',
    };
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
