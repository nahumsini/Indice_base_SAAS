import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithSession, SessionContext } from '../types/session-context';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionContext => {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    if (!request.demoSession) {
      throw new Error('Session guard did not attach a session.');
    }
    return request.demoSession;
  },
);
