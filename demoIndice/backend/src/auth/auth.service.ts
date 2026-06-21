import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { serialize } from 'cookie';
import { AppConfigService } from '../config/app-config.service';
import { RequestWithSession, SessionContext } from '../common/types/session-context';
import { AuthRepository } from './auth.repository';
import { DemoUserRow } from './auth.types';
import { RegisterDto } from './dto/register.dto';
import { RegistrationRepository } from './registration.repository';
import { SessionsRepository } from './sessions.repository';
import { createOpaqueToken, hashToken, safeTokenEqual, toMysqlDate } from './session-token';

const SESSION_HOURS = 8;

@Injectable()
export class AuthService {
  constructor(
    private readonly config: AppConfigService,
    private readonly authRepository: AuthRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  normalizeCompanySlug(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  sessionCookie(token: string) {
    return serialize(this.config.cookieName, token, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
  }

  clearSessionCookie() {
    return serialize(this.config.cookieName, '', {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  cookieName() {
    return this.config.cookieName;
  }

  async login(payload: { company: string; email: string; password: string }) {
    const companySlug = this.normalizeCompanySlug(payload.company);
    const account = await this.authRepository.findAccount(companySlug, payload.company);

    if (!account) {
      throw new NotFoundException({ code: 'unknown_company', message: 'Company was not found.' });
    }
    if (account.environment === 'external') {
      return {
        kind: 'redirect' as const,
        route: {
          companyName: account.company_name,
          companySlug: account.company_slug,
          environment: 'production',
          appUrl: account.destination_url,
          status: account.status,
        },
      };
    }

    const user = await this.authRepository.findUserByEmail(account.id, payload.email);
    if (!user || !(await argon2.verify(user.password_hash, payload.password))) {
      throw new UnauthorizedException({ code: 'invalid_login', message: 'Invalid email or password.' });
    }

    return {
      kind: 'authenticated' as const,
      ...await this.issueSession({
        accountId: account.id,
        companyName: account.company_name,
        companySlug: account.company_slug,
        user,
      }),
    };
  }

  async register(payload: RegisterDto) {
    const companyName = payload.companyName.trim().toUpperCase();
    const companySlug = this.normalizeCompanySlug(companyName);
    const email = payload.email.trim().toLowerCase();

    if (!companySlug) {
      throw new BadRequestException('Company name must contain letters or numbers.');
    }

    if (await this.authRepository.findAccount(companySlug, companyName)) {
      throw new ConflictException('Company already exists. Sign in or choose another company name.');
    }

    const passwordHash = await argon2.hash(payload.password);
    const workspace = await this.registrationRepository.createDemoWorkspace({
      companyName,
      companySlug,
      email,
      passwordHash,
      ...this.namesFromEmail(email),
    });

    return {
      kind: 'authenticated' as const,
      ...await this.issueSession({
        accountId: workspace.accountId,
        companyName: workspace.companyName,
        companySlug: workspace.companySlug,
        user: workspace.user,
      }),
    };
  }

  private async issueSession(params: {
    accountId: number;
    companyName: string;
    companySlug: string;
    user: Pick<DemoUserRow, 'id' | 'email' | 'first_name' | 'last_name' | 'role'>;
  }) {
    const sessionToken = createOpaqueToken();
    const csrfToken = createOpaqueToken();
    const csrfTokenHash = hashToken(csrfToken);

    await this.sessionsRepository.create({
      tokenHash: hashToken(sessionToken),
      csrfTokenHash,
      accountId: params.accountId,
      userId: params.user.id,
      expiresAt: toMysqlDate(new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)),
    });

    return {
      cookieToken: sessionToken,
      session: this.toAuthSession({
        sessionId: 0,
        accountId: params.accountId,
        companyName: params.companyName,
        companySlug: params.companySlug,
        userId: params.user.id,
        csrfTokenHash,
        role: params.user.role,
        email: params.user.email,
        firstName: params.user.first_name,
        lastName: params.user.last_name,
      }, csrfToken),
    };
  }

  private namesFromEmail(email: string) {
    const localPart = email.split('@')[0]?.replace(/[^a-z0-9]+/gi, ' ').trim();
    const firstName = localPart
      ? localPart.split(/\s+/).map((part) => `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`).join(' ')
      : 'Demo';

    return {
      firstName: firstName.slice(0, 100),
      lastName: 'Admin',
    };
  }

  async loadSessionFromRequest(request: RequestWithSession): Promise<SessionContext | null> {
    const token = request.cookies?.[this.config.cookieName];
    if (!token || typeof token !== 'string') return null;
    return this.sessionsRepository.findByTokenHash(hashToken(token));
  }

  async logout(request: RequestWithSession) {
    const token = request.cookies?.[this.config.cookieName];
    if (typeof token === 'string') {
      await this.sessionsRepository.deleteByTokenHash(hashToken(token));
    }
  }

  async rotateCsrf(session: SessionContext) {
    const csrfToken = createOpaqueToken();
    await this.sessionsRepository.updateCsrfHash(session.sessionId, hashToken(csrfToken));
    return this.toAuthSession({ ...session, csrfTokenHash: hashToken(csrfToken) }, csrfToken);
  }

  verifyCsrf(session: SessionContext, csrfToken: string | undefined) {
    if (!csrfToken || !safeTokenEqual(session.csrfTokenHash, hashToken(csrfToken))) {
      throw new UnauthorizedException({ code: 'invalid_csrf', message: 'Invalid CSRF token.' });
    }
  }

  toAuthSession(session: SessionContext, csrfToken?: string) {
    return {
      user: {
        id: session.userId,
        name: `${session.firstName} ${session.lastName}`.trim(),
        email: session.email,
        role: session.role,
        module_slugs: ['config_center'],
        tab_permission_keys: [
          'config_center.profile',
          'config_center.business-structure',
          'config_center.business-profile',
          'config_center.personal-performance',
          'config_center.users',
        ],
        tab_permissions_configured: true,
      },
      company: {
        id: session.accountId,
        name: session.companyName,
        slug: session.companySlug,
      },
      csrfToken,
    };
  }
}
