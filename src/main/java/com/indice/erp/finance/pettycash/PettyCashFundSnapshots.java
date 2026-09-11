package com.indice.erp.finance.pettycash;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.springframework.stereotype.Component;

/** Keeps live balance/access identity while restoring a statement's financial ownership. */
@Component
class PettyCashFundSnapshots {
    private final ObjectMapper json;
    PettyCashFundSnapshots(ObjectMapper json) { this.json = json; }

    PettyCashFundRecord restore(PettyCashFundRecord live, String snapshot) {
        if (snapshot == null) return live;
        try {
            ObjectNode record = json.valueToTree(live);
            JsonNode saved = json.readTree(snapshot);
            for (var field : List.of("fundType", "budgetId", "budgetLineId", "paymentAccountId",
                    "fundingSourcePaymentAccountId", "fundingSourceName", "unitId", "businessId", "responsibleUserId",
                    "externalOwnerType", "externalOwnerName", "externalOwnerRelationship", "externalOwnerReference",
                    "statementRecipientEmail", "managedAssetType", "managedAssetName", "managedAssetReference", "managedAssetsJson")) {
                if (saved.has(field)) record.set(field, saved.get(field));
            }
            return json.treeToValue(record, PettyCashFundRecord.class);
        } catch (java.io.IOException e) { throw new IllegalStateException("Invalid fund accounting snapshot", e); }
    }

    String write(Object value) {
        try { return json.writeValueAsString(value); }
        catch (java.io.IOException e) { throw new IllegalStateException("Cannot preserve fund snapshot", e); }
    }

    PettyCashFundCommand command(String value) {
        try { return json.readValue(value, PettyCashFundCommand.class); }
        catch (java.io.IOException e) { throw new IllegalStateException("Invalid fund configuration", e); }
    }
}
