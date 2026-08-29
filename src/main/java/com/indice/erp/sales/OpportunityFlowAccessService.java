package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import org.springframework.stereotype.Service;

@Service
class OpportunityFlowAccessService {

    boolean canManage(AuthSessionUser user) {
        // Capability and crm.leads tab authorization are enforced before the
        // controller is invoked. Do not add a second role-based permission model
        // here: a tenant member explicitly granted that tab may manage its flow.
        return user != null && user.userId() != null && user.companyId() != null;
    }
}
