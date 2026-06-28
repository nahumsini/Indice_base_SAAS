package com.indice.erp.hr.permissions;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.hr.permissions.HrPermissionPayloadSupport.PermissionDraft;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrPermissionCommandService {

    private final HrPermissionCommandRepository commandRepository;
    private final HrPermissionQueryService queryService;
    private final HrPermissionAttendanceSyncService attendanceSyncService;
    private final HrOperationalScopeService hrOperationalScopeService;

    public HrPermissionCommandService(
        HrPermissionCommandRepository commandRepository,
        HrPermissionQueryService queryService,
        HrPermissionAttendanceSyncService attendanceSyncService,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.commandRepository = commandRepository;
        this.queryService = queryService;
        this.attendanceSyncService = attendanceSyncService;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    @Transactional
    public Map<String, Object> createOwn(PermissionActor actor, Map<String, Object> payload) {
        rejectSelfScopeOverride(payload);
        PermissionDraft draft = HrPermissionPayloadSupport.permissionDraft(payload);
        var snapshot = commandRepository.loadUserSnapshot(actor.companyId(), actor.userCompanyId());
        var requestId = commandRepository.createRequest(actor.companyId(), actor.userId(), snapshot, draft);
        if (requestId <= 0) {
            throw new IllegalArgumentException("Unable to create permission request.");
        }
        commandRepository.updateRequestNumber(actor.companyId(), requestId, folio(requestId));
        return queryService.getOwn(actor, requestId);
    }

    private void rejectSelfScopeOverride(Map<String, Object> payload) {
        if (payload == null) {
            return;
        }
        var forbiddenKeys = java.util.Set.of(
            "user_company_id",
            "userCompanyId",
            "user_id",
            "userId",
            "employee_id",
            "employeeId",
            "unit_id",
            "unitId",
            "business_id",
            "businessId"
        );
        for (var key : forbiddenKeys) {
            if (payload.containsKey(key)) {
                throw new IllegalArgumentException("Permission requests can only be created for the current user and assigned unit.");
            }
        }
    }

    @Transactional
    public Map<String, Object> approve(PermissionActor actor, long requestId, Map<String, Object> payload) {
        transition(actor, requestId, payload, "approved");
        attendanceSyncService.syncApprovedLeaveStatus(actor.companyId(), actor.userId(), requestId);
        return queryService.getManagement(actor, requestId);
    }

    @Transactional
    public Map<String, Object> reject(PermissionActor actor, long requestId, Map<String, Object> payload) {
        transition(actor, requestId, payload, "rejected");
        return queryService.getManagement(actor, requestId);
    }

    private void transition(PermissionActor actor, long requestId, Map<String, Object> payload, String status) {
        var state = commandRepository.loadRequestState(actor.companyId(), requestId);
        requireRequestInManagementScope(actor, state.userCompanyId());
        if (!"pending".equalsIgnoreCase(state.status())) {
            throw new IllegalArgumentException("Only pending permission requests can be updated.");
        }
        if (commandRepository.updateStatusIfPending(
            actor.companyId(),
            actor.userId(),
            requestId,
            status,
            HrPermissionPayloadSupport.reviewNotes(payload)
        ) == 0) {
            throw new IllegalArgumentException("Permission request status changed. Refresh and try again.");
        }
    }

    private void requireRequestInManagementScope(PermissionActor actor, long targetUserCompanyId) {
        var scope = hrOperationalScopeService.resolve(new AuthSessionUser(
            actor.userId(),
            actor.companyId(),
            actor.userCompanyId(),
            actor.userName(),
            actor.role()
        ));
        hrOperationalScopeService.requireUserInScope(actor.companyId(), scope, targetUserCompanyId);
    }

    private String folio(long requestId) {
        return "PER-%d-%04d".formatted(LocalDate.now().getYear(), requestId);
    }
}
