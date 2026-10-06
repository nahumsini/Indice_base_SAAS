package com.indice.erp.ai.query;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Pagination for the established dynamic V1 query compatibility boundary. */
final class AiQueryPages {
    private AiQueryPages() { }
    static Page page(ObjectMapper mapper, AuthSessionUser user, String tool, Map<String, Object> args, List<?> authorized) {
        int size = 25;
        if (args.get("limit") != null) {
            if (!(args.get("limit") instanceof Number value)) throw new IllegalArgumentException("limit must be an integer.");
            try { size = new java.math.BigDecimal(value.toString()).intValueExact(); }
            catch (ArithmeticException | NumberFormatException exception) { throw new IllegalArgumentException("limit must be an integer."); }
        }
        if (size < 1 || size > 100) throw new IllegalArgumentException("limit must be between 1 and 100.");
        String binding = binding(mapper, user, tool, args);
        int offset = 0;
        Object raw = args.get("cursor");
        if (raw != null) {
            if (!(raw instanceof String cursor) || cursor.length() > 256) throw invalid();
            try {
                var parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split(":", -1);
                if (parts.length != 3 || !parts[0].equals("v1") || !parts[1].equals(binding)) throw invalid();
                offset = Integer.parseInt(parts[2]);
                if (offset < 0 || offset > authorized.size()) throw invalid();
            } catch (IllegalArgumentException error) { throw invalid(); }
        }
        int end = (int) Math.min((long) offset + size, authorized.size());
        var items = List.copyOf(authorized.subList(offset, end));
        boolean more = end < authorized.size();
        String next = more ? Base64.getUrlEncoder().withoutPadding().encodeToString(
            ("v1:" + binding + ":" + end).getBytes(StandardCharsets.UTF_8)) : null;
        return new Page(items, items.size(), authorized.size(), more, next);
    }
    private static String binding(ObjectMapper mapper, AuthSessionUser user, String tool, Map<String, Object> args) {
        var filters = new TreeMap<>(args); filters.remove("cursor"); filters.remove("limit");
        try {
            var content = mapper.writeValueAsString(List.of(user.companyId(), user.userId(), user.userCompanyId(), tool, filters));
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) { throw new IllegalStateException("Query pagination could not be prepared."); }
    }
    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid cursor for the current query and scope."); }
    record Page(List<?> items, int returnedCount, int totalCount, boolean hasMore, String nextCursor) { }
}
