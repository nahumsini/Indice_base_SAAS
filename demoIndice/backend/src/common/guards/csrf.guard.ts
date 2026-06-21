import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { RequestWithSession } from '../types/session-context';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const header = request.headers['x-csrf-token'];
    const token = Array.isArray(header) ? header[0] : header;

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    this.authService.verifyCsrf(request.demoSession!, token);
    return true;
  }
}
