package com.indice.erp.finance.providers.dto;

import java.util.List;

public record ProviderListResponse(List<ProviderResponse> providers, int count) {
}
