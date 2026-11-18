import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.csrfToken() || getCookie('XSRF-TOKEN');

  let modifiedReq = req.clone({
    withCredentials: true
  });

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase()) && token) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        'X-CSRF-Token': token
      }
    });
  }

  return next(modifiedReq);
};

function getCookie(name: string): string | null {
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}
