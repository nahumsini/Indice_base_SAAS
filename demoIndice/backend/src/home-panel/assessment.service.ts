import { Injectable } from '@nestjs/common';
import { SessionContext } from '../common/types/session-context';
import { AssessmentRepository } from './assessment.repository';

@Injectable()
export class AssessmentService {
  constructor(private readonly assessmentRepo: AssessmentRepository) {}

  getBusinessProfile(session: SessionContext) {
    return this.assessmentRepo.getBusiness(session.accountId);
  }

  saveBusinessProfile(session: SessionContext, body: Record<string, unknown>) {
    return this.assessmentRepo.saveBusiness(session.accountId, body);
  }

  getPersonalPerformance(session: SessionContext) {
    return this.assessmentRepo.getPersonal(session.accountId, session.userId);
  }

  savePersonalPerformance(session: SessionContext, body: Record<string, unknown>) {
    return this.assessmentRepo.savePersonal(session.accountId, session.userId, body);
  }
}
