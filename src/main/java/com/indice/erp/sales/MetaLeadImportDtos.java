package com.indice.erp.sales;

import java.time.Instant;
import java.util.List;
import java.util.Map;

final class MetaLeadImportDtos {

    private MetaLeadImportDtos() {
    }

    record ImportRequest(String pageId, String accessToken, Integer maxLeads) {
        @Override
        public String toString() {
            return "ImportRequest[pageId=" + pageId + ", accessToken=[redacted], maxLeads=" + maxLeads + "]";
        }
    }

    record ImportResponse(
            int downloaded,
            int imported,
            int skippedPreviouslyImported,
            int skippedDuplicates,
            int skippedInvalid,
            List<ImportedContactResponse> contacts) {
    }

    record ImportedContactResponse(
            long id,
            String contactCode,
            String contactPerson,
            String email,
            String phone) {
    }

    record ProviderLead(
            String id,
            String pageId,
            String formId,
            String formName,
            String adId,
            String adName,
            String campaignId,
            String campaignName,
            Instant sourceCreatedAt,
            Map<String, List<String>> fields) {
    }
}
