import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getRuntimePortalMode, getRuntimeTenantId } from '../shared/runtime-config.util';

/** Route a dedicated deployment directly into its configured restaurant portal. */
export const portalRootGuard: CanActivateFn = () => {
  const router = inject(Router);
  const mode = getRuntimePortalMode();
  const tenantId = getRuntimeTenantId();

  if (mode === 'customer' && tenantId) {
    return router.createUrlTree(['/public-menu', tenantId]);
  }
  if (mode === 'staff') {
    return router.createUrlTree(['/login'], {
      queryParams: tenantId ? { tenant: tenantId } : undefined,
    });
  }
  if (mode === 'management') {
    return router.createUrlTree(['/management/login'], {
      queryParams: tenantId ? { tenant: tenantId } : undefined,
    });
  }
  return true;
};
