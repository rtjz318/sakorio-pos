import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { isCustomerPublicHost } from '../shared/host-portal.util';

/**
 * Keeps `/orders` public on the customer host while redirecting staff/admin
 * traffic to the authenticated operator queue on app/staff hosts.
 */
export const ordersRouteGuard: CanActivateFn = () => {
  if (isCustomerPublicHost()) {
    return true;
  }

  const api = inject(ApiService);
  const router = inject(Router);

  const cached = api.getCurrentUser();
  if (cached) {
    return router.createUrlTree(['/staff/orders']);
  }

  return api.checkAuth().pipe(
    map((user) => (user ? router.createUrlTree(['/staff/orders']) : router.createUrlTree(['/login']))),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
