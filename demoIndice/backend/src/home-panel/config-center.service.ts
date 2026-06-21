import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SessionContext } from '../common/types/session-context';
import { BusinessStructureRepository } from './business-structure.repository';
import { ConfigCenterRepository } from './config-center.repository';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

@Injectable()
export class ConfigCenterService {
  constructor(
    private readonly configRepo: ConfigCenterRepository,
    private readonly structureRepo: BusinessStructureRepository,
  ) {}

  private mapUser(user: NonNullable<Awaited<ReturnType<ConfigCenterRepository['getCurrentUser']>>>) {
    return {
      id: user.id,
      email: user.email,
      nombres: user.first_name,
      apellidos: user.last_name,
      primer_nombre: user.first_name,
      apellido_paterno: user.last_name,
      telefono: user.phone,
      phone_numbers: user.phone_numbers.map((phone) => ({
        id: phone.id,
        label: phone.label,
        phone: phone.phone,
        country: phone.country,
        is_primary: phone.is_primary,
      })),
      country: user.country,
      preferred_language: user.preferred_language,
      role: user.role,
    };
  }

  async getCurrentUser(session: SessionContext) {
    const user = await this.configRepo.getCurrentUser(session.accountId, session.userId);
    if (!user) throw new NotFoundException('Current user was not found.');
    return this.mapUser(user);
  }

  async updateCurrentUser(session: SessionContext, body: UpdateCurrentUserDto) {
    if (body.new_password?.trim() || body.confirm_new_password?.trim()) {
      throw new BadRequestException('Password changes are disabled in the demo.');
    }
    const user = await this.configRepo.updateCurrentUser(session.accountId, session.userId, {
      primer_nombre: body.primer_nombre,
      apellido_paterno: body.apellido_paterno,
      telefono: body.telefono,
      phone_numbers: body.phone_numbers,
      country: body.country,
      preferred_language: body.preferred_language,
    });
    if (!user) throw new NotFoundException('Current user was not found.');
    return this.mapUser(user);
  }

  async getCompany(session: SessionContext) {
    const company = await this.configRepo.getCompany(session.accountId);
    if (!company) throw new NotFoundException('Company profile was not found.');
    return {
      id: company.id,
      nombre_empresa: company.company_name,
      industria: company.industry,
      modelo_negocio: company.business_model,
      descripcion: company.description,
      moneda: company.currency,
      zona_horaria: company.timezone,
      tamano_empresa: company.company_size,
      colaboradores: company.collaborators,
      estructura: company.structure_type,
      logo_url: null,
      map: await this.structureRepo.getMap(session.accountId),
    };
  }

  async updateCompany(session: SessionContext, body: Record<string, unknown>) {
    await this.configRepo.updateCompany(session.accountId, body);
    return { logo: null, data: await this.getCompany(session), message: 'Saved.' };
  }

  async getConfig(session: SessionContext) {
    const company = await this.getCompany(session);
    return {
      estructura: company.estructura,
      colaboradores: company.colaboradores,
      map: company.map,
    };
  }

  async saveStructure(session: SessionContext, body: Record<string, unknown>) {
    const map = await this.structureRepo.save(session.accountId, body);
    return {
      estructura: body.estructura === 'multi' ? 'multi' : 'simple',
      colaboradores: Number(body.colaboradores ?? 0),
      map,
    };
  }

  disabled() {
    throw new ForbiddenException('User management is disabled in the demo.');
  }
}
