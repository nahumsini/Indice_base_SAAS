package com.indice.erp.platformadmin;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.signup.BillingSignupRequest;
import com.indice.erp.billing.signup.BillingSignupService;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformAccountProvisioningService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Set<String> COUNTRIES = Set.of("MX", "CA", "US", "CO", "BR");

    private final JdbcTemplate jdbc;
    private final PlatformAdminAccessService access;
    private final PlatformAuditService audit;
    private final CourtesyCodeService courtesyCodes;
    private final BillingSignupService signup;

    public PlatformAccountProvisioningService(
        JdbcTemplate jdbc,
        PlatformAdminAccessService access,
        PlatformAuditService audit,
        CourtesyCodeService courtesyCodes,
        BillingSignupService signup
    ) {
        this.jdbc = jdbc;
        this.access = access;
        this.audit = audit;
        this.courtesyCodes = courtesyCodes;
        this.signup = signup;
    }

    @Transactional
    public Map<String, Object> create(
        long actorUserId,
        String idempotencyKey,
        CreateAccountRequest request
    ) {
        access.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        if (!signup.provisioningEnabled()) {
            throw new IllegalStateException("Account provisioning is not enabled in this environment.");
        }
        if (idempotencyKey == null || idempotencyKey.trim().length() < 8 || idempotencyKey.trim().length() > 200) {
            throw new IllegalArgumentException("A valid Idempotency-Key header is required.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Account details are required.");
        }

        var requestKey = idempotencyKey.trim();
        var companyName = required(request.company_name(), "Company name", 2, 120);
        var email = email(request.owner_email());
        var existing = existingAccount(companyName, email);
        if (existing != null) {
            if (isIdempotentReplay(requestKey, companyName, email)) {
                existing.put("replayed", true);
                return existing;
            }
            throw new IllegalStateException("Ese correo ya pertenece a una cuenta de Índice.");
        }
        ensureEmailAvailable(email);

        var ownerName = clean(request.owner_name(), 100);
        if (ownerName.isBlank()) {
            ownerName = "Administrador de " + companyName;
        }
        var password = password(request.temporary_password());
        var country = country(request.country_code());
        var phone = clean(request.phone(), 40);
        var industry = clean(request.industry(), 120);
        var companySize = clean(request.company_size(), 40);
        var productCodes = normalizeProducts(request.product_codes());
        var permanent = Boolean.TRUE.equals(request.permanent());
        var accessDays = permanent ? null : request.access_days() == null ? 30 : request.access_days();
        if (!permanent && (accessDays < 1 || accessDays > 3650)) {
            throw new IllegalArgumentException("access_days must be between 1 and 3650, or permanent must be true.");
        }
        var extraSeats = request.extra_seats() == null ? 0 : request.extra_seats();
        if (extraSeats < 0 || extraSeats > 500) {
            throw new IllegalArgumentException("extra_seats must be between 0 and 500.");
        }

        var courtesy = courtesyCodes.create(
            actorUserId,
            requestKey + ":access",
            new CourtesyCodeService.CreateRequest(
                "Alta directa · " + companyName,
                email,
                productCodes,
                extraSeats,
                accessDays,
                permanent,
                1,
                null,
                null,
                "Cuenta creada directamente desde Administración de plataforma.",
                "PLATFORM-DIRECT"
            )
        );
        var courtesyCode = String.valueOf(courtesy.getOrDefault("code", ""));
        if (courtesyCode.isBlank()) {
            throw new IllegalStateException("The secure access code could not be generated.");
        }

        var checkout = signup.createCheckout(
            new BillingSignupRequest(
                ownerName,
                email,
                password,
                companyName,
                country,
                phone,
                industry,
                companySize,
                "MONTH",
                extraSeats,
                productCodes,
                courtesyCode
            ),
            requestKey + ":signup"
        );
        if (!checkout.provisioned()) {
            throw new IllegalStateException("The account request was accepted but provisioning did not finish.");
        }

        var created = existingAccount(companyName, email);
        if (created == null) {
            throw new IllegalStateException("The account was provisioned but could not be loaded.");
        }
        created.put("replayed", false);
        created.put("permanent", permanent);
        created.put("access_days", accessDays);
        created.put("product_codes", productCodes);
        created.put("extra_seats", extraSeats);
        created.put("signup_reference", checkout.signupReference());
        audit.record(
            actorUserId,
            "COMPANY_ACCOUNT_CREATED",
            "COMPANY",
            String.valueOf(created.get("company_id")),
            ((Number) created.get("company_id")).longValue(),
            "SUCCESS",
            Map.of(
                "owner_email", email,
                "product_count", productCodes.size(),
                "extra_seats", extraSeats,
                "permanent", permanent,
                "access_days", accessDays == null ? 0 : accessDays
            )
        );
        return created;
    }

    private LinkedHashMap<String, Object> existingAccount(String companyName, String email) {
        return jdbc.query(
            """
                SELECT company.id AS company_id, company.name AS company_name,
                       user.id AS owner_user_id, user.email AS owner_email,
                       membership.id AS owner_membership_id
                FROM users user
                JOIN user_companies membership ON membership.user_id = user.id
                JOIN companies company ON company.id = membership.company_id
                WHERE LOWER(user.email) = ?
                  AND LOWER(TRIM(company.name)) = ?
                ORDER BY membership.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("company_id", rs.getLong("company_id"));
                row.put("company_name", rs.getString("company_name"));
                row.put("owner_user_id", rs.getLong("owner_user_id"));
                row.put("owner_email", rs.getString("owner_email"));
                row.put("owner_membership_id", rs.getLong("owner_membership_id"));
                return row;
            },
            email,
            companyName.toLowerCase(Locale.ROOT)
        ).stream().findFirst().orElse(null);
    }

    private void ensureEmailAvailable(String email) {
        var count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(email) = ?", Long.class, email);
        if (count != null && count > 0) {
            throw new IllegalStateException("Ese correo ya pertenece a otra cuenta de Índice.");
        }
    }

    private boolean isIdempotentReplay(String requestKey, String companyName, String email) {
        var count = jdbc.queryForObject(
            """
                SELECT COUNT(*)
                FROM billing_courtesy_codes
                WHERE idempotency_key_hash = ?
                  AND LOWER(COALESCE(allowed_email, '')) = ?
                  AND label = ?
                """,
            Long.class,
            BillingHashing.sha256(requestKey + ":access"),
            email,
            "Alta directa · " + companyName
        );
        return count != null && count > 0;
    }

    private List<String> normalizeProducts(List<String> values) {
        var products = values == null ? List.<String>of() : values.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(value -> value.trim().toLowerCase(Locale.ROOT))
            .distinct()
            .toList();
        if (products.isEmpty()) {
            throw new IllegalArgumentException("Select at least one module for the account.");
        }
        return products;
    }

    private String email(String value) {
        var normalized = clean(value, 190).toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(normalized).matches()) {
            throw new IllegalArgumentException("A valid owner email is required.");
        }
        return normalized;
    }

    private String country(String value) {
        var normalized = clean(value, 2).toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) normalized = "MX";
        if (!COUNTRIES.contains(normalized)) {
            throw new IllegalArgumentException("Country must be MX, CA, US, CO or BR during launch.");
        }
        return normalized;
    }

    private String password(String value) {
        var normalized = value == null ? "" : value;
        var byteLength = normalized.getBytes(StandardCharsets.UTF_8).length;
        if (normalized.length() < 10 || byteLength > 72) {
            throw new IllegalArgumentException("The temporary password must contain at least 10 characters and no more than 72 bytes.");
        }
        return normalized;
    }

    private String required(String value, String field, int min, int max) {
        var normalized = clean(value, max);
        if (normalized.length() < min) {
            throw new IllegalArgumentException(field + " must contain between " + min + " and " + max + " characters.");
        }
        return normalized;
    }

    private String clean(String value, int max) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.length() > max) {
            throw new IllegalArgumentException("Value is too long.");
        }
        return normalized;
    }

    public record CreateAccountRequest(
        String company_name,
        String owner_name,
        String owner_email,
        String temporary_password,
        String country_code,
        String phone,
        String industry,
        String company_size,
        List<String> product_codes,
        Integer extra_seats,
        Integer access_days,
        Boolean permanent
    ) {}
}
