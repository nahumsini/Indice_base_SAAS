import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/guards/session.guard';

@Controller('/api/v1')
@UseGuards(SessionGuard)
export class DemoModuleDataController {
  @Get('agenda')
  agenda(@Query('from') from?: string, @Query('to') to?: string) {
    return {
      items: [],
      count: 0,
      from: from ?? null,
      to: to ?? null,
    };
  }

  @Get('hr/users')
  hrUsers() {
    return {
      items: [],
      count: 0,
      summary: {
        total_count: 0,
        active_count: 0,
        inactive_count: 0,
        terminated_count: 0,
        total_payroll_amount_monthly: 0,
      },
    };
  }

  @Get('pos/context')
  posContext() {
    const warehouse = {
      id: 1,
      warehouseCode: 'WH-DEMO',
      name: 'Almacen Demo',
      unitId: null,
      unitName: null,
      businessId: null,
      businessName: null,
      status: 'ACTIVE',
    };

    return {
      warehouses: [warehouse],
      cashRegisters: [
        {
          id: 1,
          companyId: 1,
          unitId: null,
          businessId: null,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          code: 'CAJA-DEMO',
          name: 'Caja Demo',
          status: 'ACTIVE',
          active: true,
          notes: 'Caja local para demo.',
        },
      ],
      currentOpenShift: null,
      scope: {
        type: 'company',
        unitId: null,
        businessId: null,
      },
    };
  }
}
