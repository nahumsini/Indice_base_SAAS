package com.indice.erp.ai.commercial;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AiCommercialAccess {
    public static final Set<String> READS = Set.of("get_customer_detail", "list_opportunities", "get_opportunity_detail", "get_opportunity_pipeline", "list_quotes", "get_quote_detail", "search_commercial_assignees");
    public static final Set<String> ACTIONS = Set.of("create_customer", "update_customer", "create_opportunity", "update_opportunity", "create_quote", "update_quote");
    private final AiToolAuthorizationService authorization;
    public AiCommercialAccess(AiToolAuthorizationService authorization) { this.authorization = authorization; }
    public static String scope(String tool) {
        return switch (tool) {
            case "get_customer_detail" -> "customers.read";
            case "list_opportunities", "get_opportunity_detail", "get_opportunity_pipeline" -> "opportunities.read";
            case "list_quotes", "get_quote_detail" -> "quotes.read";
            case "search_commercial_assignees" -> "commercial.references:read";
            case "create_customer", "update_customer", "create_opportunity", "update_opportunity", "create_quote", "update_quote" -> {
                var parts = tool.split("_");
                String plural = parts[1].equals("opportunity") ? "opportunities" : parts[1] + "s";
                yield plural + "." + parts[0];
            }
            default -> throw new IllegalArgumentException("Unknown commercial tool.");
        };
    }
    public void require(StoredToken token, String tool) {
        if (!token.scopes().contains(scope(tool)) || !authorization.canUseCommercialTool(token.user(), tool))
            throw new SecurityException("Current consent and Indice permissions are required.");
    }
}
