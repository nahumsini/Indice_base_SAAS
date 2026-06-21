import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';
import { BusinessStructureRepository } from './business-structure.repository';
import { ConfigCenterController } from './config-center.controller';
import { ConfigCenterRepository } from './config-center.repository';
import { ConfigCenterService } from './config-center.service';
import { DashboardController } from './dashboard.controller';
import { SupportController } from './support.controller';
import { UsersDisabledController } from './users-disabled.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  controllers: [
    ConfigCenterController,
    DashboardController,
    SupportController,
    UsersDisabledController,
  ],
  providers: [
    AssessmentRepository,
    AssessmentService,
    BusinessStructureRepository,
    ConfigCenterRepository,
    ConfigCenterService,
    UsersService,
  ],
})
export class HomePanelModule {}
