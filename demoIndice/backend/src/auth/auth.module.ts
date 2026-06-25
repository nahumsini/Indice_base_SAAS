import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { HumanChallengeService } from './human-challenge.service';
import { RegistrationRepository } from './registration.repository';
import { SessionsRepository } from './sessions.repository';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, HumanChallengeService, RegistrationRepository, SessionsRepository],
  exports: [AuthService],
})
export class AuthModule {}
