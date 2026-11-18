import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { of, switchMap } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return true;
  }

  return authService.checkSession().pipe(
    switchMap(isAuthenticated => {
      if (isAuthenticated) {
        return of(true);
      }
      router.navigate(['/login']);
      return of(false);
    })
  );
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    router.navigate(['/login']);
    return false;
  };
};
