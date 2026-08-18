package com.indice.erp.auth;

import java.sql.Statement;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class SignupService {

    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SignupAccountProvisioner accountProvisioner;
    private final SignupWelcomeEmailService welcomeEmailService;

    public SignupService(
        JdbcTemplate jdbcTemplate,
        BCryptPasswordEncoder passwordEncoder,
        SignupAccountProvisioner accountProvisioner,
        SignupWelcomeEmailService welcomeEmailService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.accountProvisioner = accountProvisioner;
        this.welcomeEmailService = welcomeEmailService;
    }

    public SignupProfile prepareForCheckout(SignupRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Account details are required.");
        }
        var fullName = requireText(request.fullName(), "Full name is required.", 100);
        var email = requireEmail(request.email());
        var password = requirePassword(request.password());
        var companyName = requireText(request.companyName(), "Company name is required.", 120);
        var industry = requireText(request.industry(), "Industry is required.", 120);
        var companySize = requireText(request.companySize(), "Company size is required.", 80);
        var country = requireText(request.country(), "Country is required.", 2).toUpperCase();
        var phone = requireText(request.phone(), "Phone is required.", 50);
        ensureEmailAvailable(email);

        return new SignupProfile(
            fullName,
            email,
            passwordEncoder.encode(password),
            companyName,
            industry,
            companySize,
            country,
            phone
        );
    }

    @Transactional
    public SignupResult createVerifiedAccount(SignupProfile profile, SignupBillingInfo billing) {
        if (profile == null) {
            throw new IllegalArgumentException("Account details are required.");
        }
        if (billing == null) {
            throw new IllegalArgumentException("Billing confirmation is required.");
        }
        ensureEmailAvailable(profile.email());
        var companyId = insertReturningId(
            "INSERT INTO companies (name, commercial_account_type, creation_origin) VALUES (?, 'SUPER_ADMIN', 'WEB_SELF_SERVICE')",
            profile.companyName()
        );
        var userId = insertReturningId(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
            profile.email(),
            profile.passwordHash(),
            profile.fullName()
        );
        jdbcTemplate.update(
            "UPDATE companies SET created_by_user_id = ? WHERE id = ?",
            userId,
            companyId
        );
        insertUserProfile(userId, profile.fullName(), profile.phone(), profile.country());
        var userCompanyId = insertReturningId(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'superadmin', 'active', 'all')",
            userId,
            companyId
        );
        accountProvisioner.provision(companyId, userId, userCompanyId, profile, billing);
        sendWelcomeAfterCommit(profile, billing);

        return new SignupResult(userId, companyId, userCompanyId);
    }

    public void storeSession(jakarta.servlet.http.HttpSession session, SignupResult result, String fullName) {
        session.setAttribute(SessionAuthService.SESSION_USER_ID, result.userId());
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, result.companyId());
        session.setAttribute(SessionAuthService.SESSION_USER_COMPANY_ID, result.userCompanyId());
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, fullName);
        session.setAttribute(SessionAuthService.SESSION_ROLE, "superadmin");
    }

    private void ensureEmailAvailable(String email) {
        var count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(email) = ?", Long.class, email);
        if (count != null && count > 0) {
            throw new IllegalArgumentException("An account already exists for this email.");
        }
    }

    private void insertUserProfile(long userId, String fullName, String phone, String country) {
        jdbcTemplate.update(
            "INSERT INTO user_profiles (user_id, full_name, phone, country) VALUES (?, ?, ?, ?)",
            userId,
            fullName,
            clean(phone, 50),
            clean(country, 2).toUpperCase()
        );
    }

    private long insertReturningId(String sql, Object... args) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (var index = 0; index < args.length; index += 1) {
                statement.setObject(index + 1, args[index]);
            }
            return statement;
        }, keyHolder);
        var key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Database did not return a generated id.");
        }
        return key.longValue();
    }

    private void sendWelcomeAfterCommit(SignupProfile profile, SignupBillingInfo billing) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            welcomeEmailService.sendWelcome(profile, billing);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                welcomeEmailService.sendWelcome(profile, billing);
            }
        });
    }

    private String requireEmail(String value) {
        var email = clean(value, 120).toLowerCase();
        if (email.isBlank() || !email.contains("@")) {
            throw new IllegalArgumentException("A valid email is required.");
        }
        return email;
    }

    private String requirePassword(String value) {
        var password = value == null ? "" : value;
        if (password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        return password;
    }

    private String requireText(String value, String message, int maxLength) {
        var cleaned = clean(value, maxLength);
        if (cleaned.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return cleaned;
    }

    private String clean(String value, int maxLength) {
        var cleaned = value == null ? "" : value.trim();
        if (cleaned.length() > maxLength) {
            throw new IllegalArgumentException("Value is too long.");
        }
        return cleaned;
    }

    public record SignupResult(long userId, long companyId, long userCompanyId) {}
}
