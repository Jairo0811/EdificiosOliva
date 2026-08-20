import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { User } from 'firebase/auth';
import { filter } from 'rxjs';

import { AuthService } from '../../core/services/auth';
import { AppUser } from '../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  firebaseUser: User | null = null;
  profile: AppUser | null = null;

  menuOpen = false;
  userMenuOpen = false;
  loggingOut = false;
  isAdminRoute = false;

  ngOnInit(): void {
    this.updateAdminRoute(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.updateAdminRoute(event.urlAfterRedirects);
        this.closeMenus();
      });

    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (user) => {
      this.firebaseUser = user;

      this.profile = user ? await this.authService.getUserProfile(user.uid) : null;
    });
  }

  get displayName(): string {
    return (
      this.profile?.displayName?.trim() ||
      this.firebaseUser?.displayName?.trim() ||
      this.firebaseUser?.email?.split('@')[0] ||
      'Usuario'
    );
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;

    if (!this.menuOpen) {
      this.userMenuOpen = false;
    }
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeMenus(): void {
    this.menuOpen = false;
    this.userMenuOpen = false;
  }

  async logout(): Promise<void> {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;

    try {
      await this.authService.logout();
      this.closeMenus();
      await this.router.navigateByUrl('/');
    } finally {
      this.loggingOut = false;
    }
  }

  private updateAdminRoute(url: string): void {
    this.isAdminRoute = url === '/admin' || url.startsWith('/admin/');
  }
}
