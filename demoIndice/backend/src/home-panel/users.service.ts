import { ForbiddenException, Injectable } from '@nestjs/common';
import { SessionContext } from '../common/types/session-context';
import { demoModules, demoModuleSlugs, demoTabPermissionKeys } from '../common/demo-access';
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
      role: 'Super Admin',
      status: 'active',
      source: 'demo',
      is_protected: true,
      module_slugs: demoModuleSlugs,
      tab_permission_keys: demoTabPermissionKeys,
      tab_permissions_configured: true,
    }] : [];

    return {
      ok: true,
      users,
      catalog: {
        units: [],
        businesses: [],
        modules: demoModules.map(({ slug, name }) => ({ slug, name })),
        tabs: [],
      },
    };
  }

  disabled() {
    throw new ForbiddenException('User management is disabled in the demo.');
  }
}
