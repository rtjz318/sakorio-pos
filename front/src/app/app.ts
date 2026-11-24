import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LanguageService } from './services/language.service';
import { environment } from '../environments/environment';
import {
  IpadPrinterWorkerService,
  TABLET_PRINTER_PROFILES_STORAGE_KEY,
  TabletPrinterProfile,
} from './services/ipad-printer-worker.service';
import { NativeSecureStorageService } from './services/native-secure-storage.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('front');
  private router = inject(Router);
  private routerSub?: Subscription;

  /** Inject so LanguageService initializes at bootstrap and applies browser default language everywhere from first load. */
  private languageService = inject(LanguageService);
  private printerWorker = inject(IpadPrinterWorkerService);
  private secureStorage = inject(NativeSecureStorageService);

  ngOnInit() {
    // Set initial favicon based on current route
    this.updateFavicon(this.router.url);

    // Listen to route changes and update favicon
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.updateFavicon(event.urlAfterRedirects);
        }
      });

    // The restaurant tablet must resume printing after an app or device restart
    // without requiring staff to revisit Settings. Profiles and agent tokens are
    // stored by the native Android Keystore-backed plugin, never localStorage.
    void this.startSavedPrinterProfiles();
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  private updateFavicon(_url: string) {
    // Dev: white | Staging: blue | Production: orange (all routes)
    if (!environment.production) {
      this.setFavicon('/favicon-dev.svg');
      return;
    }
    if (environment.staging) {
      this.setFavicon('/favicon-admin.svg');
      return;
    }
    this.setFavicon('/favicon.svg');
  }

  private async startSavedPrinterProfiles(): Promise<void> {
    if (typeof window === 'undefined' || !this.secureStorage.refreshAvailability()) return;
    const stored = await this.secureStorage.get(TABLET_PRINTER_PROFILES_STORAGE_KEY);
    if (!stored) return;
    try {
      const profiles = JSON.parse(stored) as TabletPrinterProfile[];
      if (!Array.isArray(profiles)) return;
      this.printerWorker.configureProfiles(profiles);
      this.printerWorker.startAll();
    } catch {
      // Settings > Printing shows the actionable recovery message for corrupt
      // secure data; app startup itself should remain usable for order taking.
    }
  }

  private setFavicon(path: string) {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());

    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = `${path}?v=2.0.0`;
    document.head.appendChild(link);

    // Also update apple-touch-icon
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = path;
    document.head.appendChild(appleLink);
  }
}
