import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { RequestWithSession } from '../types/session-context';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const session = await this.authService.loadSessionFromRequest(request);

    if (!session) {
      throw new UnauthorizedException({ code: 'unauthenticated', message: 'Login required.' });
    }

    request.demoSession = session;
    return true;
  }
}
