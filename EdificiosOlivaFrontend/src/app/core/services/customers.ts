import { Injectable } from '@angular/core';
import { Customer } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class Customers {
  private readonly storageKey = 'edificios-oliva-customers';

  getAll(): Customer[] {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      const seed = this.getSeedData();
      this.save(seed);
      return seed;
    }

    try {
      return (JSON.parse(stored) as Customer[]).map((customer) => ({
        ...customer,
        createdAt: customer.createdAt ? new Date(customer.createdAt) : undefined,
      }));
    } catch {
      const seed = this.getSeedData();
      this.save(seed);
      return seed;
    }
  }

  create(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const customers = this.getAll();
    const created: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.save([...customers, created]);
    return created;
  }

  update(id: string, customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const customers = this.getAll();
    const current = customers.find((item) => item.id === id);

    if (!current) {
      throw new Error('El cliente solicitado no existe.');
    }

    const updated: Customer = {
      ...current,
      ...customer,
      id,
    };

    this.save(customers.map((item) => (item.id === id ? updated : item)));
    return updated;
  }

  delete(id: string): void {
    this.save(this.getAll().filter((customer) => customer.id !== id));
  }

  private save(customers: Customer[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(customers));
  }

  private getSeedData(): Customer[] {
    return [
      {
        id: crypto.randomUUID(),
        name: 'Juan Pérez',
        email: 'juan@email.com',
        phone: '+1 829-555-1001',
        bookings: 4,
        status: 'Activo',
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: 'María López',
        email: 'maria@email.com',
        phone: '+1 829-555-1002',
        bookings: 2,
        status: 'Activo',
        createdAt: new Date(),
      },
    ];
  }
}
