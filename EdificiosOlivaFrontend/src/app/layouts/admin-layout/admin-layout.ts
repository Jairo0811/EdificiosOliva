import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AppUser } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth';

export interface AdminNavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

/** Every item maps to a real admin route (see app.routes.ts). */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: 'General',
    items: [{ label: 'Dashboard', icon: 'bi-grid-1x2-fill', link: '/admin', exact: true }],
  },
  {
    title: 'Alojamiento',
    items: [
      { label: 'Apartamentos', icon: 'bi-building-fill', link: '/admin/apartamentos' },
      { label: 'Galería', icon: 'bi-images', link: '/admin/galeria' },
    ],
  },
  {
    title: 'Reservas',
    items: [
      { label: 'Reservas', icon: 'bi-calendar-check-fill', link: '/admin/reservas' },
      { label: 'Clientes', icon: 'bi-people-fill', link: '/admin/clientes' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { label: 'Pagos', icon: 'bi-credit-card-fill', link: '/admin/pagos' },
      { label: 'Intentos de pago', icon: 'bi-shield-check', link: '/admin/intentos-pago' },
    ],
  },
  {
    title: 'Operación',
    items: [
      {
        label: 'Operación y analítica',
        icon: 'bi-bar-chart-line-fill',
        link: '/admin/operacion',
      },
    ],
  },
];

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  // No zone.js: Firebase callbacks and awaits need an explicit repaint.
  private readonly cdr = inject(ChangeDetectorRef);

  readonly navGroups = ADMIN_NAV;
  pageTitle = 'Panel Administrativo';

  menuOpen = false;
  loggingOut = false;
  profile: AppUser | null = null;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.closeMenu();
        this.pageTitle = this.titleFor(event.urlAfterRedirects);
        this.cdr.markForCheck();
      });

    this.authService.userProfile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        this.profile = profile;
        this.cdr.markForCheck();
      });
  }

  get displayName(): string {
    return this.profile?.displayName?.trim() || this.profile?.email || 'Administrador';
  }

  private titleFor(url: string): string {
    const path = url.split('?')[0].split('#')[0];
    const items = this.navGroups.flatMap((group) => group.items);
    const match = items
      .filter((item) => (item.exact ? path === item.link : path.startsWith(item.link)))
      .sort((a, b) => b.link.length - a.link.length)[0];

    return match?.label ?? 'Panel Administrativo';
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.cdr.detectChanges();
    if (this.menuOpen) {
      queueMicrotask(() =>
        document.querySelector<HTMLElement>('#admin-sidebar nav a')?.focus(),
      );
    } else {
      queueMicrotask(() =>
        document.querySelector<HTMLElement>('.mobile-menu')?.focus(),
      );
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (!this.menuOpen) return;
    this.closeMenu();
    this.cdr.markForCheck();
    queueMicrotask(() =>
      document.querySelector<HTMLElement>('.mobile-menu')?.focus(),
    );
  }

  async logout(): Promise<void> {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;

    try {
      await this.authService.logout();
      await this.router.navigateByUrl('/');
    } finally {
      this.loggingOut = false;
      this.cdr.markForCheck();
    }
  }
}
