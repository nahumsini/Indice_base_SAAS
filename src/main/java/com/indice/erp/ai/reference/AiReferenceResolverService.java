package com.indice.erp.ai.reference;

import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.BusinessContextResponse;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.FundReference;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.OrganizationReference;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PaymentAccountReference;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.ReferencePage;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.dashboard.OrganizationReadService;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.paymentaccounts.PaymentAccountService;
import com.indice.erp.finance.pettycash.PettyCashService;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AiReferenceResolverService {

    private static final int DEFAULT_LIMIT = 25;
    private static final int MAX_LIMIT = 50;
    private static final String CURSOR_PREFIX = "v1:";

    private final AiToolAuthorizationService authorizationService;
    private final OrganizationReadService organizationReadService;
    private final FinanceAccessService financeAccessService;
    private final PaymentAccountService paymentAccountService;
    private final PettyCashService pettyCashService;
    private final Clock clock;

    public AiReferenceResolverService(
        AiToolAuthorizationService authorizationService,
        OrganizationReadService organizationReadService,
        FinanceAccessService financeAccessService,
        PaymentAccountService paymentAccountService,
        PettyCashService pettyCashService,
        Clock clock
    ) {
        this.authorizationService = authorizationService;
        this.organizationReadService = organizationReadService;
        this.financeAccessService = financeAccessService;
        this.paymentAccountService = paymentAccountService;
        this.pettyCashService = pettyCashService;
        this.clock = clock;
    }

    public BusinessContextResponse getMyBusinessContext(AuthSessionUser user) {
        require(authorizationService.canReadOrganizationStructure(user));
        var context = organizationReadService.currentContext(user);
        return new BusinessContextResponse(
            clock.instant(), context.companyId(), context.companyName(), context.userId(), context.userCompanyId(),
            context.userName(), context.role(), context.scopeType(), context.assignedUnitId(), context.assignedUnitName(),
            context.assignedBusinessId(), context.assignedBusinessName()
        );
    }

    public ReferencePage<OrganizationReference> listUnitsAndBusinesses(AuthSessionUser user, PageRequest request) {
        require(authorizationService.canReadOrganizationStructure(user));
        var normalized = normalize(request);
        var structure = organizationReadService.visibleStructure(user);
        var references = new ArrayList<OrganizationReference>();
        structure.units().stream()
            .map(unit -> new OrganizationReference("UNIT", unit.id(), unit.name(), null, null, unit.status()))
            .filter(item -> matches(normalized.query(), item.name(), item.referenceType()))
            .forEach(references::add);
        structure.businesses().stream()
            .map(business -> new OrganizationReference(
                "BUSINESS", business.id(), business.name(), business.unitId(), business.unitName(), business.status()
            ))
            .filter(item -> matches(normalized.query(), item.name(), item.unitName(), item.referenceType()))
            .forEach(references::add);
        return page(structure.scopeType(), List.copyOf(references), normalized);
    }

    public ReferencePage<PaymentAccountReference> listPaymentAccounts(AuthSessionUser user, PageRequest request) {
        require(authorizationService.canReadPaymentAccounts(user));
        var context = financeAccessService.resolvePaymentAccountContext(user)
            .orElseThrow(() -> new SecurityException("Current Indice permissions do not allow payment account access."));
        var normalized = normalize(request);
        var items = paymentAccountService.list(context).accounts().stream()
            .map(account -> new PaymentAccountReference(
                account.id(), account.name(), account.type().name(), account.currencyCode(), account.currentBalance(),
                account.pendingBalance(), account.totalBalance(), account.unitId(), account.businessId(),
                account.status().name(), account.systemManaged()
            ))
            .filter(item -> matches(normalized.query(), item.name(), item.type(), item.currencyCode(), item.status()))
            .toList();
        return page(context.scope().type().name(), items, normalized);
    }

    public ReferencePage<FundReference> listFunds(AuthSessionUser user, PageRequest request) {
        require(authorizationService.canReadPettyCash(user));
        var context = financeAccessService.resolveContext(user)
            .orElseThrow(() -> new SecurityException("Current Indice permissions do not allow fund access."));
        var normalized = normalize(request);
        var items = pettyCashService.listFunds(context).stream()
            .map(fund -> new FundReference(
                fund.id(), fund.name(), fund.fundType().name(), fund.currencyCode(), fund.limitAmount(),
                fund.currentBalanceAmount(), fund.paymentAccountId(), fund.fundingSourcePaymentAccountId(),
                fund.unitId(), fund.businessId(), fund.status().name()
            ))
            .filter(item -> matches(normalized.query(), item.name(), item.fundType(), item.currencyCode(), item.status()))
            .toList();
        return page(context.scope().type().name(), items, normalized);
    }

    private NormalizedRequest normalize(PageRequest request) {
        var candidate = request == null ? new PageRequest(null, null, null) : request;
        var query = candidate.query() == null ? "" : candidate.query().trim();
        if (query.length() > 120) {
            throw new IllegalArgumentException("query must not exceed 120 characters.");
        }
        var limit = candidate.limit() == null ? DEFAULT_LIMIT : candidate.limit();
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and 50.");
        }
        var offset = decodeCursor(candidate.cursor());
        return new NormalizedRequest(query.toLowerCase(Locale.ROOT), limit, offset);
    }

    private int decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        if (cursor.length() > 256) {
            throw new IllegalArgumentException("cursor is invalid.");
        }
        try {
            var decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!decoded.startsWith(CURSOR_PREFIX)) {
                throw new IllegalArgumentException("cursor is invalid.");
            }
            var offset = Integer.parseInt(decoded.substring(CURSOR_PREFIX.length()));
            if (offset < 0) {
                throw new IllegalArgumentException("cursor is invalid.");
            }
            return offset;
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("cursor is invalid.");
        }
    }

    private <T> ReferencePage<T> page(String scopeType, List<T> allItems, NormalizedRequest request) {
        if (request.offset() > allItems.size()) {
            throw new IllegalArgumentException("cursor is no longer valid for this result set.");
        }
        var toIndex = Math.min(allItems.size(), request.offset() + request.limit());
        var items = List.copyOf(allItems.subList(request.offset(), toIndex));
        var hasMore = toIndex < allItems.size();
        return new ReferencePage<>(
            clock.instant(), scopeType, items, items.size(), allItems.size(), hasMore,
            hasMore ? encodeCursor(toIndex) : null
        );
    }

    private String encodeCursor(int offset) {
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString((CURSOR_PREFIX + offset).getBytes(StandardCharsets.UTF_8));
    }

    private boolean matches(String query, String... values) {
        if (query.isBlank()) {
            return true;
        }
        for (var value : values) {
            if (value != null && value.toLowerCase(Locale.ROOT).contains(query)) {
                return true;
            }
        }
        return false;
    }

    private void require(boolean allowed) {
        if (!allowed) {
            throw new SecurityException("Current Indice permissions do not allow this reference tool.");
        }
    }

    private record NormalizedRequest(String query, int limit, int offset) {
    }
}
