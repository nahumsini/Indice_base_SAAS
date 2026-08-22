package com.indice.erp.configcenter.profile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.support.ConfigCenterSupport;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.LinkedHashMap;
import java.util.Map;
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
        var phone = value(payload, "telefono");
        var country = normalizeCountry(value(payload, "country", "pais"));
        var preferredLanguage = firstNonBlank(value(payload, "preferred_language"), "es-419");
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
                storageMeter.commit(companyId, documentsBucket(), avatarObjectKey, metadata.sizeBytes());
            }
        }
        var newPassword = value(payload, "new_password");
        var confirmNewPassword = value(payload, "confirm_new_password", "password_confirmation", "confirm_password");
        var hasPasswordChange = !newPassword.isBlank() || !confirmNewPassword.isBlank();

        var fullName = joinParts(firstName, secondName, lastName, maternalLastName);
        var givenNames = joinParts(firstName, secondName);
        var familyNames = joinParts(lastName, maternalLastName);
        if (fullName.isBlank()) {
            throw new IllegalArgumentException("At least one name field is required.");
        }

        if (hasPasswordChange) {
            if (!newPassword.equals(confirmNewPassword)) {
                throw new IllegalArgumentException("The new password and its confirmation must match.");
            }

            if (newPassword.length() < 8) {
                throw new IllegalArgumentException("The new password must be at least 8 characters long.");
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
                if (deleteProfileAvatarObjectQuietly(previousAvatarObjectKey)) {
                    storageMeter.release(companyId, previousAvatarObjectKey, "profile_avatar_replaced");
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

        return getCurrentUser(userId, currentRole);
    }
}
