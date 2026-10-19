package com.indice.erp.configcenter.profile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.support.ConfigCenterSupport;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.nio.charset.StandardCharsets;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

public abstract class ConfigCenterProfileUseCases extends ConfigCenterSupport {

    protected ConfigCenterProfileUseCases(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        CompanyStorageMeter storageMeter
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties, storageMeter);
    }

    public Map<String, Object> getCurrentUser(long userId, String currentRole) {
        var rows = jdbcTemplate.query(
            """
                SELECT u.id,
                       u.email,
                       COALESCE(NULLIF(p.full_name, ''), COALESCE(u.full_name, '')) AS full_name,
                       COALESCE(p.given_names, '') AS given_names,
                       COALESCE(p.family_names, '') AS family_names,
                       COALESCE(p.phone, '') AS phone,
                       p.phone_numbers_json,
                       COALESCE(p.country, '') AS country,
                       COALESCE(p.preferred_language, 'es-419') AS preferred_language,
                       COALESCE(p.avatar_url, '') AS avatar_url,
                       COALESCE(p.avatar_object_key, '') AS avatar_object_key,
                       COALESCE(p.avatar_content_type, '') AS avatar_content_type
                FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE u.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var fullName = safe(rs.getString("full_name"));
                var storedGivenNames = safe(rs.getString("given_names")).trim();
                var storedFamilyNames = safe(rs.getString("family_names")).trim();
                var parsed = storedGivenNames.isBlank() && storedFamilyNames.isBlank()
                    ? splitFullName(fullName)
                    : new com.indice.erp.configcenter.support.NameParts(storedGivenNames, storedFamilyNames);
                var avatarObjectKey = safe(rs.getString("avatar_object_key"));
                var avatarUrl = firstNonBlank(
                    safe(signedProfileAvatarUrl(avatarObjectKey)),
                    safe(rs.getString("avatar_url"))
                );

                var user = new LinkedHashMap<String, Object>();
                user.put("id", rs.getLong("id"));
                user.put("email", safe(rs.getString("email")));
                user.put("apodo", "");
                user.put("nombres", parsed.firstName());
                user.put("apellidos", parsed.lastName());
                user.put("primer_nombre", parsed.firstName());
                user.put("segundo_nombre", "");
                user.put("apellido_paterno", parsed.lastName());
                user.put("apellido_materno", "");
                user.put("telefono", safe(rs.getString("phone")));
                user.put("phone_numbers", ProfilePhoneNumbers.read(rs.getString("phone_numbers_json"),
                    safe(rs.getString("phone")), safe(rs.getString("country")), objectMapper));
                user.put("country", safe(rs.getString("country")));
                user.put("preferred_language", safe(rs.getString("preferred_language")));
                user.put("avatar_url", avatarUrl);
                user.put("avatar_object_key", avatarObjectKey);
                user.put("avatar_content_type", safe(rs.getString("avatar_content_type")));
                user.put("role", currentRole);
                return user;
            },
            userId
        );

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("User not found.");
        }
        return rows.get(0);
    }

    public Map<String, Object> createCurrentUserAvatarUpload(long companyId, long userId, Map<String, Object> payload) {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var contentType = normalizeProfileAvatarContentType(value(payload, "content_type", "contentType", "mime_type"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (sizeBytes > MAX_PROFILE_AVATAR_SIZE_BYTES) {
            throw new IllegalArgumentException("Profile photos must be 1MB or smaller.");
        }

        var objectKey = buildCurrentUserAvatarObjectKey(companyId, userId, contentType);
        var upload = storageMeter.presign(
            companyId,
            "CONFIG_CENTER",
            documentsBucket(),
            objectKey,
            contentType,
            sizeBytes,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt());
        body.put("upload_headers", upload.uploadHeaders());
        body.put("content_type", contentType);
        return body;
    }

    @Transactional
    public Map<String, Object> saveCurrentUser(long companyId, long userId, String currentRole, Map<String, Object> payload) {
        var firstName = value(payload, "primer_nombre", "nombres");
        var secondName = value(payload, "segundo_nombre");
        var lastName = value(payload, "apellido_paterno", "apellidos");
        var maternalLastName = value(payload, "apellido_materno");
        var country = normalizeCountry(value(payload, "country", "pais"));
        if (!country.isBlank() && !com.google.i18n.phonenumbers.PhoneNumberUtil.getInstance().getSupportedRegions().contains(country))
            throw new ProfileInputException("profile_invalid_country", "Choose a valid country.");
        if (payload.containsKey("country") && country.isBlank())
            throw new ProfileInputException("profile_invalid_country", "Choose a valid country.");
        List<Map<String, Object>> phones = null;
        if (payload.containsKey("phone_numbers")) phones = ProfilePhoneNumbers.normalize(payload.get("phone_numbers"), country);
        else if (payload.containsKey("telefono")) phones = value(payload, "telefono").isBlank() ? List.of()
            : ProfilePhoneNumbers.normalize(List.of(Map.of("phone", value(payload, "telefono"), "country", country, "label", "Mobile")), country);
        var phone = phones == null || phones.isEmpty() ? "" : (String) phones.get(0).get("phone");
        var preferredLanguage = firstNonBlank(value(payload, "preferred_language"), "es-419");
        if (!java.util.Set.of("es-419", "es-MX", "es-CO", "en-US", "en-CA", "fr-CA", "pt-BR", "ko-CA", "zh-CA").contains(preferredLanguage))
            throw new ProfileInputException("profile_invalid_language", "Choose a supported language.");
        var newPassword = rawPassword(payload, "new_password");
        var confirmNewPassword = rawPassword(payload, "confirm_new_password", "password_confirmation", "confirm_password");
        var hasPasswordChange = !newPassword.isEmpty() || !confirmNewPassword.isEmpty();
        var fullName = joinParts(firstName, secondName, lastName, maternalLastName);
        var givenNames = joinParts(firstName, secondName);
        var familyNames = joinParts(lastName, maternalLastName);
        if (fullName.isBlank()) throw new ProfileInputException("profile_name_required", "At least one name field is required.");
        if (fullName.codePointCount(0, fullName.length()) > 100)
            throw new ProfileInputException("profile_name_too_long", "Use at most 100 characters for your full name.");
        if (hasPasswordChange) {
            if (!newPassword.equals(confirmNewPassword)) throw new ProfileInputException("profile_password_mismatch", "The new password and its confirmation must match.");
            if (newPassword.isBlank() || newPassword.length() < 8) throw new ProfileInputException("profile_password_short", "The new password must be at least 8 characters long.");
            if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) throw new ProfileInputException("profile_password_long", "The new password is too long.");
        }
        if (phones == null) {
            var existingPhones = jdbcTemplate.queryForList("SELECT COALESCE(phone, '') FROM user_profiles WHERE user_id = ?", String.class, userId);
            phone = existingPhones.isEmpty() ? "" : existingPhones.get(0);
        }
        var hasAvatarUpdate = hasAnyKey(payload, "avatar_object_key", "avatarObjectKey");
        var avatarObjectKey = "";
        var avatarContentType = "";
        if (hasAvatarUpdate) {
            avatarObjectKey = normalizeCurrentUserAvatarObjectKey(
                companyId,
                userId,
                value(payload, "avatar_object_key", "avatarObjectKey")
            );
            avatarContentType = avatarObjectKey.isBlank()
                ? ""
                : normalizeProfileAvatarContentType(value(payload, "avatar_content_type", "avatarContentType", "content_type"));
            if (!avatarObjectKey.isBlank() && !objectStorageService.objectExists(documentsBucket(), avatarObjectKey)) {
                throw new IllegalArgumentException("avatar_object_key does not reference an existing uploaded profile photo.");
            }
            if (!avatarObjectKey.isBlank()) {
                var metadata = objectStorageService.objectMetadata(documentsBucket(), avatarObjectKey);
                if (metadata.sizeBytes() <= 0 || metadata.sizeBytes() > MAX_PROFILE_AVATAR_SIZE_BYTES)
                    throw new ProfileInputException("profile_avatar_size", "The uploaded profile photo must be 1MB or smaller.");
                if (!avatarContentType.equalsIgnoreCase(metadata.contentType()))
                    throw new ProfileInputException("profile_avatar_type", "The uploaded profile photo type does not match.");
                storageMeter.commit(companyId, documentsBucket(), avatarObjectKey, metadata.sizeBytes());
            }
        }
        jdbcTemplate.update("UPDATE users SET full_name = ? WHERE id = ?", fullName, userId);
        if (hasPasswordChange) {
            jdbcTemplate.update(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                passwordEncoder.encode(newPassword),
                userId
            );
        }

        if (hasAvatarUpdate) {
            var previousAvatarObjectKey = loadCurrentUserAvatarObjectKey(userId);
            jdbcTemplate.update(
                """
                    INSERT INTO user_profiles
                    (user_id, full_name, given_names, family_names, phone, country, preferred_language, avatar_url, avatar_object_key, avatar_content_type, avatar_updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP)
                    ON DUPLICATE KEY UPDATE
                        full_name = VALUES(full_name),
                        given_names = VALUES(given_names),
                        family_names = VALUES(family_names),
                        phone = VALUES(phone),
                        country = VALUES(country),
                        preferred_language = VALUES(preferred_language),
                        avatar_url = VALUES(avatar_url),
                        avatar_object_key = VALUES(avatar_object_key),
                        avatar_content_type = VALUES(avatar_content_type),
                        avatar_updated_at = VALUES(avatar_updated_at)
                    """,
                userId,
                fullName,
                nullable(givenNames),
                nullable(familyNames),
                nullable(phone),
                nullable(country),
                preferredLanguage,
                nullable(avatarObjectKey),
                nullable(avatarContentType)
            );
            if (!previousAvatarObjectKey.isBlank() && !previousAvatarObjectKey.equals(avatarObjectKey)) {
                // Identity is global to the user; the stored key identifies the company that paid for the old upload.
                var prefix = java.util.regex.Pattern.compile("^config-center/user-profiles/([0-9]+)/" + userId + "/avatar/").matcher(previousAvatarObjectKey);
                if (prefix.find()) {
                    long previousCompanyId = Long.parseLong(prefix.group(1));
                    if (TransactionSynchronizationManager.isSynchronizationActive()) {
                        // Quota release joins the same transaction as the new metadata; deletion waits for commit.
                        storageMeter.release(previousCompanyId, previousAvatarObjectKey, "profile_avatar_replaced");
                        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                            @Override public void afterCommit() { deleteProfileAvatarObjectQuietly(previousAvatarObjectKey); }
                        });
                    }
                    // Without an enclosing owner transaction, keep the old object rather than risk deleting a referenced photo.
                }
            }
        } else {
            jdbcTemplate.update(
                """
                    INSERT INTO user_profiles (user_id, full_name, given_names, family_names, phone, country, preferred_language)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        full_name = VALUES(full_name),
                        given_names = VALUES(given_names),
                        family_names = VALUES(family_names),
                        phone = VALUES(phone),
                        country = VALUES(country),
                        preferred_language = VALUES(preferred_language)
                    """,
                userId,
                fullName,
                nullable(givenNames),
                nullable(familyNames),
                nullable(phone),
                nullable(country),
                preferredLanguage
            );
        }

        if (phones != null) jdbcTemplate.update("UPDATE user_profiles SET phone_numbers_json = ? WHERE user_id = ?",
            ProfilePhoneNumbers.json(phones, objectMapper), userId);
        return getCurrentUser(userId, currentRole);
    }

    private String rawPassword(Map<String, Object> payload, String... keys) {
        for (var key : keys) if (payload.containsKey(key)) {
            if (!(payload.get(key) instanceof String password))
                throw new ProfileInputException("profile_invalid_password", "Enter a valid password.");
            return password;
        }
        return "";
    }
}
