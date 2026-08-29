package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.MetaLeadImportDtos.ImportRequest;
import com.indice.erp.sales.MetaLeadImportDtos.ImportResponse;
import org.springframework.stereotype.Service;

@Service
class MetaLeadImportService {

    private static final int DEFAULT_MAX_LEADS = 100;
    private static final int MAX_LEADS_PER_IMPORT = 500;

    private final MetaLeadGateway gateway;
    private final MetaLeadImportPersistenceService persistenceService;

    MetaLeadImportService(MetaLeadGateway gateway, MetaLeadImportPersistenceService persistenceService) {
        this.gateway = gateway;
        this.persistenceService = persistenceService;
    }

    ImportResponse importLeads(AuthSessionUser actor, ImportRequest request) {
        if (actor == null || actor.userId() == null || actor.companyId() == null) {
            throw new IllegalArgumentException("An authenticated company user is required.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Import configuration is required.");
        }
        var pageId = requirePageId(request.pageId());
        var accessToken = requireAccessToken(request.accessToken());
        var maxLeads = request.maxLeads() == null ? DEFAULT_MAX_LEADS : request.maxLeads();
        if (maxLeads < 1 || maxLeads > MAX_LEADS_PER_IMPORT) {
            throw new IllegalArgumentException("maxLeads must be between 1 and 500.");
        }

        // The provider call deliberately completes before the transactional persistence use case.
        // A slow third-party request must not hold database locks open.
        var leads = gateway.download(pageId, accessToken, maxLeads);
        return persistenceService.persist(actor, leads);
    }

    private static String requirePageId(String value) {
        var normalized = value == null ? "" : value.trim();
        if (!normalized.matches("[0-9]{1,40}")) {
            throw new IllegalArgumentException("A valid numeric Meta Page ID is required.");
        }
        return normalized;
    }

    private static String requireAccessToken(String value) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.length() < 20 || normalized.length() > 4096) {
            throw new IllegalArgumentException("A valid Meta Page access token is required.");
        }
        return normalized;
    }
}
