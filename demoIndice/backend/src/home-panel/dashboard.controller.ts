import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { SessionGuard } from '../common/guards/session.guard';
import { SessionContext } from '../common/types/session-context';
import { AssessmentService } from './assessment.service';

@Controller('/api/v1/dashboard')
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Get('business-profile')
  businessProfile(@CurrentSession() session: SessionContext) {
    return this.assessmentService.getBusinessProfile(session);
  }

  @Put('business-profile')
  @UseGuards(CsrfGuard)
  saveBusinessProfile(@CurrentSession() session: SessionContext, @Body() body: Record<string, unknown>) {
    return this.assessmentService.saveBusinessProfile(session, body);
  }

  @Get('personal-performance/me')
  personalPerformance(@CurrentSession() session: SessionContext) {
    return this.assessmentService.getPersonalPerformance(session);
  }

  @Put('personal-performance/me')
  @UseGuards(CsrfGuard)
  savePersonalPerformance(@CurrentSession() session: SessionContext, @Body() body: Record<string, unknown>) {
    return this.assessmentService.savePersonalPerformance(session, body);
  }
}
