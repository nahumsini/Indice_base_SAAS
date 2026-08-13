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
    private static final Set<String> ACCOUNT_TYPES = Set.of("SUPER_ADMIN", "DISTRIBUTOR");
    private static final Set<Integer> TRIAL_DAYS = Set.of(7, 15, 30);
    private static final int INCLUDED_SEATS = 5;
    private static final int MAX_EXTRA_SEATS = 500;
    private static final int MAX_EMPLOYEES = INCLUDED_SEATS + MAX_EXTRA_SEATS;

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
        return createAfterAuthorization(actorUserId, idempotencyKey, request, null);
    }

    /**
     * Creates a client from an already-authorized distributor portal operation.
     * The commercial origin and current distributor are forced server-side so
     * they cannot be forged by the browser payload.
     */
    @Transactional
    public Map<String, Object> createForDistributor(
        long actorUserId,
        long distributorCompanyId,
        String distributorCompanyName,
        String idempotencyKey,
        CreateAccountRequest request
    ) {
        return createAfterAuthorization(
            actorUserId,
            idempotencyKey,
            request,
            new DistributorCreation(distributorCompanyId, distributorCompanyName)
        );
    }

    private Map<String, Object> createAfterAuthorization(
        long actorUserId,
        String idempotencyKey,
        CreateAccountRequest request,
        DistributorCreation distributor
    ) {
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
        var productCodes = normalizeProducts(request.product_codes());
        var employeeCount = employeeCount(request.employee_count());
        var extraSeats = Math.max(0, employeeCount - INCLUDED_SEATS);
        if (request.extra_seats() != null && request.extra_seats() != extraSeats) {
            throw new IllegalArgumentException(
                "extra_seats must match the exact employee count after the 5 included users."
            );
        }
        var existing = existingAccount(companyName, email);
        if (existing != null) {
            if (isIdempotentReplay(requestKey, companyName, email)) {
                confirmAppliedProducts(existing, productCodes);
                existing.put("replayed", true);
                existing.put("employee_count", employeeCount);
                existing.put("included_seats", INCLUDED_SEATS);
                existing.put("extra_seats", extraSeats);
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
        var companySize = Integer.toString(employeeCount);
        var accountType = distributor == null ? accountType(request.account_type()) : "SUPER_ADMIN";
        var permanent = Boolean.TRUE.equals(request.permanent());
        var accessDays = permanent ? null : request.access_days() == null ? 30 : request.access_days();
        if (!permanent && !TRIAL_DAYS.contains(accessDays)) {
            throw new IllegalArgumentException("access_days must be 7, 15 or 30, or permanent must be true.");
        }
        var courtesy = courtesyCodes.createAfterAuthorization(
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
                distributor == null
                    ? "Cuenta creada directamente desde Administración de plataforma."
                    : "Cuenta creada desde la cartera del distribuidor " + distributor.companyName() + ".",
                distributor == null ? "PLATFORM-DIRECT" : "DISTRIBUTOR-DIRECT"
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
        var createdCompanyId = ((Number) created.get("company_id")).longValue();
        if (distributor == null) {
            jdbc.update(
                """
                    UPDATE companies
                    SET commercial_account_type = ?,
                        creation_origin = 'PLATFORM_ADMIN',
                        created_by_user_id = ?,
                        created_by_distributor_company_id = NULL,
                        created_by_distributor_name = NULL
                    WHERE id = ?
                    """,
                accountType,
                actorUserId,
                createdCompanyId
            );
        } else {
            jdbc.update(
                """
                    UPDATE companies
                    SET commercial_account_type = 'SUPER_ADMIN',
                        creation_origin = 'DISTRIBUTOR_PORTAL',
                        created_by_user_id = ?,
                        created_by_distributor_company_id = ?,
                        created_by_distributor_name = ?,
                        distributor_company_id = ?
                    WHERE id = ?
                    """,
                actorUserId,
                distributor.companyId(),
                distributor.companyName(),
                distributor.companyId(),
                createdCompanyId
            );
        }
        created.put("user_type", accountType);
        created.put("creation_origin", distributor == null ? "PLATFORM_ADMIN" : "DISTRIBUTOR_PORTAL");
        created.put("created_by_user_id", actorUserId);
        if (distributor != null) {
            created.put("created_by_distributor_company_id", distributor.companyId());
            created.put("created_by_distributor_company_name", distributor.companyName());
            created.put("distributor_company_id", distributor.companyId());
            created.put("distributor_company_name", distributor.companyName());
        }
        created.put("replayed", false);
        created.put("permanent", permanent);
        created.put("access_days", accessDays);
        created.put("employee_count", employeeCount);
        created.put("included_seats", INCLUDED_SEATS);
        confirmAppliedProducts(created, productCodes);
        created.put("extra_seats", extraSeats);
        created.put("signup_reference", checkout.signupReference());
        audit.record(
            actorUserId,
            "COMPANY_ACCOUNT_CREATED",
            "COMPANY",
            String.valueOf(created.get("company_id")),
            createdCompanyId,
            "SUCCESS",
            creationAuditMetadata(
                email, accountType, productCodes.size(), employeeCount,
                extraSeats, permanent, accessDays, distributor
            )
        );
        return created;
    }

    private Map<String, Object> creationAuditMetadata(
        String email,
        String accountType,
        int productCount,
        int employeeCount,
        int extraSeats,
        boolean permanent,
        Integer accessDays,
        DistributorCreation distributor
    ) {
        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("owner_email", email);
        metadata.put("user_type", accountType);
        metadata.put("product_count", productCount);
        metadata.put("employee_count", employeeCount);
        metadata.put("included_seats", INCLUDED_SEATS);
        metadata.put("extra_seats", extraSeats);
        metadata.put("permanent", permanent);
        metadata.put("access_days", accessDays == null ? 0 : accessDays);
        metadata.put("creation_origin", distributor == null ? "PLATFORM_ADMIN" : "DISTRIBUTOR_PORTAL");
        if (distributor != null) metadata.put("distributor_company_id", distributor.companyId());
        return metadata;
    }

    private void confirmAppliedProducts(
        LinkedHashMap<String, Object> account,
        List<String> requestedProductCodes
    ) {
        var appliedProducts = appliedProducts(((Number) account.get("company_id")).longValue());
        var appliedProductCodes = appliedProducts.stream()
            .map(AppliedProduct::code)
            .toList();
        if (!Set.copyOf(appliedProductCodes).equals(Set.copyOf(requestedProductCodes))) {
            throw new IllegalStateException(
                "La cuenta se creó, pero los módulos seleccionados no terminaron de cargarse. Abre Administrar cuenta para completar el acceso."
            );
        }
        account.put("product_codes", appliedProductCodes);
        account.put("products", appliedProducts.stream()
            .map(product -> Map.of("code", product.code(), "name", product.name()))
            .toList());
        account.put("modules_applied", true);
    }

    private List<AppliedProduct> appliedProducts(long companyId) {
        return jdbc.query(
            """
                SELECT product.product_code, product.display_name
                FROM company_benefit_grants benefit
                JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.company_id = ?
                  AND benefit.benefit_type = 'PRODUCT'
                  AND benefit.status = 'ACTIVE'
                  AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                  AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                ORDER BY product.sort_order, product.display_name
                """,
            (rs, rowNum) -> new AppliedProduct(
                rs.getString("product_code"),
                rs.getString("display_name")
            ),
            companyId
        );
    }

    private LinkedHashMap<String, Object> existingAccount(String companyName, String email) {
        return jdbc.query(
            """
                SELECT company.id AS company_id, company.name AS company_name,
                       company.commercial_account_type AS user_type,
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
                row.put("user_type", rs.getString("user_type"));
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

    private String accountType(String value) {
        var normalized = clean(value, 24).toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) normalized = "SUPER_ADMIN";
        if (!ACCOUNT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Account type must be SUPER_ADMIN or DISTRIBUTOR.");
        }
        return normalized;
    }

    private int employeeCount(Integer value) {
        if (value == null || value < 1 || value > MAX_EMPLOYEES) {
            throw new IllegalArgumentException(
                "employee_count must be between 1 and " + MAX_EMPLOYEES + "."
            );
        }
        return value;
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
        Integer employee_count,
        String account_type,
        List<String> product_codes,
        Integer extra_seats,
        Integer access_days,
        Boolean permanent
    ) {}

    record AppliedProduct(String code, String name) {
    }

    private record DistributorCreation(long companyId, String companyName) {
        private DistributorCreation {
            companyName = companyName == null || companyName.isBlank() ? "Distribuidor" : companyName.trim();
        }
    }
}
