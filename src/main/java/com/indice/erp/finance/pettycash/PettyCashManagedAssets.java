package com.indice.erp.finance.pettycash;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.PettyCashManagedAsset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

final class PettyCashManagedAssets {
    static final int MAX_ASSETS = 50;
    private static final Set<String> TYPES = Set.of("REAL_ESTATE", "VEHICLE", "VESSEL", "MACHINERY",
        "INVESTMENT_ACCOUNT", "CURRENCY", "SECURITIES", "OTHER");
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<List<PettyCashManagedAsset>> LIST_TYPE = new TypeReference<>() {};

    private PettyCashManagedAssets() {}

    static List<PettyCashManagedAsset> read(String json, String type, String name, String reference) {
        if (json == null || json.isBlank()) return legacy(type, name, reference);
        try {
            var assets = JSON.readValue(json, LIST_TYPE);
            return assets == null ? legacy(type, name, reference) : List.copyOf(assets);
        } catch (Exception exception) {
            throw new IllegalStateException("Stored managed assets could not be read.");
        }
    }

    static List<PettyCashManagedAsset> resolve(List<PettyCashManagedAsset> requested,
            String type, String name, String reference, List<PettyCashManagedAsset> existing) {
        // Explicit [] removes all current assets. Legacy clients can only edit/remove the first.
        var assets = requested;
        if (assets == null) {
            assets = new ArrayList<>(legacy(type, name, reference));
            if (existing != null && existing.size() > 1) assets.addAll(existing.subList(1, existing.size()));
        }
        if (assets.size() > MAX_ASSETS) throw FinanceApiException.badRequest("A fund supports up to 50 managed assets.");
        return assets.stream().map(asset -> {
            if (asset == null) throw FinanceApiException.badRequest("Every managed asset requires a valid type and name.");
            var normalizedType = clean(asset.type());
            normalizedType = normalizedType == null ? null : normalizedType.toUpperCase(Locale.ROOT);
            var normalizedName = clean(asset.name());
            var normalizedReference = clean(asset.reference());
            if (normalizedType == null || !TYPES.contains(normalizedType) || normalizedName == null)
                throw FinanceApiException.badRequest("Every managed asset requires a valid type and name.");
            if (normalizedName.length() > 180 || (normalizedReference != null && normalizedReference.length() > 120))
                throw FinanceApiException.badRequest("Managed asset name or reference is too long.");
            return new PettyCashManagedAsset(normalizedType, normalizedName, normalizedReference);
        }).toList();
    }

    static PettyCashManagedAsset first(List<PettyCashManagedAsset> assets) {
        return assets.isEmpty() ? new PettyCashManagedAsset(null, null, null) : assets.getFirst();
    }

    private static List<PettyCashManagedAsset> legacy(String type, String name, String reference) {
        return clean(type) == null && clean(name) == null && clean(reference) == null ? List.of()
            : List.of(new PettyCashManagedAsset(clean(type), clean(name), clean(reference)));
    }

    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
