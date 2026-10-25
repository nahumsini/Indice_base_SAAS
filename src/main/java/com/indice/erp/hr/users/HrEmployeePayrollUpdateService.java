package com.indice.erp.hr.users;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Coordinates one employee edit; Payroll retains ownership of fiscal validation and versions. */
@Service
public class HrEmployeePayrollUpdateService {
    private final HrUserService employees;
    private final MexicoPayrollProfileService profiles;
    private final HrAccessService access;
    private final ObjectMapper mapper;

    public HrEmployeePayrollUpdateService(HrUserService employees, MexicoPayrollProfileService profiles,
        HrAccessService access, ObjectMapper mapper) {
        this.employees = employees;
        this.profiles = profiles;
        this.access = access;
        this.mapper = mapper;
    }

    @Transactional
    public Map<String, Object> update(AuthSessionUser actor, long employeeId, Map<String, Object> payload) {
        if (!access.canAccessManagementTab(actor, HrAccessService.HrTab.COLLABORATORS))
            throw new HrAccessDeniedException("Forbidden");
        MexicoPayrollProfileService.SaveRequest fiscal = null;
        if (payload.containsKey("mexicoPayrollProfile")) {
            // The existing employee API is a compatibility map; this extension has an explicit DTO.
            try {
                fiscal = mapper.convertValue(payload.get("mexicoPayrollProfile"), MexicoPayrollProfileService.SaveRequest.class);
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Revisa los datos fiscales y su vigencia.");
            }
            if (fiscal == null || fiscal.profile() == null || fiscal.requestId() == null || fiscal.expectedRevision() < 0)
                throw new IllegalArgumentException("Faltan los datos del perfil o su versión.");
            if (!profiles.get(actor, employeeId).canConfigure()) throw new HrAccessDeniedException("Forbidden");
            fiscal.profile().validate();
        }
        var result = employees.updateUser(actor, employeeId, payload);
        if (fiscal != null) {
            // Check normalized, persisted employee data, including an assignment change in this edit.
            var profile = (Map<?, ?>) result.get("profile");
            if (profile == null || !"MX".equals(profile.get("registration_country"))
                || !"fiscal_payroll".equals(profile.get("payroll_treatment")))
                throw new IllegalArgumentException("Los datos fiscales de México requieren país México y nómina fiscal.");
            profiles.save(actor, employeeId, fiscal);
        }
        return result;
    }
}
