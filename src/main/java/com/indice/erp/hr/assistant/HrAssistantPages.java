package com.indice.erp.hr.assistant;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.assistant.HrAssistantContracts.Page;
import com.indice.erp.hr.assistant.HrAssistantContracts.PageRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

/** Opaque continuation for HR owner pages. Each page still repeats current owner authorization. */
final class HrAssistantPages {
    private HrAssistantPages() { }
    record Window(int page, int size, String binding) {
        <T> Page<T> result(List<T> items, long total) {
            boolean more = (long) page * size < total;
            return new Page<>(List.copyOf(items), items.size(), total, more, more ? page + 1 : null,
                more ? encode("v1:" + binding + ":" + (page + 1)) : null);
        }
    }
    static Window window(AuthSessionUser user, String tool, PageRequest args) {
        int page = args == null || args.page() == null ? 1 : args.page();
        int size = args == null || args.limit() == null ? 25 : args.limit();
        if (size < 1 || size > 100 || page < 1) throw new IllegalArgumentException("Positive page and limit between 1 and 100 required.");
        String filters = args == null ? "" : field(args.query()) + field(args.status()) + field(args.unitId()) + field(args.businessId());
        String binding = hash(user.companyId() + ":" + user.userId() + ":" + user.userCompanyId() + ":" + tool + ":" + size + ":" + filters);
        if (args != null && args.cursor() != null) {
            if (args.page() != null || args.cursor().length() > 256) throw invalid();
            try {
                var parts = new String(Base64.getUrlDecoder().decode(args.cursor()), StandardCharsets.UTF_8).split(":", -1);
                if (parts.length != 3 || !"v1".equals(parts[0]) || !binding.equals(parts[1])) throw invalid();
                page = Integer.parseInt(parts[2]);
            } catch (IllegalArgumentException error) { throw invalid(); }
        }
        // Existing SQL owners use int offsets; reject overflow rather than returning another page.
        if (page < 1 || (long) page * size > Integer.MAX_VALUE) throw invalid();
        return new Window(page, size, binding);
    }
    private static String field(Object value) { String text = value == null ? "" : value.toString(); return text.length() + ":" + text; }
    private static String encode(String value) { return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8)); }
    private static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException("SHA-256 unavailable.", error); }
    }
    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid cursor for the current HR query and scope."); }
}
