import { ForbiddenException, Injectable } from '@nestjs/common';
import { SessionContext } from '../common/types/session-context';
import { ConfigCenterRepository } from './config-center.repository';

@Injectable()
export class UsersService {
  constructor(private readonly configRepo: ConfigCenterRepository) {}

  async list(session: SessionContext) {
    const user = await this.configRepo.getCurrentUser(session.accountId, session.userId);
    const users = user ? [{
      id: user.id,
      user_company_id: session.accountId,
      nombres: user.first_name,
      apellidos: user.last_name,
      email: user.email,
      telefono: user.phone,
      role: 'Admin',
      status: 'active',
      source: 'demo',
      is_protected: true,
      module_slugs: ['config_center'],
      tab_permission_keys: [
        'config_center.profile',
        'config_center.business-structure',
        'config_center.business-profile',
        'config_center.personal-performance',
        'config_center.users',
      ],
      tab_permissions_configured: true,
    }] : [];

    return {
      ok: true,
      users,
      catalog: {
        units: [],
        businesses: [],
        modules: [{ slug: 'config_center', name: 'Home Panel' }],
        tabs: [],
      },
    };
  }

  disabled() {
    throw new ForbiddenException('User management is disabled in the demo.');
  }
}
