import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { SessionGuard } from '../common/guards/session.guard';
import { RequestWithSession, SessionContext } from '../common/types/session-context';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { HumanChallengeService } from './human-challenge.service';

type HeaderResponse = {
  header: (name: string, value: string) => void;
};

@Controller('/api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly humanChallenge: HumanChallengeService,
  ) {}

  @Get('challenge/:purpose')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  challenge(@Param('purpose') purpose: string) {
    return this.humanChallenge.create(purpose);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: HeaderResponse) {
    this.humanChallenge.verify('login', body);
    const result = await this.authService.login(body);
    if (result.kind === 'authenticated') {
      response.header('Set-Cookie', this.authService.sessionCookie(result.cookieToken));
    }
    return result.kind === 'authenticated'
      ? { kind: result.kind, session: result.session }
      : result;
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) response: HeaderResponse) {
    this.humanChallenge.verify('register', body);
    const result = await this.authService.register(body);
    response.header('Set-Cookie', this.authService.sessionCookie(result.cookieToken));
    return { kind: result.kind, session: result.session };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentSession() session: SessionContext) {
    return this.authService.rotateCsrf(session);
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() request: RequestWithSession, @Res({ passthrough: true }) response: HeaderResponse) {
    await this.authService.logout(request);
    response.header('Set-Cookie', this.authService.clearSessionCookie());
    return { success: true };
  }
}
