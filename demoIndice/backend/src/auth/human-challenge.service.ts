import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { AppConfigService } from '../config/app-config.service';

type ChallengePurpose = 'login' | 'register';

type ChallengePayload = {
  purpose: ChallengePurpose;
  left: number;
  right: number;
  issuedAt: number;
  nonce: string;
};

const maxAgeMs = 10 * 60 * 1000;
const minAgeMs = 1500;

const isPurpose = (value: string): value is ChallengePurpose => (
  value === 'login' || value === 'register'
);

@Injectable()
export class HumanChallengeService {
  constructor(private readonly config: AppConfigService) {}

  create(purpose: string) {
    if (!isPurpose(purpose)) {
      throw new BadRequestException('Unknown security challenge.');
    }

    const left = randomInt(3, 12);
    const right = randomInt(2, 10);
    const payload: ChallengePayload = {
      purpose,
      left,
      right,
      issuedAt: Date.now(),
      nonce: randomInt(100000, 999999).toString(),
    };

    return {
      purpose,
      question: `What is ${left} + ${right}?`,
      token: this.signPayload(payload),
      minimumSeconds: Math.ceil(minAgeMs / 1000),
    };
  }

  verify(purpose: ChallengePurpose, body: {
    challengeToken?: string;
    challengeAnswer?: string;
    website?: string;
  }) {
    if (body.website?.trim()) {
      throw new BadRequestException('Human verification failed.');
    }

    const payload = this.readPayload(body.challengeToken);
    const age = Date.now() - payload.issuedAt;
    const expectedAnswer = String(payload.left + payload.right);

    if (
      payload.purpose !== purpose
      || age < minAgeMs
      || age > maxAgeMs
      || body.challengeAnswer?.trim() !== expectedAnswer
    ) {
      throw new BadRequestException('Human verification failed.');
    }
  }

  private signPayload(payload: ChallengePayload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${body}.${this.signature(body)}`;
  }

  private readPayload(token: string | undefined): ChallengePayload {
    const [body, signature] = token?.split('.') ?? [];
    if (!body || !signature || !this.signaturesMatch(signature, this.signature(body))) {
      throw new BadRequestException('Human verification failed.');
    }

    try {
      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ChallengePayload;
    } catch {
      throw new BadRequestException('Human verification failed.');
    }
  }

  private signature(body: string) {
    return createHmac('sha256', this.config.challengeSecret).update(body).digest('base64url');
  }

  private signaturesMatch(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
