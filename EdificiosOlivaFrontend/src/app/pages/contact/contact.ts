import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * There is no contact endpoint in the backend, so the form hands the message over to
 * WhatsApp (the channel the business already answers) instead of posting it nowhere.
 */
@Component({
  selector: 'app-contact',
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  phone = '+1 (829) 619-6970';

  whatsapp = '18296196970';

  email = 'info@edificiosoliva.com';

  address = 'Edificios Oliva, Bávaro, Punta Cana, República Dominicana';

  form = { name: '', email: '', phone: '', message: '' };
  attempted = false;
  handedOff = false;

  get errors(): Partial<Record<'name' | 'email' | 'message', string>> {
    const errors: Partial<Record<'name' | 'email' | 'message', string>> = {};

    if (this.form.name.trim().length < 2) {
      errors.name = 'Ingresa tu nombre.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      errors.email = 'Ingresa un correo electrónico válido.';
    }

    if (this.form.message.trim().length < 5) {
      errors.message = 'Escribe tu mensaje.';
    }

    return errors;
  }

  get whatsappUrl(): string {
    const lines = [
      `Hola, soy ${this.form.name.trim()}.`,
      this.form.message.trim(),
      `Correo: ${this.form.email.trim()}`,
      this.form.phone.trim() ? `Teléfono: ${this.form.phone.trim()}` : '',
    ].filter(Boolean);

    return `https://wa.me/${this.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  submit(): void {
    this.attempted = true;
    this.handedOff = false;

    if (Object.keys(this.errors).length > 0) {
      document.querySelector<HTMLElement>('.contact-form [aria-invalid="true"]')?.focus();
      return;
    }

    window.open(this.whatsappUrl, '_blank', 'noopener,noreferrer');
    this.handedOff = true;
  }
}
