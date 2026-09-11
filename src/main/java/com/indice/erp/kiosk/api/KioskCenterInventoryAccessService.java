package com.indice.erp.kiosk.api;

import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.kiosk.engine.KioskCenterService.OwnerScope;
import com.indice.erp.pos.PosAccessService;
import com.indice.erp.pos.PosScope;
import com.indice.erp.processTasks.ProcessTasksAccessService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Resolves the tenant-bound Kiosk Center inventory visible to the current administrator.
 * Global MultiKiosk and lifecycle privileges remain in {@link KioskInternalRequestGuard}.
 */
@Service
public class KioskCenterInventoryAccessService {

    private static final Set<String> GLOBAL_ROLES = Set.of("root", "superadmin");
    private static final String EXPENSES = "EXPENSES";
    private static final String HUMAN_RESOURCES = "HUMAN_RESOURCES";
    private static final String PETTY_CASH = "PETTY_CASH";
    private static final String POINT_OF_SALE = "POINT_OF_SALE";
    private static final String PROCESS_TASKS = "PROCESS_TASKS";

    private final KioskInternalRequestGuard guard;
    private final FinanceAccessService financeAccess;
    private final HrAccessService hrAccess;
    private final PosAccessService posAccess;
    private final ProcessTasksAccessService processTasksAccess;
    private final TabPermissionAccessService tabPermissions;

    public KioskCenterInventoryAccessService(
            KioskInternalRequestGuard guard,
            FinanceAccessService financeAccess,
            HrAccessService hrAccess,
            PosAccessService posAccess,
            ProcessTasksAccessService processTasksAccess,
            TabPermissionAccessService tabPermissions) {
        this.guard = guard;
        this.financeAccess = financeAccess;
        this.hrAccess = hrAccess;
        this.posAccess = posAccess;
        this.processTasksAccess = processTasksAccess;
        this.tabPermissions = tabPermissions;
    }

    public InventoryAccess requireRead(HttpSession session) {
        var user = guard.requireAuthenticated(session);
        if (GLOBAL_ROLES.contains(normalizeRole(user.role()))) {
            return new InventoryAccess(user, true, Set.of(), Map.of());
        }

        var ownerModules = new LinkedHashSet<String>();
        var ownerScopes = new LinkedHashMap<String, OwnerScope>();
        if (hrAccess.canAccessManagementTab(user, HrAccessService.HrTab.CONTROL)) {
            addOwner(ownerModules, ownerScopes, HUMAN_RESOURCES, OwnerScope.corporateOffice());
        }
        if (processTasksAccess.canAccess(user)) {
            addOwner(ownerModules, ownerScopes, PROCESS_TASKS, OwnerScope.corporateOffice());
        }
        var financeContext = financeAccess.resolveContext(user);
        if (financeContext.isPresent()) {
            var financeScope = toOwnerScope(financeContext.orElseThrow().scope());
            if (tabPermissions.canAccess(user, TabPermissionRequirement.one("expenses.expenses"))) {
                addOwner(ownerModules, ownerScopes, EXPENSES, financeScope);
            }
            if (tabPermissions.canAccess(user, TabPermissionRequirement.one("petty_cash.cash"))) {
                addOwner(ownerModules, ownerScopes, PETTY_CASH, financeScope);
            }
        }
        var posContext = posAccess.resolveContext(user)
            .filter(context -> context.canManageOtherUsers());
        if (posContext.isPresent()
                && tabPermissions.canAccess(user, TabPermissionRequirement.one("pos.kiosks"))) {
            addOwner(ownerModules, ownerScopes, POINT_OF_SALE,
                toOwnerScope(posContext.orElseThrow().scope()));
        }
        if (ownerModules.isEmpty()) {
            throw new KioskInternalAccessException(true);
        }
        return new InventoryAccess(user, false, Set.copyOf(ownerModules), Map.copyOf(ownerScopes));
    }

    private void addOwner(
            Set<String> ownerModules,
            Map<String, OwnerScope> ownerScopes,
            String ownerModule,
            OwnerScope scope) {
        ownerModules.add(ownerModule);
        ownerScopes.put(ownerModule, scope);
    }

    private OwnerScope toOwnerScope(FinanceScope scope) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> OwnerScope.corporateOffice();
            case UNIT_HEADQUARTERS -> OwnerScope.unitHeadquarters(scope.unitId());
            case BUSINESS_OFFICE -> OwnerScope.businessOffice(scope.unitId(), scope.businessId());
        };
    }

    private OwnerScope toOwnerScope(PosScope scope) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> OwnerScope.corporateOffice();
            case UNIT_HEADQUARTERS -> OwnerScope.unitHeadquarters(scope.unitId());
            case BUSINESS_OFFICE -> OwnerScope.businessOffice(scope.unitId(), scope.businessId());
        };
    }

    private String normalizeRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }

    public record InventoryAccess(
            AuthSessionUser user,
            boolean global,
            Set<String> ownerModules,
            Map<String, OwnerScope> ownerScopes) {

        public InventoryAccess(AuthSessionUser user, boolean global, Set<String> ownerModules) {
            this(user, global, ownerModules, ownerModules.stream().collect(java.util.stream.Collectors.toUnmodifiableMap(
                ownerModule -> ownerModule,
                ownerModule -> OwnerScope.corporateOffice())));
        }
    }
}
