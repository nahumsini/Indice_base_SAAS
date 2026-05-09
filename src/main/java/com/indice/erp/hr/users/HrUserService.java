package com.indice.erp.hr.users;

import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseBigDecimal;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrUserService {

    private static final long MAX_DOCUMENT_SIZE_BYTES = 5L * 1024L * 1024L;

    private final JdbcTemplate jdbcTemplate;
    private final HrAttendanceService hrAttendanceService;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public HrUserService(
        JdbcTemplate jdbcTemplate,
        HrAttendanceService hrAttendanceService,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrAttendanceService = hrAttendanceService;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
    }

    public Map<String, Object> listUsers(long companyId) {
        var hrUsers = jdbcTemplate.query(
            """
                SELECT e.id,
                       e.user_code AS user_code,
                       e.first_name,
                       e.last_name,
                       e.email,
                       e.phone,
                       e.position,
                       e.department,
                       e.unit_id,
                       u.name AS unit_name,
                       e.business_id,
                       b.name AS business_name,
                       e.hire_date,
                       COALESCE(e.salary, 0) AS salary,
                       e.pay_period,
                       e.salary_type,
                       e.hourly_rate,
                       e.contract_type,
                       e.contract_start_date,
                       e.contract_end_date,
                       e.termination_date,
                       e.last_working_day,
                       e.termination_reason_type,
                       e.termination_reason_code,
                       e.termination_summary,
                       e.user_id,
                       e.user_company_id,
                       e.work_profile_id,
                       COALESCE(e.status, 'active') AS status
                FROM hr_users e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                  AND e.work_profile_id IS NOT NULL
                ORDER BY e.id DESC
                """,
            (rs, rowNum) -> mapHrUserRow(rs),
            companyId
        );

        var summary = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) AS total_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'active')) = 'active' THEN 1 ELSE 0 END) AS active_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'active')) = 'inactive' THEN 1 ELSE 0 END) AS inactive_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'active')) = 'terminated' THEN 1 ELSE 0 END) AS terminated_count,
                       COALESCE(SUM(
                           CASE
                               WHEN LOWER(COALESCE(salary_type, 'daily')) = 'hourly' THEN COALESCE(hourly_rate, 0) * 8 * 22
                               ELSE COALESCE(salary, 0) * 30
                           END
                       ), 0) AS total_payroll_amount_monthly
                FROM hr_users
                WHERE company_id = ?
                  AND work_profile_id IS NOT NULL
                """,
            (rs, rowNum) -> {
                var body = new LinkedHashMap<String, Object>();
                body.put("total_count", rs.getInt("total_count"));
                body.put("active_count", rs.getInt("active_count"));
                body.put("inactive_count", rs.getInt("inactive_count"));
                body.put("terminated_count", rs.getInt("terminated_count"));
                body.put("total_payroll_amount_monthly", rs.getBigDecimal("total_payroll_amount_monthly"));
                return body;
            },
            companyId
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("rows", hrUsers);
        result.put("meta", summary != null ? summary : Map.of());
        return result;
    }

    public Map<String, Object> getUserDetails(long companyId, long userCompanyId) {
        requireHrUser(companyId, userCompanyId);
        return hrUserDetails(userCompanyId, companyId);
    }

    @Transactional
    public Map<String, Object> createUser(long companyId, long createdBy, Map<String, Object> payload) {
        var userPayload = mergedSectionPayload(payload, "user");
        var profilePayload = mergedSectionPayload(payload, "profile");

        var draft = buildHrUserDraft(companyId, userPayload);
        draft = draft.withUserCode(resolveUserCodeForCreate(companyId, draft.userCode()));
        var hrUserDraft = draft;
        var profileDraft = buildProfileDraft(profilePayload, ProfileDraft.empty());
        var userRole = normalizeUserRole(stringValue(userPayload, "role", "user_role", "access_role"));

        var userIdentity = mirrorHrUserIdentity(companyId, createdBy, 0L, hrUserDraft, profileDraft, userRole);
        ensureDefaultUserAccessProfile(companyId, userIdentity, createdBy);
        return hrUserDetails(userIdentity.userCompanyId(), companyId);
    }

    @Transactional
    public Map<String, Object> updateUser(long companyId, Map<String, Object> payload) {
        var userCompanyId = parseLong(payload, "id", "user_company_id");
        if (userCompanyId == null || userCompanyId <= 0) {
            throw new IllegalArgumentException("id is required.");
        }

        requireHrUser(companyId, userCompanyId);

        var userPayload = mergedSectionPayload(payload, "user");
        var profilePayload = mergedSectionPayload(payload, "profile");

        var draft = buildHrUserDraft(companyId, userPayload);
        draft = draft.withUserCode(resolveUserCodeForUpdate(companyId, userCompanyId, draft.userCode()));
        var currentProfile = loadProfileDraft(companyId, userCompanyId);
        var profileDraft = buildProfileDraft(profilePayload, currentProfile);
        var userRole = normalizeUserRole(stringValue(userPayload, "role", "user_role", "access_role"));

        var userIdentity = loadUserWorkIdentity(companyId, userCompanyId);
        updateExistingUserIdentity(userIdentity.userId(), draft, profileDraft);
        updateUserCompany(companyId, userIdentity.userCompanyId(), draft.status(), userRole);
        upsertUserWorkProfile(companyId, userIdentity.userCompanyId(), userIdentity.userId(), null, draft, profileDraft);
        ensureDefaultUserAccessProfile(companyId, userIdentity, null);
        return hrUserDetails(userCompanyId, companyId);
    }

    @Transactional
    public void deleteUser(long companyId, long userCompanyId) {
        requireHrUser(companyId, userCompanyId);

        var documentObjectKeys = jdbcTemplate.query(
            """
                SELECT object_key
                FROM user_documents
                WHERE company_id = ? AND user_company_id = ?
                """,
            (rs, rowNum) -> safe(rs.getString("object_key")),
            companyId,
            userCompanyId
        );

        jdbcTemplate.update(
            "DELETE FROM user_documents WHERE user_company_id = ? AND company_id = ?",
            userCompanyId,
            companyId
        );

        var rowsUpdated = jdbcTemplate.update(
            "DELETE FROM user_work_profiles WHERE user_company_id = ? AND company_id = ?",
            userCompanyId,
            companyId
        );
        if (rowsUpdated == 0) {
            throw new NoSuchElementException("HR user not found.");
        }

        if (objectStorageService.isEnabled()) {
            documentObjectKeys.stream()
                .filter(key -> key != null && !key.isBlank())
                .forEach(this::deleteUserDocumentObjectQuietly);
        }
    }

    @Transactional
    public Map<String, Object> terminateUser(long companyId, long userCompanyId, Map<String, Object> payload) {
        requireHrUser(companyId, userCompanyId);

        var exitDate = parseDate(payload, "exit_date", "termination_date");
        if (exitDate == null) {
            throw new IllegalArgumentException("exit_date is required.");
        }

        var reasonType = normalizeTerminationReasonType(stringValue(payload, "reason_type"));
        var reasonCode = nullable(stringValue(payload, "specific_reason", "reason_code"));
        var summary = stringValue(payload, "summary", "termination_summary");
        if (summary.isBlank()) {
            throw new IllegalArgumentException("summary is required.");
        }

        var lastWorkingDay = parseDate(payload, "last_working_day");
        if (lastWorkingDay == null) {
            lastWorkingDay = exitDate;
        }

        var rowsUpdated = jdbcTemplate.update(
            """
                UPDATE user_work_profiles
                SET status = 'terminated',
                    termination_date = ?,
                    last_working_day = ?,
                    termination_reason_type = ?,
                    termination_reason_code = ?,
                    termination_summary = ?
                WHERE user_company_id = ? AND company_id = ?
                """,
            exitDate,
            lastWorkingDay,
            reasonType,
            reasonCode,
            summary,
            userCompanyId,
            companyId
        );

        if (rowsUpdated == 0) {
            throw new NoSuchElementException("HR user not found.");
        }
        jdbcTemplate.update(
            "UPDATE user_companies SET status = 'inactive' WHERE id = ? AND company_id = ?",
            userCompanyId,
            companyId
        );

        return hrUserDetails(userCompanyId, companyId);
    }

    public Map<String, Object> createDocumentUpload(long companyId, long userCompanyId, Map<String, Object> payload) {
        requireHrUser(companyId, userCompanyId);

        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var documentType = normalizeDocumentType(stringValue(payload, "document_type", "documentType"));
        var contentType = normalizeDocumentContentType(stringValue(payload, "content_type", "contentType", "mime_type"));
        var originalFileName = normalizeOriginalFileName(stringValue(payload, "file_name", "fileName", "original_filename"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Documents must be 5MB or smaller.");
        }

        var objectKey = buildHrUserDocumentObjectKey(companyId, userCompanyId, documentType, originalFileName, contentType);
        var upload = objectStorageService.presignUpload(
            documentsBucket(),
            objectKey,
            contentType,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("document_type", documentType);
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    @Transactional
    public Map<String, Object> registerUserDocument(
        long companyId,
        long uploadedByUserId,
        long userCompanyId,
        Map<String, Object> payload
    ) {
        requireHrUser(companyId, userCompanyId);

        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var documentType = normalizeDocumentType(stringValue(payload, "document_type", "documentType"));
        var objectKey = normalizeDocumentObjectKey(companyId, userCompanyId, documentType, stringValue(payload, "object_key", "objectKey"));
        var originalFileName = normalizeOriginalFileName(stringValue(payload, "original_filename", "originalFileName", "file_name", "fileName"));
        var mimeType = normalizeDocumentContentType(stringValue(payload, "mime_type", "mimeType", "content_type", "contentType"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }

        if (!objectStorageService.objectExists(documentsBucket(), objectKey)) {
            throw new IllegalArgumentException("object_key does not reference an existing uploaded document.");
        }

        var existingRows = jdbcTemplate.query(
            """
                SELECT id, object_key
                FROM user_documents
                WHERE company_id = ? AND user_company_id = ? AND document_type = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new HrUserDocumentRef(rs.getLong("id"), safe(rs.getString("object_key"))),
            companyId,
            userCompanyId,
            documentType
        );

        if (!existingRows.isEmpty()) {
            var existing = existingRows.getFirst();
            if (!existing.objectKey().equals(objectKey)) {
                deleteUserDocumentObjectQuietly(existing.objectKey());
            }
        }

        jdbcTemplate.update(
            """
                INSERT INTO user_documents
                (company_id, user_company_id, user_id, document_type, original_filename, mime_type, size_bytes, object_key, status, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
                ON DUPLICATE KEY UPDATE
                  original_filename = VALUES(original_filename),
                  mime_type = VALUES(mime_type),
                  size_bytes = VALUES(size_bytes),
                  object_key = VALUES(object_key),
                  status = 'active',
                  uploaded_by_user_id = VALUES(uploaded_by_user_id),
                  updated_at = CURRENT_TIMESTAMP
                """,
            companyId,
            userCompanyId,
            loadUserWorkIdentity(companyId, userCompanyId).userId(),
            documentType,
            originalFileName,
            mimeType,
            sizeBytes,
            objectKey,
            uploadedByUserId
        );

        return loadHrUserDocument(companyId, userCompanyId, documentType);
    }

    @Transactional
    public void deleteUserDocument(long companyId, long userCompanyId, long documentId) {
        requireHrUser(companyId, userCompanyId);

        var rows = jdbcTemplate.query(
            """
                SELECT object_key
                FROM user_documents
                WHERE id = ? AND company_id = ? AND user_company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> safe(rs.getString("object_key")),
            documentId,
            companyId,
            userCompanyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user document not found.");
        }

        jdbcTemplate.update(
            "DELETE FROM user_documents WHERE id = ? AND company_id = ? AND user_company_id = ?",
            documentId,
            companyId,
            userCompanyId
        );

        deleteUserDocumentObjectQuietly(rows.getFirst());
    }

    private HrUserDraft buildHrUserDraft(long companyId, Map<String, Object> payload) {
        var firstName = stringValue(payload, "first_name", "firstName", "nombre");
        var lastName = stringValue(payload, "last_name", "lastName", "apellidos");
        var email = normalizeEmail(stringValue(payload, "email", "correo"));
        if (firstName.isBlank() || lastName.isBlank() || email.isBlank()) {
            throw new IllegalArgumentException("first_name, last_name, and email are required.");
        }

        var userCode = normalizeUserCode(
            stringValue(payload, "user_code", "userCode", "user_code")
        );
        var phone = normalizePhoneValue(stringValue(payload, "phone", "telefono", "telefonoMovil", "mobile_phone"));
        var position = stringValue(payload, "position", "job_title", "puesto");
        var department = stringValue(payload, "department", "departamento");
        var unitId = normalizeOptionalForeignKey(parseLong(payload, "unit_id", "unidad_id", "business_unit_id", "unidadNegocio", "businessUnitId"));
        var businessId = normalizeOptionalForeignKey(parseLong(payload, "business_id", "negocio_id", "negocio", "businessId"));
        var hireDate = parseDate(payload, "hire_date", "hireDate", "fechaIngreso");
        var salary = parseBigDecimal(payload, "salary", "salario");
        var payPeriod = normalizePayPeriod(stringValue(payload, "pay_period", "payPeriod", "periodoPago"));
        var salaryType = normalizeSalaryType(stringValue(payload, "salary_type", "salaryType", "tipoSalario"));
        var hourlyRate = parseBigDecimal(payload, "hourly_rate", "hourlyRate", "sueldoPorHora");
        var contractType = normalizeContractType(stringValue(payload, "contract_type", "contractType", "tipoContrato"));
        var contractStartDate = parseDate(payload, "contract_start_date", "contractStartDate", "fechaInicioContrato");
        var contractEndDate = parseDate(payload, "contract_end_date", "contractEndDate", "fechaFinContrato");
        var status = normalizeHrUserStatus(stringValue(payload, "status", "estado"));

        if (position.isBlank()) {
            throw new IllegalArgumentException("position is required.");
        }

        if (department.isBlank()) {
            throw new IllegalArgumentException("department is required.");
        }

        if (unitId == null) {
            throw new IllegalArgumentException("unit_id is required.");
        }

        if (businessId == null) {
            throw new IllegalArgumentException("business_id is required.");
        }

        validateOrganizationRefs(companyId, unitId, businessId);

        if ("temporary".equals(contractType)) {
            if (contractStartDate == null) {
                throw new IllegalArgumentException("Temporary contracts require contract_start_date.");
            }
            if (contractEndDate == null) {
                throw new IllegalArgumentException("Temporary contracts require contract_end_date.");
            }
            if (contractEndDate.isBefore(contractStartDate)) {
                throw new IllegalArgumentException("contract_end_date must be the same as or after contract_start_date.");
            }
        }

        if ("daily".equals(salaryType)) {
            if (salary == null) {
                throw new IllegalArgumentException("salary is required for daily users.");
            }
            if (salary.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("salary must be greater than zero for daily users.");
            }
        }

        if ("hourly".equals(salaryType)) {
            if (hourlyRate == null) {
                throw new IllegalArgumentException("hourly_rate is required for hourly users.");
            }
            if (hourlyRate.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("hourly_rate must be greater than zero for hourly users.");
            }
            salary = salary == null ? BigDecimal.ZERO : salary;
        }

        if (contractStartDate == null && hireDate != null) {
            contractStartDate = hireDate;
        }

        return new HrUserDraft(
            userCode,
            firstName,
            lastName,
            email,
            phone,
            position,
            department,
            unitId,
            businessId,
            hireDate,
            salary,
            payPeriod,
            salaryType,
            hourlyRate,
            contractType,
            contractStartDate,
            contractEndDate,
            status
        );
    }

    private ProfileDraft buildProfileDraft(Map<String, Object> payload, ProfileDraft existingProfile) {
        return new ProfileDraft(
            resolveTextField(payload, existingProfile.dateOfBirthRaw(), "date_of_birth", "dateOfBirth", "fechaNacimiento") == null
                ? null
                : parseDate(Map.of("value", resolveTextField(payload, existingProfile.dateOfBirthRaw(), "date_of_birth", "dateOfBirth", "fechaNacimiento")), "value"),
            resolveTextField(payload, existingProfile.address(), "address", "direccion"),
            resolveTextField(payload, existingProfile.nationalId(), "national_id", "nationalId", "curp"),
            resolveTextField(payload, existingProfile.taxId(), "tax_id", "taxId", "rfc"),
            resolveTextField(payload, existingProfile.socialSecurityNumber(), "social_security_number", "socialSecurityNumber", "nss"),
            normalizeCountryCode(resolveTextField(payload, existingProfile.registrationCountry(), "registration_country", "registrationCountry", "paisRegistro")),
            resolveTextField(payload, existingProfile.stateProvince(), "state_province", "stateProvince", "provinciaEstado"),
            resolveTextField(payload, existingProfile.city(), "city", "ciudad"),
            resolveTextField(payload, existingProfile.postalCode(), "postal_code", "postalCode", "cp"),
            normalizePhoneValue(resolveTextField(payload, existingProfile.alternatePhone(), "alternate_phone", "alternatePhone", "telefonoAlterno")),
            resolveTextField(payload, existingProfile.emergencyContactName(), "emergency_contact_name", "emergencyContactName", "nombreContactoEmergencia"),
            resolveTextField(payload, existingProfile.emergencyContactRelationship(), "emergency_contact_relationship", "emergencyContactRelationship", "relacionContacto"),
            normalizePhoneValue(resolveTextField(payload, existingProfile.emergencyContactPhone(), "emergency_contact_phone", "emergencyContactPhone", "telefonoEmergencia")),
            resolveWorkdayHours(payload, existingProfile.workdayHours())
        );
    }

    private UserWorkIdentity mirrorHrUserIdentity(
        long companyId,
        Long createdBy,
        long ignoredUserCompanyId,
        HrUserDraft draft,
        ProfileDraft profileDraft,
        String requestedRole
    ) {
        var userId = findOrCreateUser(draft);
        upsertUserProfile(userId, draft, profileDraft);
        var userCompanyId = findOrCreateUserCompany(companyId, userId, draft.status(), requestedRole);
        upsertUserWorkProfile(companyId, userCompanyId, userId, createdBy, draft, profileDraft);
        return new UserWorkIdentity(userCompanyId, userId);
    }

    private long findOrCreateUser(HrUserDraft draft) {
        var existingRows = jdbcTemplate.query(
            """
                SELECT id
                FROM users
                WHERE email = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            draft.email()
        );

        if (!existingRows.isEmpty()) {
            var userId = existingRows.getFirst();
            jdbcTemplate.update(
                "UPDATE users SET full_name = ? WHERE id = ?",
                nullable(draft.fullName()),
                userId
            );
            return userId;
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO users (email, password_hash, full_name)
                    VALUES (?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setString(1, draft.email());
            statement.setString(2, passwordEncoder.encode(UUID.randomUUID().toString()));
            statement.setString(3, nullable(draft.fullName()));
            return statement;
        }, keyHolder);

        if (keyHolder.getKey() == null) {
            throw new IllegalStateException("Unable to create user for Human Resources profile.");
        }
        return keyHolder.getKey().longValue();
    }

    private void upsertUserProfile(long userId, HrUserDraft draft, ProfileDraft profileDraft) {
        jdbcTemplate.update(
            """
                INSERT INTO user_profiles (user_id, full_name, phone, country, preferred_language)
                VALUES (?, ?, ?, ?, 'es-419')
                ON DUPLICATE KEY UPDATE
                  full_name = VALUES(full_name),
                  phone = VALUES(phone),
                  country = VALUES(country),
                  preferred_language = COALESCE(user_profiles.preferred_language, VALUES(preferred_language)),
                  updated_at = CURRENT_TIMESTAMP
                """,
            userId,
            nullable(draft.fullName()),
            nullable(draft.phone()),
            nullable(profileDraft.registrationCountry())
        );
    }

    private void updateExistingUserIdentity(long userId, HrUserDraft draft, ProfileDraft profileDraft) {
        jdbcTemplate.update(
            "UPDATE users SET email = ?, full_name = ? WHERE id = ?",
            draft.email(),
            nullable(draft.fullName()),
            userId
        );
        upsertUserProfile(userId, draft, profileDraft);
    }

    private long findOrCreateUserCompany(long companyId, long userId, String workStatus, String requestedRole) {
        var existingRows = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE company_id = ? AND user_id = ?
                ORDER BY id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId,
            userId
        );

        var accessStatus = userCompanyStatusForWorkStatus(workStatus);
        if (!existingRows.isEmpty()) {
            var userCompanyId = existingRows.getFirst();
            if (requestedRole == null) {
                jdbcTemplate.update(
                    "UPDATE user_companies SET status = ?, visibility = COALESCE(NULLIF(visibility, ''), 'all') WHERE id = ?",
                    accessStatus,
                    userCompanyId
                );
            } else {
                jdbcTemplate.update(
                    "UPDATE user_companies SET role = ?, status = ?, visibility = COALESCE(NULLIF(visibility, ''), 'all') WHERE id = ?",
                    requestedRole,
                    accessStatus,
                    userCompanyId
                );
            }
            return userCompanyId;
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_companies (user_id, company_id, role, status, visibility)
                    VALUES (?, ?, ?, ?, 'all')
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, userId);
            statement.setLong(2, companyId);
            statement.setString(3, requestedRole == null ? "user" : requestedRole);
            statement.setString(4, accessStatus);
            return statement;
        }, keyHolder);

        if (keyHolder.getKey() == null) {
            throw new IllegalStateException("Unable to create company access for Human Resources user.");
        }
        return keyHolder.getKey().longValue();
    }

    private void updateUserCompany(long companyId, long userCompanyId, String workStatus, String requestedRole) {
        var accessStatus = userCompanyStatusForWorkStatus(workStatus);
        if (requestedRole == null) {
            jdbcTemplate.update(
                """
                    UPDATE user_companies
                    SET status = ?,
                        visibility = COALESCE(NULLIF(visibility, ''), 'all')
                    WHERE id = ? AND company_id = ?
                    """,
                accessStatus,
                userCompanyId,
                companyId
            );
            return;
        }

        jdbcTemplate.update(
            """
                UPDATE user_companies
                SET role = ?,
                    status = ?,
                    visibility = COALESCE(NULLIF(visibility, ''), 'all')
                WHERE id = ? AND company_id = ?
                """,
            requestedRole,
            accessStatus,
            userCompanyId,
            companyId
        );
    }

    private void upsertUserWorkProfile(
        long companyId,
        long userCompanyId,
        long userId,
        Long createdBy,
        HrUserDraft draft,
        ProfileDraft profileDraft
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO user_work_profiles
                (company_id, user_company_id, user_id, user_code, position, department, unit_id, business_id,
                 hire_date, salary, pay_period, salary_type, hourly_rate, contract_type, contract_start_date,
                 contract_end_date, date_of_birth, address, national_id, tax_id, social_security_number,
                 registration_country, state_province, city, postal_code, alternate_phone, emergency_contact_name,
                 emergency_contact_relationship, emergency_contact_phone, workday_hours, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  user_code = VALUES(user_code),
                  position = VALUES(position),
                  department = VALUES(department),
                  unit_id = VALUES(unit_id),
                  business_id = VALUES(business_id),
                  hire_date = VALUES(hire_date),
                  salary = VALUES(salary),
                  pay_period = VALUES(pay_period),
                  salary_type = VALUES(salary_type),
                  hourly_rate = VALUES(hourly_rate),
                  contract_type = VALUES(contract_type),
                  contract_start_date = VALUES(contract_start_date),
                  contract_end_date = VALUES(contract_end_date),
                  date_of_birth = VALUES(date_of_birth),
                  address = VALUES(address),
                  national_id = VALUES(national_id),
                  tax_id = VALUES(tax_id),
                  social_security_number = VALUES(social_security_number),
                  registration_country = VALUES(registration_country),
                  state_province = VALUES(state_province),
                  city = VALUES(city),
                  postal_code = VALUES(postal_code),
                  alternate_phone = VALUES(alternate_phone),
                  emergency_contact_name = VALUES(emergency_contact_name),
                  emergency_contact_relationship = VALUES(emergency_contact_relationship),
                  emergency_contact_phone = VALUES(emergency_contact_phone),
                  workday_hours = VALUES(workday_hours),
                  status = VALUES(status),
                  updated_at = CURRENT_TIMESTAMP
                """,
            companyId,
            userCompanyId,
            userId,
            nullable(draft.userCode()),
            nullable(draft.position()),
            nullable(draft.department()),
            draft.unitId(),
            draft.businessId(),
            draft.hireDate(),
            draft.salary(),
            draft.payPeriod(),
            draft.salaryType(),
            draft.hourlyRate(),
            draft.contractType(),
            draft.contractStartDate(),
            draft.contractEndDate(),
            profileDraft.dateOfBirth(),
            nullable(profileDraft.address()),
            nullable(profileDraft.nationalId()),
            nullable(profileDraft.taxId()),
            nullable(profileDraft.socialSecurityNumber()),
            nullable(profileDraft.registrationCountry()),
            nullable(profileDraft.stateProvince()),
            nullable(profileDraft.city()),
            nullable(profileDraft.postalCode()),
            nullable(profileDraft.alternatePhone()),
            nullable(profileDraft.emergencyContactName()),
            nullable(profileDraft.emergencyContactRelationship()),
            nullable(profileDraft.emergencyContactPhone()),
            profileDraft.workdayHours(),
            draft.status(),
            nullableCreatedBy(createdBy)
        );
    }

    private void ensureDefaultUserAccessProfile(long companyId, UserWorkIdentity identity, Long createdBy) {
        var existingRows = jdbcTemplate.query(
            """
                SELECT id
                FROM user_access_profiles
                WHERE company_id = ? AND user_company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId,
            identity.userCompanyId()
        );
        if (!existingRows.isEmpty()) {
            return;
        }

        jdbcTemplate.update(
            """
                INSERT INTO user_access_profiles
                (company_id, user_company_id, user_id, status, default_method, metadata_json, created_by)
                VALUES (?, ?, ?, 'active', 'pin', CAST(? AS JSON), ?)
                ON DUPLICATE KEY UPDATE
                  status = VALUES(status),
                  default_method = VALUES(default_method),
                  metadata_json = VALUES(metadata_json),
                  updated_at = CURRENT_TIMESTAMP
                """,
            companyId,
            identity.userCompanyId(),
            identity.userId(),
            "{\"supports_face_recognition\":false}",
            nullableCreatedBy(createdBy)
        );
    }

    private UserWorkIdentity loadUserWorkIdentity(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT wp.user_company_id,
                       wp.user_id
                FROM user_work_profiles wp
                WHERE wp.company_id = ?
                  AND wp.user_company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new UserWorkIdentity(rs.getLong("user_company_id"), rs.getLong("user_id")),
            companyId,
            userCompanyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user not found.");
        }
        return rows.getFirst();
    }

    private ProfileDraft loadProfileDraft(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT date_of_birth,
                       address,
                       national_id,
                       tax_id,
                       social_security_number,
                       registration_country,
                       state_province,
                       city,
                       postal_code,
                       alternate_phone,
                       emergency_contact_name,
                       emergency_contact_relationship,
                       emergency_contact_phone,
                       workday_hours
                FROM user_work_profiles
                WHERE user_company_id = ? AND company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ProfileDraft(
                rs.getObject("date_of_birth", LocalDate.class),
                safe(rs.getString("address")),
                safe(rs.getString("national_id")),
                safe(rs.getString("tax_id")),
                safe(rs.getString("social_security_number")),
                safe(rs.getString("registration_country")),
                safe(rs.getString("state_province")),
                safe(rs.getString("city")),
                safe(rs.getString("postal_code")),
                safe(rs.getString("alternate_phone")),
                safe(rs.getString("emergency_contact_name")),
                safe(rs.getString("emergency_contact_relationship")),
                safe(rs.getString("emergency_contact_phone")),
                rs.getBigDecimal("workday_hours") == null ? new BigDecimal("8.00") : rs.getBigDecimal("workday_hours")
            ),
            userCompanyId,
            companyId
        );

        return rows.isEmpty() ? ProfileDraft.empty() : rows.getFirst();
    }

    private void validateOrganizationRefs(long companyId, Long unitId, Long businessId) {
        if (unitId != null) {
            var unitCount = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM units
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                    """,
                Integer.class,
                unitId,
                companyId
            );
            if (unitCount == null || unitCount == 0) {
                throw new IllegalArgumentException("Selected unit does not exist.");
            }
        }

        if (businessId != null) {
            var businessMatches = jdbcTemplate.query(
                """
                    SELECT id, unit_id
                    FROM businesses
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                    LIMIT 1
                    """,
                (rs, rowNum) -> new BusinessRef(rs.getLong("id"), getNullableLong(rs, "unit_id")),
                businessId,
                companyId
            );
            if (businessMatches.isEmpty()) {
                throw new IllegalArgumentException("Selected business does not exist.");
            }

            var business = businessMatches.getFirst();
            if (unitId != null && business.unitId() != null && !unitId.equals(business.unitId())) {
                throw new IllegalArgumentException("The selected business does not belong to the selected unit.");
            }
        }
    }

    private String resolveUserCodeForCreate(long companyId, String requestedUserCode) {
        var normalized = normalizeUserCode(requestedUserCode);
        if (!normalized.isBlank()) {
            ensureUniqueUserCode(companyId, normalized, null);
            synchronizeUserCodeSequence(companyId, normalized);
            return normalized;
        }
        return generateNextUserCode(companyId);
    }

    private String resolveUserCodeForUpdate(long companyId, long userCompanyId, String requestedUserCode) {
        var normalized = normalizeUserCode(requestedUserCode);
        if (!normalized.isBlank()) {
            ensureUniqueUserCode(companyId, normalized, userCompanyId);
            synchronizeUserCodeSequence(companyId, normalized);
            return normalized;
        }

        var currentUserCode = loadCurrentUserCode(companyId, userCompanyId);
        if (currentUserCode != null && !currentUserCode.isBlank()) {
            return currentUserCode;
        }

        return generateNextUserCode(companyId);
    }

    private void ensureUserCodeSequenceRow(long companyId) {
        jdbcTemplate.update(
            """
                INSERT INTO user_number_sequences (company_id, prefix, padding, next_number)
                SELECT ?, 'USR', 4,
                       COALESCE(MAX(
                         CASE
                           WHEN TRIM(COALESCE(user_code, '')) REGEXP '^USR-[0-9]+$'
                             THEN CAST(SUBSTRING(TRIM(user_code), 5) AS UNSIGNED)
                           ELSE 0
                         END
                       ), 0) + 1
                FROM user_work_profiles
                WHERE company_id = ?
                ON DUPLICATE KEY UPDATE
                  next_number = GREATEST(user_number_sequences.next_number, VALUES(next_number))
                """,
            companyId,
            companyId
        );
    }

    private UserCodeSequenceRow loadUserCodeSequence(long companyId) {
        ensureUserCodeSequenceRow(companyId);

        var rows = jdbcTemplate.query(
            """
                SELECT prefix, padding, next_number
                FROM user_number_sequences
                WHERE company_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new UserCodeSequenceRow(
                safe(rs.getString("prefix")),
                rs.getInt("padding"),
                rs.getLong("next_number")
            ),
            companyId
        );

        if (rows.isEmpty()) {
            throw new IllegalStateException("User code sequence could not be initialized.");
        }

        return rows.getFirst();
    }

    private String generateNextUserCode(long companyId) {
        while (true) {
            var sequence = loadUserCodeSequence(companyId);
            var candidate = formatUserCode(sequence.prefix(), sequence.padding(), sequence.nextNumber());

            jdbcTemplate.update(
                """
                    UPDATE user_number_sequences
                    SET next_number = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ?
                    """,
                sequence.nextNumber() + 1,
                companyId
            );

            if (!userCodeExists(companyId, candidate, null)) {
                return candidate;
            }
        }
    }

    private void synchronizeUserCodeSequence(long companyId, String userCode) {
        var normalized = normalizeUserCode(userCode);
        if (normalized.isBlank()) {
            return;
        }

        var sequence = loadUserCodeSequence(companyId);
        var expectedPrefix = normalizeUserCodePrefix(sequence.prefix()) + "-";
        var normalizedUpper = normalized.toUpperCase(Locale.ROOT);

        if (!normalizedUpper.startsWith(expectedPrefix)) {
            return;
        }

        var numericPart = normalizedUpper.substring(expectedPrefix.length());
        if (!numericPart.matches("\\d+")) {
            return;
        }

        long parsedValue;
        try {
            parsedValue = Long.parseLong(numericPart);
        } catch (NumberFormatException ex) {
            return;
        }

        var nextNumber = parsedValue + 1;
        if (nextNumber > sequence.nextNumber()) {
            jdbcTemplate.update(
                """
                    UPDATE user_number_sequences
                    SET next_number = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ?
                    """,
                nextNumber,
                companyId
            );
        }
    }

    private String formatUserCode(String prefix, int padding, long nextNumber) {
        var normalizedPrefix = normalizeUserCodePrefix(prefix);
        var effectivePadding = Math.max(padding, 4);
        var digits = String.format(Locale.ROOT, "%0" + effectivePadding + "d", nextNumber);
        return normalizedPrefix + "-" + digits;
    }

    private String normalizeUserCodePrefix(String prefix) {
        var normalizedPrefix = prefix == null ? "" : prefix.trim().toUpperCase(Locale.ROOT);
        while (normalizedPrefix.endsWith("-")) {
            normalizedPrefix = normalizedPrefix.substring(0, normalizedPrefix.length() - 1).trim();
        }
        return normalizedPrefix.isBlank() ? "EMP" : normalizedPrefix;
    }

    private boolean userCodeExists(long companyId, String userCode, Long excludedUserCompanyId) {
        if (userCode == null || userCode.isBlank()) {
            return false;
        }

        Integer count;
        if (excludedUserCompanyId == null) {
            count = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM user_work_profiles
                    WHERE company_id = ?
                      AND user_code = ?
                    """,
                Integer.class,
                companyId,
                userCode
            );
        } else {
            count = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM user_work_profiles
                    WHERE company_id = ?
                      AND user_code = ?
                      AND user_company_id <> ?
                    """,
                Integer.class,
                companyId,
                userCode,
                excludedUserCompanyId
            );
        }

        return count != null && count > 0;
    }

    private void ensureUniqueUserCode(long companyId, String userCode, Long excludedUserCompanyId) {
        if (userCodeExists(companyId, userCode, excludedUserCompanyId)) {
            throw new IllegalArgumentException("user_code must be unique.");
        }
    }

    private String loadCurrentUserCode(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(user_code, '') AS user_code
                FROM user_work_profiles
                WHERE company_id = ? AND user_company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> safe(rs.getString("user_code")),
            companyId,
            userCompanyId
        );

        return rows.isEmpty() ? "" : rows.getFirst();
    }

    private void requireHrUser(long companyId, long userCompanyId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_work_profiles WHERE company_id = ? AND user_company_id = ?",
            Integer.class,
            companyId,
            userCompanyId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("HR user not found.");
        }
    }

    private Map<String, Object> hrUserDetails(long userCompanyId, long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT e.id,
                       e.user_code AS user_code,
                       e.first_name,
                       e.last_name,
                       e.email,
                       e.phone,
                       e.position,
                       e.department,
                       e.unit_id,
                       u.name AS unit_name,
                       e.business_id,
                       b.name AS business_name,
                       e.hire_date,
                       COALESCE(e.salary, 0) AS salary,
                       e.pay_period,
                       e.salary_type,
                       e.hourly_rate,
                       e.contract_type,
                       e.contract_start_date,
                       e.contract_end_date,
                       e.termination_date,
                       e.last_working_day,
                       e.termination_reason_type,
                       e.termination_reason_code,
                       e.termination_summary,
                       e.user_id,
                       e.user_company_id,
                       e.work_profile_id,
                       COALESCE(e.status, 'active') AS status
                FROM hr_users e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.id = ? AND e.company_id = ?
                  AND e.work_profile_id IS NOT NULL
                LIMIT 1
                """,
            (rs, rowNum) -> mapHrUserRow(rs),
            userCompanyId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user not found.");
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("user_company_id", userCompanyId);
        result.put("user", rows.getFirst());
        result.put("user_id", rows.getFirst().get("user_id"));
        result.put("user_company_id", rows.getFirst().get("user_company_id"));
        result.put("work_profile_id", rows.getFirst().get("work_profile_id"));
        result.put("profile", loadHrUserProfile(companyId, userCompanyId));
        result.put("documents", loadHrUserDocuments(companyId, userCompanyId));
        return result;
    }

    private Map<String, Object> loadHrUserProfile(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT date_of_birth,
                       address,
                       national_id,
                       tax_id,
                       social_security_number,
                       registration_country,
                       state_province,
                       city,
                       postal_code,
                       alternate_phone,
                       emergency_contact_name,
                       emergency_contact_relationship,
                       emergency_contact_phone,
                       workday_hours
                FROM user_work_profiles
                WHERE user_company_id = ? AND company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var profile = new LinkedHashMap<String, Object>();
                profile.put("date_of_birth", rs.getObject("date_of_birth"));
                profile.put("address", safe(rs.getString("address")));
                profile.put("national_id", safe(rs.getString("national_id")));
                profile.put("tax_id", safe(rs.getString("tax_id")));
                profile.put("social_security_number", safe(rs.getString("social_security_number")));
                profile.put("registration_country", safe(rs.getString("registration_country")));
                profile.put("state_province", safe(rs.getString("state_province")));
                profile.put("city", safe(rs.getString("city")));
                profile.put("postal_code", safe(rs.getString("postal_code")));
                profile.put("alternate_phone", safe(rs.getString("alternate_phone")));
                profile.put("emergency_contact_name", safe(rs.getString("emergency_contact_name")));
                profile.put("emergency_contact_relationship", safe(rs.getString("emergency_contact_relationship")));
                profile.put("emergency_contact_phone", safe(rs.getString("emergency_contact_phone")));
                profile.put("workday_hours", rs.getBigDecimal("workday_hours") == null ? new BigDecimal("8.00") : rs.getBigDecimal("workday_hours"));
                return profile;
            },
            userCompanyId,
            companyId
        );

        if (!rows.isEmpty()) {
            return rows.getFirst();
        }

        var emptyProfile = new LinkedHashMap<String, Object>();
        emptyProfile.put("date_of_birth", null);
        emptyProfile.put("address", "");
        emptyProfile.put("national_id", "");
        emptyProfile.put("tax_id", "");
        emptyProfile.put("social_security_number", "");
        emptyProfile.put("registration_country", "");
        emptyProfile.put("state_province", "");
        emptyProfile.put("city", "");
        emptyProfile.put("postal_code", "");
        emptyProfile.put("alternate_phone", "");
        emptyProfile.put("emergency_contact_name", "");
        emptyProfile.put("emergency_contact_relationship", "");
        emptyProfile.put("emergency_contact_phone", "");
        emptyProfile.put("workday_hours", new BigDecimal("8.00"));
        return emptyProfile;
    }

    private List<Map<String, Object>> loadHrUserDocuments(long companyId, long userCompanyId) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       document_type,
                       original_filename,
                       mime_type,
                       size_bytes,
                       object_key,
                       status,
                       created_at,
                       updated_at
                FROM user_documents
                WHERE company_id = ? AND user_company_id = ?
                ORDER BY FIELD(document_type, 'birth_certificate', 'government_id', 'proof_of_address', 'resume', 'profile_photo'), id ASC
                """,
            (rs, rowNum) -> mapDocumentRow(rs),
            companyId,
            userCompanyId
        );
    }

    private Map<String, Object> loadHrUserDocument(long companyId, long userCompanyId, String documentType) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       document_type,
                       original_filename,
                       mime_type,
                       size_bytes,
                       object_key,
                       status,
                       created_at,
                       updated_at
                FROM user_documents
                WHERE company_id = ? AND user_company_id = ? AND document_type = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapDocumentRow(rs),
            companyId,
            userCompanyId,
            documentType
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user document not found.");
        }

        return rows.getFirst();
    }

    private Map<String, Object> mapHrUserRow(ResultSet rs) throws SQLException {
        var fullName = String.join(
            " ",
            safe(rs.getString("first_name")),
            safe(rs.getString("last_name"))
        ).trim();

        var hrUser = new LinkedHashMap<String, Object>();
        hrUser.put("id", rs.getLong("id"));
        hrUser.put("legacy_user_company_id", rs.getLong("id"));
        hrUser.put("user_id", getNullableLong(rs, "user_id"));
        hrUser.put("user_company_id", getNullableLong(rs, "user_company_id"));
        hrUser.put("work_profile_id", getNullableLong(rs, "work_profile_id"));
        hrUser.put("user_code", safe(rs.getString("user_code")));
        hrUser.put("first_name", safe(rs.getString("first_name")));
        hrUser.put("last_name", safe(rs.getString("last_name")));
        hrUser.put("full_name", fullName);
        hrUser.put("email", safe(rs.getString("email")));
        hrUser.put("phone", safe(rs.getString("phone")));
        hrUser.put("position", safe(rs.getString("position")));
        hrUser.put("position_title", safe(rs.getString("position")));
        hrUser.put("department", safe(rs.getString("department")));
        hrUser.put("unit_id", getNullableLong(rs, "unit_id"));
        hrUser.put("unit_name", safe(rs.getString("unit_name")));
        hrUser.put("business_id", getNullableLong(rs, "business_id"));
        hrUser.put("business_name", safe(rs.getString("business_name")));
        hrUser.put("hire_date", rs.getObject("hire_date"));
        hrUser.put("salary", rs.getBigDecimal("salary"));
        hrUser.put("pay_period", normalizePayPeriod(rs.getString("pay_period")));
        hrUser.put("salary_type", normalizeSalaryType(rs.getString("salary_type")));
        hrUser.put("hourly_rate", rs.getBigDecimal("hourly_rate"));
        hrUser.put("contract_type", normalizeContractType(rs.getString("contract_type")));
        hrUser.put("contract_start_date", rs.getObject("contract_start_date"));
        hrUser.put("contract_end_date", rs.getObject("contract_end_date"));
        hrUser.put("termination_date", rs.getObject("termination_date"));
        hrUser.put("last_working_day", rs.getObject("last_working_day"));
        hrUser.put("termination_reason_type", safe(rs.getString("termination_reason_type")));
        hrUser.put("termination_reason_code", safe(rs.getString("termination_reason_code")));
        hrUser.put("termination_summary", safe(rs.getString("termination_summary")));
        hrUser.put("status", normalizeHrUserStatus(rs.getString("status")));
        return hrUser;
    }

    private Map<String, Object> mapDocumentRow(ResultSet rs) throws SQLException {
        var document = new LinkedHashMap<String, Object>();
        document.put("id", rs.getLong("id"));
        document.put("document_type", normalizeDocumentType(rs.getString("document_type")));
        document.put("original_filename", safe(rs.getString("original_filename")));
        document.put("mime_type", safe(rs.getString("mime_type")));
        document.put("size_bytes", rs.getLong("size_bytes"));
        document.put("object_key", safe(rs.getString("object_key")));
        document.put("status", safe(rs.getString("status")));
        document.put("download_url", signedDocumentUrl(safe(rs.getString("object_key"))));
        document.put("created_at", rs.getTimestamp("created_at"));
        document.put("updated_at", rs.getTimestamp("updated_at"));
        return document;
    }

    private String signedDocumentUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }

        return objectStorageService.presignDownload(
            documentsBucket(),
            objectKey,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );
    }

    private void deleteUserDocumentObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }

        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Deleting the HR user profile should not fail because the document object is already missing.
        }
    }

    private Map<String, Object> mergedSectionPayload(Map<String, Object> payload, String sectionKey) {
        var merged = new LinkedHashMap<String, Object>();
        if (payload != null) {
            merged.putAll(payload);
            var sectionValue = payload.get(sectionKey);
            if (sectionValue instanceof Map<?, ?> sectionMap) {
                for (var entry : sectionMap.entrySet()) {
                    if (entry.getKey() != null) {
                        merged.put(String.valueOf(entry.getKey()), entry.getValue());
                    }
                }
            }
        }
        return merged;
    }

    private boolean hasAnyKey(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    private String resolveTextField(Map<String, Object> payload, String existingValue, String... keys) {
        if (hasAnyKey(payload, keys)) {
            return nullable(stringValue(payload, keys));
        }
        return nullable(existingValue);
    }

    private BigDecimal resolveWorkdayHours(Map<String, Object> payload, BigDecimal existingValue) {
        if (!hasAnyKey(payload, "workday_hours", "workdayHours", "horasJornada")) {
            return existingValue == null ? new BigDecimal("8.00") : existingValue;
        }

        var parsed = parseBigDecimal(payload, "workday_hours", "workdayHours", "horasJornada");
        if (parsed == null) {
            return new BigDecimal("8.00");
        }
        if (parsed.compareTo(BigDecimal.ONE) < 0 || parsed.compareTo(new BigDecimal("24")) > 0) {
            throw new IllegalArgumentException("workday_hours must be between 1 and 24.");
        }
        return parsed;
    }

    private Long normalizeOptionalForeignKey(Long value) {
        return value == null || value <= 0 ? null : value;
    }

    private String normalizePayPeriod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "weekly", "semanal" -> "weekly";
            case "biweekly", "quincenal" -> "biweekly";
            case "monthly", "mensual" -> "monthly";
            default -> throw new IllegalArgumentException("Unsupported pay_period.");
        };
    }

    private String normalizeSalaryType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "daily", "diario" -> "daily";
            case "hourly", "por_hora", "hourly_salary" -> "hourly";
            default -> throw new IllegalArgumentException("Unsupported salary_type.");
        };
    }

    private String normalizeContractType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "permanent", "permanente" -> "permanent";
            case "temporary", "temporal" -> "temporary";
            default -> throw new IllegalArgumentException("Unsupported contract_type.");
        };
    }

    private String normalizeHrUserStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "active", "activo" -> "active";
            case "inactive", "inactivo" -> "inactive";
            case "terminated", "terminado" -> "terminated";
            default -> throw new IllegalArgumentException("Unsupported HR user status.");
        };
    }

    private String normalizeUserRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() > 20 || !normalized.matches("[a-z0-9_-]+")) {
            throw new IllegalArgumentException("role must be 20 characters or fewer and use letters, numbers, underscores, or dashes.");
        }
        return normalized;
    }

    private String userCompanyStatusForWorkStatus(String workStatus) {
        return "active".equals(normalizeHrUserStatus(workStatus)) ? "active" : "inactive";
    }

    private String normalizeTerminationReasonType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "resignation", "termination_for_cause", "contract_end", "mutual_agreement", "other" -> normalized;
            default -> throw new IllegalArgumentException("Unsupported reason_type.");
        };
    }

    private String normalizeDocumentType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "birth_certificate", "birthcertificate", "acta_nacimiento", "actanacimiento" -> "birth_certificate";
            case "government_id", "governmentid", "identificacion", "identification" -> "government_id";
            case "proof_of_address", "proofofaddress", "comprobante_domicilio", "comprobantedomicilio" -> "proof_of_address";
            case "resume", "cv" -> "resume";
            case "profile_photo", "profilephoto", "foto_perfil", "fotoperfil" -> "profile_photo";
            default -> throw new IllegalArgumentException("Unsupported document_type.");
        };
    }

    private String normalizeDocumentContentType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "application/pdf" -> "application/pdf";
            case "image/jpeg", "image/jpg" -> "image/jpeg";
            case "image/png" -> "image/png";
            case "image/webp" -> "image/webp";
            default -> throw new IllegalArgumentException("content_type must be application/pdf, image/jpeg, image/png, or image/webp.");
        };
    }

    private String normalizeDocumentObjectKey(long companyId, long userCompanyId, String documentType, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("object_key is required.");
        }

        var normalizedKey = objectKey.trim();
        var expectedPrefix = "hr/users/" + companyId + "/" + userCompanyId + "/documents/" + documentType + "/";
        if (!normalizedKey.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("object_key must match the expected user document upload prefix.");
        }
        return normalizedKey;
    }

    private String buildHrUserDocumentObjectKey(
        long companyId,
        long userCompanyId,
        String documentType,
        String originalFileName,
        String contentType
    ) {
        return "hr/users/"
            + companyId + "/"
            + userCompanyId + "/documents/"
            + documentType + "/"
            + UUID.randomUUID()
            + "-"
            + sanitizeFileNameStem(originalFileName)
            + extensionForDocumentContentType(contentType);
    }

    private String extensionForDocumentContentType(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String normalizeOriginalFileName(String value) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("file_name is required.");
        }
        return normalized.length() > 255 ? normalized.substring(0, 255) : normalized;
    }

    private String sanitizeFileNameStem(String originalFileName) {
        var dotIndex = originalFileName.lastIndexOf('.');
        var stem = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        var normalized = Normalizer.normalize(stem, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z0-9_-]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "")
            .toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "document";
        }
        var bytes = normalized.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= 60) {
            return normalized;
        }
        return new String(bytes, 0, 60, StandardCharsets.UTF_8).replaceAll("-+$", "");
    }

    private String normalizeCountryCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        var normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z]", "")
            .toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "AR", "ARGENTINA" -> "AR";
            case "BR", "BRAZIL", "BRASIL" -> "BR";
            case "CA", "CANADA" -> "CA";
            case "CL", "CHILE" -> "CL";
            case "CO", "COLOMBIA" -> "CO";
            case "ES", "SPAIN", "ESPANA" -> "ES";
            case "MX", "MEXICO" -> "MX";
            case "PE", "PERU" -> "PE";
            case "US", "UNITEDSTATES", "ESTADOSUNIDOS" -> "US";
            default -> throw new IllegalArgumentException("Unsupported registration_country.");
        };
    }

    private String normalizeEmail(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "";
        }
        if (!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("email must be a valid email address.");
        }
        return normalized;
    }

    private String normalizeUserCode(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        var normalized = value.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() > 50) {
            throw new IllegalArgumentException("user_code must be 50 characters or fewer.");
        }
        return normalized;
    }

    private String normalizePhoneValue(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        var normalized = value.trim();
        if (!normalized.matches("^[\\d\\s()+-]+$")) {
            throw new IllegalArgumentException("Phone numbers may only contain digits and standard separators.");
        }
        return normalized;
    }

    private String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Long nullableCreatedBy(Long createdBy) {
        return createdBy == null || createdBy <= 0 ? null : createdBy;
    }

    private void setNullableLong(java.sql.PreparedStatement statement, int parameterIndex, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(parameterIndex, Types.BIGINT);
        } else {
            statement.setLong(parameterIndex, value);
        }
    }

    private record HrUserDraft(
        String userCode,
        String firstName,
        String lastName,
        String email,
        String phone,
        String position,
        String department,
        Long unitId,
        Long businessId,
        LocalDate hireDate,
        BigDecimal salary,
        String payPeriod,
        String salaryType,
        BigDecimal hourlyRate,
        String contractType,
        LocalDate contractStartDate,
        LocalDate contractEndDate,
        String status
    ) {
        private String fullName() {
            return String.join(" ", firstName, lastName).trim();
        }

        private HrUserDraft withUserCode(String nextUserCode) {
            return new HrUserDraft(
                nextUserCode,
                firstName,
                lastName,
                email,
                phone,
                position,
                department,
                unitId,
                businessId,
                hireDate,
                salary,
                payPeriod,
                salaryType,
                hourlyRate,
                contractType,
                contractStartDate,
                contractEndDate,
                status
            );
        }
    }

    private record ProfileDraft(
        LocalDate dateOfBirth,
        String address,
        String nationalId,
        String taxId,
        String socialSecurityNumber,
        String registrationCountry,
        String stateProvince,
        String city,
        String postalCode,
        String alternatePhone,
        String emergencyContactName,
        String emergencyContactRelationship,
        String emergencyContactPhone,
        BigDecimal workdayHours
    ) {
        static ProfileDraft empty() {
            return new ProfileDraft(
                null,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                new BigDecimal("8.00")
            );
        }

        private String dateOfBirthRaw() {
            return dateOfBirth == null ? null : dateOfBirth.toString();
        }
    }

    private record BusinessRef(
        long id,
        Long unitId
    ) {
    }

    private record HrUserDocumentRef(
        long id,
        String objectKey
    ) {
    }

    private record UserWorkIdentity(
        long userCompanyId,
        long userId
    ) {
    }

    private record UserCodeSequenceRow(
        String prefix,
        int padding,
        long nextNumber
    ) {
    }
}
