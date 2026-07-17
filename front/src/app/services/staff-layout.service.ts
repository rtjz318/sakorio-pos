import { Injectable, signal } from '@angular/core';

/**
 * Tablet-oriented layout: collapse the main nav sidebar and toggle browser fullscreen
 * for Orders / Tables flows.
 */
@Injectable({ providedIn: 'root' })
export class StaffLayoutService {
  private static readonly NAV_SCROLL_PREFIX = 'pos-staff-nav-scroll:';
  private static readonly NAV_COLLAPSED_STORAGE_KEY = 'pos-staff-nav-collapsed';
  private static readonly COMPACT_NAV_BREAKPOINT = 1180;

  /** When true, main sidebar is hidden (desktop/tablet) so content uses full width. */
  readonly sidebarCollapsed = signal(false);

  readonly fullscreenActive = signal(false);

  constructor() {
    this.restoreSidebarPreference();

    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', () => {
        this.fullscreenActive.set(!!document.fullscreenElement);
      });
    }
  }

  toggleSidebarCollapsed(): void {
    this.setSidebarCollapsed(!this.sidebarCollapsed());
  }

  toggleFullscreen(): void {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  }

  /** Persist main nav list scroll position across staff route changes (per tenant/user). */
  getNavScrollTop(storageKey: string): number | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(StaffLayoutService.NAV_SCROLL_PREFIX + storageKey);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  setNavScrollTop(storageKey: string, top: number): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      StaffLayoutService.NAV_SCROLL_PREFIX + storageKey,
      String(Math.max(0, Math.round(top)))
    );
  }

  private restoreSidebarPreference(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem(StaffLayoutService.NAV_COLLAPSED_STORAGE_KEY);
    if (saved === 'true' || saved === 'false') {
      this.sidebarCollapsed.set(saved === 'true');
      return;
    }

    this.sidebarCollapsed.set(window.innerWidth <= StaffLayoutService.COMPACT_NAV_BREAKPOINT);
  }

  private setSidebarCollapsed(value: boolean): void {
    this.sidebarCollapsed.set(value);
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(StaffLayoutService.NAV_COLLAPSED_STORAGE_KEY, value ? 'true' : 'false');
  }
}
