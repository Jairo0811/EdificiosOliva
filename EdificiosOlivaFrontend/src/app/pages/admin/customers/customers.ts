import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

  customers: Customer[] = [];
  search = '';
  statusFilter: 'Todos' | 'Activo' | 'Inactivo' = 'Todos';
  showForm = false;
  editingId: string | null = null;
  successMessage = '';
  errorMessage = '';

  customerForm: Omit<Customer, 'id' | 'createdAt'> = this.getEmptyForm();

  ngOnInit(): void {
    this.loadCustomers();
  }

  get filteredCustomers(): Customer[] {
    const term = this.search.trim().toLowerCase();

    return this.customers.filter((customer) => {
      const matchesSearch =
        !term ||
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term);

      const matchesStatus =
        this.statusFilter === 'Todos' || customer.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
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
    this.showForm = false;
    this.editingId = null;
    this.customerForm = this.getEmptyForm();
  }

  saveCustomer(): void {
    this.clearMessages();

    const name = this.customerForm.name.trim();
    const email = this.customerForm.email.trim().toLowerCase();
    const phone = this.customerForm.phone.trim();

    if (!name || !email || !phone) {
      this.errorMessage = 'Completa nombre, correo y teléfono.';
      return;
    }

    const duplicatedEmail = this.customers.some(
      (customer) =>
        customer.email.toLowerCase() === email && customer.id !== this.editingId,
    );

    if (duplicatedEmail) {
      this.errorMessage = 'Ya existe un cliente registrado con ese correo.';
      return;
    }

    const payload = {
      ...this.customerForm,
      name,
      email,
      phone,
      bookings: Math.max(0, Number(this.customerForm.bookings) || 0),
    };

    try {
      if (this.editingId) {
        this.customersService.update(this.editingId, payload);
        this.successMessage = 'Cliente actualizado correctamente.';
      } else {
        this.customersService.create(payload);
        this.successMessage = 'Cliente creado correctamente.';
      }

      this.loadCustomers();
      this.closeForm();
    } catch (error: unknown) {
      this.errorMessage =
        error instanceof Error ? error.message : 'No fue posible guardar el cliente.';
    }
  }

  deleteCustomer(customer: Customer): void {
    if (!customer.id || !confirm(`¿Deseas eliminar a "${customer.name}"?`)) {
      return;
    }

    this.customersService.delete(customer.id);
    this.loadCustomers();
    this.successMessage = 'Cliente eliminado correctamente.';
  }

  shortId(id?: string): string {
    return id ? id.slice(0, 8) : '—';
  }

  private loadCustomers(): void {
    this.customers = this.customersService.getAll();
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
