package com.indice.erp.hr;

import static com.indice.erp.hr.HrPayloadUtils.nullable;
import static com.indice.erp.hr.HrPayloadUtils.parseBigDecimal;
import static com.indice.erp.hr.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.HrPayloadUtils.safe;
import static com.indice.erp.hr.HrPayloadUtils.stringValue;

import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrEmployeeService {

    private static final long MAX_DOCUMENT_SIZE_BYTES = 5L * 1024L * 1024L;

    private final JdbcTemplate jdbcTemplate;
    private final HrAttendanceService hrAttendanceService;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;

    public HrEmployeeService(
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

    public Map<String, Object> listEmployees(long companyId) {
        var employees = jdbcTemplate.query(
            """
                SELECT e.id,
                       e.employee_number,
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
                       COALESCE(e.status, 'active') AS status
                FROM hr_employees e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                ORDER BY e.id DESC
                """,
            (rs, rowNum) -> mapEmployeeRow(rs),
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
                FROM hr_employees
                WHERE company_id = ?
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
        result.put("rows", employees);
        result.put("meta", summary != null ? summary : Map.of());
        return result;
    }

    public Map<String, Object> getEmployeeDetails(long companyId, long employeeId) {
        requireEmployee(companyId, employeeId);
        return employeeDetails(employeeId, companyId);
    }

    @Transactional
    public Map<String, Object> createEmployee(long companyId, long createdBy, Map<String, Object> payload) {
        var employeePayload = mergedSectionPayload(payload, "employee");
        var profilePayload = mergedSectionPayload(payload, "profile");
        var accessPayload = mergedSectionPayload(payload, "access");

        var draft = buildEmployeeDraft(companyId, employeePayload);
        draft = draft.withEmployeeNumber(resolveEmployeeNumberForCreate(companyId, draft.employeeNumber()));
        var employeeDraft = draft;
        var profileDraft = buildProfileDraft(profilePayload, ProfileDraft.empty());
        var accessDraft = buildPortalAccessDraft(accessPayload, PortalAccessDraft.defaults());

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_employees
                    (company_id, employee_number, first_name, last_name, email, phone, position, department, unit_id, business_id, hire_date, salary, pay_period, salary_type, hourly_rate, contract_type, contract_start_date, contract_end_date, status, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setString(2, nullable(employeeDraft.employeeNumber()));
            statement.setString(3, employeeDraft.firstName());
            statement.setString(4, employeeDraft.lastName());
            statement.setString(5, employeeDraft.email());
            statement.setString(6, nullable(employeeDraft.phone()));
            statement.setString(7, nullable(employeeDraft.position()));
            statement.setString(8, nullable(employeeDraft.department()));
            setNullableLong(statement, 9, employeeDraft.unitId());
            setNullableLong(statement, 10, employeeDraft.businessId());
            if (employeeDraft.hireDate() == null) {
                statement.setNull(11, Types.DATE);
            } else {
                statement.setObject(11, employeeDraft.hireDate());
            }
            if (employeeDraft.salary() == null) {
                statement.setNull(12, Types.DECIMAL);
            } else {
                statement.setBigDecimal(12, employeeDraft.salary());
            }
            statement.setString(13, employeeDraft.payPeriod());
            statement.setString(14, employeeDraft.salaryType());
            if (employeeDraft.hourlyRate() == null) {
                statement.setNull(15, Types.DECIMAL);
            } else {
                statement.setBigDecimal(15, employeeDraft.hourlyRate());
            }
            statement.setString(16, employeeDraft.contractType());
            if (employeeDraft.contractStartDate() == null) {
                statement.setNull(17, Types.DATE);
            } else {
                statement.setObject(17, employeeDraft.contractStartDate());
            }
            if (employeeDraft.contractEndDate() == null) {
                statement.setNull(18, Types.DATE);
            } else {
                statement.setObject(18, employeeDraft.contractEndDate());
            }
            statement.setString(19, employeeDraft.status());
            statement.setLong(20, createdBy);
            return statement;
        }, keyHolder);

        var employeeId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
        upsertEmployeeProfile(companyId, employeeId, profileDraft);
        syncPortalAccess(companyId, createdBy, employeeId, draft.email(), draft.fullName(), accessDraft);
        hrAttendanceService.ensureDefaultScheduleAssignment(companyId, employeeId, createdBy);
        hrAttendanceService.ensureDefaultAccessProfile(companyId, employeeId, createdBy);
        return employeeDetails(employeeId, companyId);
    }

    @Transactional
    public Map<String, Object> updateEmployee(long companyId, Map<String, Object> payload) {
        var employeeId = parseLong(payload, "id", "employee_id");
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("id is required.");
        }

        requireEmployee(companyId, employeeId);

        var employeePayload = mergedSectionPayload(payload, "employee");
        var profilePayload = mergedSectionPayload(payload, "profile");
        var accessPayload = mergedSectionPayload(payload, "access");

        var draft = buildEmployeeDraft(companyId, employeePayload);
        draft = draft.withEmployeeNumber(resolveEmployeeNumberForUpdate(companyId, employeeId, draft.employeeNumber()));
        var currentProfile = loadProfileDraft(companyId, employeeId);
        var currentAccess = loadPortalAccessDraft(companyId, employeeId);
        var profileDraft = buildProfileDraft(profilePayload, currentProfile);
        var accessDraft = buildPortalAccessDraft(accessPayload, currentAccess);

        var rowsUpdated = jdbcTemplate.update(
            """
                UPDATE hr_employees
                SET employee_number = ?,
                    first_name = ?,
                    last_name = ?,
                    email = ?,
                    phone = ?,
                    position = ?,
                    department = ?,
                    unit_id = ?,
                    business_id = ?,
                    hire_date = ?,
                    salary = ?,
                    pay_period = ?,
                    salary_type = ?,
                    hourly_rate = ?,
                    contract_type = ?,
                    contract_start_date = ?,
                    contract_end_date = ?,
                    status = ?
                WHERE id = ? AND company_id = ?
                """,
            nullable(draft.employeeNumber()),
            draft.firstName(),
            draft.lastName(),
            draft.email(),
            nullable(draft.phone()),
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
            draft.status(),
            employeeId,
            companyId
        );

        if (rowsUpdated == 0) {
            throw new NoSuchElementException("Employee not found.");
        }

        upsertEmployeeProfile(companyId, employeeId, profileDraft);
        syncPortalAccess(companyId, 0L, employeeId, draft.email(), draft.fullName(), accessDraft);
        hrAttendanceService.ensureDefaultScheduleAssignment(companyId, employeeId, 0L);
        return employeeDetails(employeeId, companyId);
    }

    @Transactional
    public void deleteEmployee(long companyId, long employeeId) {
        requireEmployee(companyId, employeeId);

        var documentObjectKeys = jdbcTemplate.query(
            """
                SELECT object_key
                FROM hr_employee_documents
                WHERE company_id = ? AND employee_id = ?
                """,
            (rs, rowNum) -> safe(rs.getString("object_key")),
            companyId,
            employeeId
        );

        var rowsUpdated = jdbcTemplate.update(
            "DELETE FROM hr_employees WHERE id = ? AND company_id = ?",
            employeeId,
            companyId
        );
        if (rowsUpdated == 0) {
            throw new NoSuchElementException("Employee not found.");
        }

        if (objectStorageService.isEnabled()) {
            documentObjectKeys.stream()
                .filter(key -> key != null && !key.isBlank())
                .forEach(this::deleteEmployeeDocumentObjectQuietly);
        }
    }

    @Transactional
    public Map<String, Object> terminateEmployee(long companyId, long employeeId, Map<String, Object> payload) {
        requireEmployee(companyId, employeeId);

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
                UPDATE hr_employees
                SET status = 'terminated',
                    termination_date = ?,
                    last_working_day = ?,
                    termination_reason_type = ?,
                    termination_reason_code = ?,
                    termination_summary = ?
                WHERE id = ? AND company_id = ?
                """,
            exitDate,
            lastWorkingDay,
            reasonType,
            reasonCode,
            summary,
            employeeId,
            companyId
        );

        if (rowsUpdated == 0) {
            throw new NoSuchElementException("Employee not found.");
        }

        return employeeDetails(employeeId, companyId);
    }

    public Map<String, Object> createDocumentUpload(long companyId, long employeeId, Map<String, Object> payload) {
        requireEmployee(companyId, employeeId);

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

        var objectKey = buildEmployeeDocumentObjectKey(companyId, employeeId, documentType, originalFileName, contentType);
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
    public Map<String, Object> registerEmployeeDocument(
        long companyId,
        long uploadedByUserId,
        long employeeId,
        Map<String, Object> payload
    ) {
        requireEmployee(companyId, employeeId);

        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var documentType = normalizeDocumentType(stringValue(payload, "document_type", "documentType"));
        var objectKey = normalizeDocumentObjectKey(companyId, employeeId, documentType, stringValue(payload, "object_key", "objectKey"));
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
                FROM hr_employee_documents
                WHERE company_id = ? AND employee_id = ? AND document_type = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new EmployeeDocumentRef(rs.getLong("id"), safe(rs.getString("object_key"))),
            companyId,
            employeeId,
            documentType
        );

        if (!existingRows.isEmpty()) {
            var existing = existingRows.getFirst();
            if (!existing.objectKey().equals(objectKey)) {
                deleteEmployeeDocumentObjectQuietly(existing.objectKey());
            }
        }

        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_documents
                (company_id, employee_id, document_type, original_filename, mime_type, size_bytes, object_key, status, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
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
            employeeId,
            documentType,
            originalFileName,
            mimeType,
            sizeBytes,
            objectKey,
            uploadedByUserId
        );

        return loadEmployeeDocument(companyId, employeeId, documentType);
    }

    @Transactional
    public void deleteEmployeeDocument(long companyId, long employeeId, long documentId) {
        requireEmployee(companyId, employeeId);

        var rows = jdbcTemplate.query(
            """
                SELECT object_key
                FROM hr_employee_documents
                WHERE id = ? AND company_id = ? AND employee_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> safe(rs.getString("object_key")),
            documentId,
            companyId,
            employeeId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Employee document not found.");
        }

        jdbcTemplate.update(
            "DELETE FROM hr_employee_documents WHERE id = ? AND company_id = ? AND employee_id = ?",
            documentId,
            companyId,
            employeeId
        );

        deleteEmployeeDocumentObjectQuietly(rows.getFirst());
    }

    private EmployeeDraft buildEmployeeDraft(long companyId, Map<String, Object> payload) {
        var firstName = stringValue(payload, "first_name", "firstName", "nombre");
        var lastName = stringValue(payload, "last_name", "lastName", "apellidos");
        var email = normalizeEmail(stringValue(payload, "email", "correo"));
        if (firstName.isBlank() || lastName.isBlank() || email.isBlank()) {
            throw new IllegalArgumentException("first_name, last_name, and email are required.");
        }

        var employeeNumber = normalizeEmployeeNumber(
            stringValue(payload, "employee_number", "employeeNumber", "employee_code")
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
        var status = normalizeEmployeeStatus(stringValue(payload, "status", "estado"));

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
                throw new IllegalArgumentException("salary is required for daily employees.");
            }
            if (salary.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("salary must be greater than zero for daily employees.");
            }
        }

        if ("hourly".equals(salaryType)) {
            if (hourlyRate == null) {
                throw new IllegalArgumentException("hourly_rate is required for hourly employees.");
            }
            if (hourlyRate.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("hourly_rate must be greater than zero for hourly employees.");
            }
            salary = salary == null ? BigDecimal.ZERO : salary;
        }

        if (contractStartDate == null && hireDate != null) {
            contractStartDate = hireDate;
        }

        return new EmployeeDraft(
            employeeNumber,
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
            normalizePhoneValue(resolveTextField(payload, existingProfile.alternatePhone(), "alternate_phone", "alternatePhone", "telefonoAlterno")),
            resolveTextField(payload, existingProfile.emergencyContactName(), "emergency_contact_name", "emergencyContactName", "nombreContactoEmergencia"),
            resolveTextField(payload, existingProfile.emergencyContactRelationship(), "emergency_contact_relationship", "emergencyContactRelationship", "relacionContacto"),
            normalizePhoneValue(resolveTextField(payload, existingProfile.emergencyContactPhone(), "emergency_contact_phone", "emergencyContactPhone", "telefonoEmergencia")),
            resolveWorkdayHours(payload, existingProfile.workdayHours())
        );
    }

    private PortalAccessDraft buildPortalAccessDraft(Map<String, Object> payload, PortalAccessDraft existingAccess) {
        return new PortalAccessDraft(
            hasAnyKey(payload, "access_role", "accessRole", "role", "rol")
                ? normalizeAccessRole(stringValue(payload, "access_role", "accessRole", "role", "rol"))
                : existingAccess.accessRole(),
            parseBoolean(payload, existingAccess.inviteOnSave(), "invite_on_save", "inviteOnSave", "send_invitation", "sendInvitation")
        );
    }

    private void upsertEmployeeProfile(long companyId, long employeeId, ProfileDraft draft) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_profiles
                (employee_id, company_id, date_of_birth, address, national_id, tax_id, social_security_number, registration_country, state_province, alternate_phone, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, workday_hours)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  company_id = VALUES(company_id),
                  date_of_birth = VALUES(date_of_birth),
                  address = VALUES(address),
                  national_id = VALUES(national_id),
                  tax_id = VALUES(tax_id),
                  social_security_number = VALUES(social_security_number),
                  registration_country = VALUES(registration_country),
                  state_province = VALUES(state_province),
                  alternate_phone = VALUES(alternate_phone),
                  emergency_contact_name = VALUES(emergency_contact_name),
                  emergency_contact_relationship = VALUES(emergency_contact_relationship),
                  emergency_contact_phone = VALUES(emergency_contact_phone),
                  workday_hours = VALUES(workday_hours),
                  updated_at = CURRENT_TIMESTAMP
                """,
            employeeId,
            companyId,
            draft.dateOfBirth(),
            nullable(draft.address()),
            nullable(draft.nationalId()),
            nullable(draft.taxId()),
            nullable(draft.socialSecurityNumber()),
            nullable(draft.registrationCountry()),
            nullable(draft.stateProvince()),
            nullable(draft.alternatePhone()),
            nullable(draft.emergencyContactName()),
            nullable(draft.emergencyContactRelationship()),
            nullable(draft.emergencyContactPhone()),
            draft.workdayHours()
        );
    }

    private void syncPortalAccess(
        long companyId,
        long actingUserId,
        long employeeId,
        String employeeEmail,
        String employeeFullName,
        PortalAccessDraft draft
    ) {
        var linkedUserId = findLinkedUserId(companyId, employeeEmail);
        Long invitationId = null;
        String invitationStatus = linkedUserId != null ? "linked" : "not_invited";
        LocalDateTime lastInvitedAt = null;

        if (linkedUserId == null) {
            var pendingInvitation = findPendingInvitation(companyId, employeeEmail);
            if (pendingInvitation != null) {
                invitationId = pendingInvitation.id();
                invitationStatus = "pending";
                lastInvitedAt = pendingInvitation.lastInvitedAt();
            }

            if (draft.inviteOnSave()) {
                var invitation = upsertPendingInvitation(companyId, actingUserId, employeeEmail, employeeFullName, draft.accessRole());
                invitationId = invitation.id();
                invitationStatus = "pending";
                lastInvitedAt = invitation.lastInvitedAt();
            }
        }

        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_portal_access
                (employee_id, company_id, access_role, linked_user_id, invitation_id, invitation_status, last_invited_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  company_id = VALUES(company_id),
                  access_role = VALUES(access_role),
                  linked_user_id = VALUES(linked_user_id),
                  invitation_id = VALUES(invitation_id),
                  invitation_status = VALUES(invitation_status),
                  last_invited_at = VALUES(last_invited_at),
                  updated_at = CURRENT_TIMESTAMP
                """,
            employeeId,
            companyId,
            draft.accessRole(),
            linkedUserId,
            invitationId,
            invitationStatus,
            lastInvitedAt,
            actingUserId > 0 ? actingUserId : null
        );
    }

    private ProfileDraft loadProfileDraft(long companyId, long employeeId) {
        var rows = jdbcTemplate.query(
            """
                SELECT date_of_birth,
                       address,
                       national_id,
                       tax_id,
                       social_security_number,
                       registration_country,
                       state_province,
                       alternate_phone,
                       emergency_contact_name,
                       emergency_contact_relationship,
                       emergency_contact_phone,
                       workday_hours
                FROM hr_employee_profiles
                WHERE employee_id = ? AND company_id = ?
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
                safe(rs.getString("alternate_phone")),
                safe(rs.getString("emergency_contact_name")),
                safe(rs.getString("emergency_contact_relationship")),
                safe(rs.getString("emergency_contact_phone")),
                rs.getBigDecimal("workday_hours") == null ? new BigDecimal("8.00") : rs.getBigDecimal("workday_hours")
            ),
            employeeId,
            companyId
        );

        return rows.isEmpty() ? ProfileDraft.empty() : rows.getFirst();
    }

    private PortalAccessDraft loadPortalAccessDraft(long companyId, long employeeId) {
        var rows = jdbcTemplate.query(
            """
                SELECT access_role
                FROM hr_employee_portal_access
                WHERE employee_id = ? AND company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PortalAccessDraft(normalizeAccessRole(rs.getString("access_role")), false),
            employeeId,
            companyId
        );

        return rows.isEmpty() ? PortalAccessDraft.defaults() : rows.getFirst();
    }

    private Long findLinkedUserId(long companyId, String email) {
        if (email == null || email.isBlank()) {
            return null;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT uc.user_id
                FROM users u
                INNER JOIN user_companies uc ON uc.user_id = u.id
                WHERE uc.company_id = ?
                  AND LOWER(u.email) = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("user_id"),
            companyId,
            email.toLowerCase(Locale.ROOT)
        );

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private PendingInvitationRef findPendingInvitation(long companyId, String email) {
        if (email == null || email.isBlank()) {
            return null;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT id, updated_at, created_at
                FROM user_invitations
                WHERE company_id = ?
                  AND LOWER(email) = ?
                  AND COALESCE(status, 'pending') = 'pending'
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new PendingInvitationRef(
                rs.getLong("id"),
                timestampToLocalDateTime(rs.getTimestamp("updated_at"), rs.getTimestamp("created_at"))
            ),
            companyId,
            email.toLowerCase(Locale.ROOT)
        );

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private PendingInvitationRef upsertPendingInvitation(
        long companyId,
        long invitedByUserId,
        String email,
        String fullName,
        String accessRole
    ) {
        var existingInvitation = findPendingInvitation(companyId, email);
        var token = UUID.randomUUID().toString().replace("-", "");
        var expiresAt = LocalDateTime.now().plusDays(7);
        var lastInvitedAt = LocalDateTime.now();

        if (existingInvitation != null) {
            jdbcTemplate.update(
                """
                    UPDATE user_invitations
                    SET full_name = ?,
                        role = ?,
                        module_slugs_json = ?,
                        token = ?,
                        invited_by = ?,
                        expires_at = ?,
                        status = 'pending'
                    WHERE id = ? AND company_id = ?
                    """,
                fullName,
                normalizeInvitationRole(accessRole),
                "[\"human_resources\"]",
                token,
                invitedByUserId > 0 ? invitedByUserId : null,
                Timestamp.valueOf(expiresAt),
                existingInvitation.id(),
                companyId
            );
            return new PendingInvitationRef(existingInvitation.id(), lastInvitedAt);
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_invitations
                    (company_id, email, full_name, role, module_slugs_json, token, status, invited_by, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setString(2, email);
            statement.setString(3, fullName);
            statement.setString(4, normalizeInvitationRole(accessRole));
            statement.setString(5, "[\"human_resources\"]");
            statement.setString(6, token);
            if (invitedByUserId > 0) {
                statement.setLong(7, invitedByUserId);
            } else {
                statement.setNull(7, Types.BIGINT);
            }
            statement.setTimestamp(8, Timestamp.valueOf(expiresAt));
            return statement;
        }, keyHolder);

        var invitationId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return new PendingInvitationRef(invitationId, lastInvitedAt);
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

    private String resolveEmployeeNumberForCreate(long companyId, String requestedEmployeeNumber) {
        var normalized = normalizeEmployeeNumber(requestedEmployeeNumber);
        if (!normalized.isBlank()) {
            ensureUniqueEmployeeNumber(companyId, normalized, null);
            synchronizeEmployeeNumberSequence(companyId, normalized);
            return normalized;
        }
        return generateNextEmployeeNumber(companyId);
    }

    private String resolveEmployeeNumberForUpdate(long companyId, long employeeId, String requestedEmployeeNumber) {
        var normalized = normalizeEmployeeNumber(requestedEmployeeNumber);
        if (!normalized.isBlank()) {
            ensureUniqueEmployeeNumber(companyId, normalized, employeeId);
            synchronizeEmployeeNumberSequence(companyId, normalized);
            return normalized;
        }

        var currentEmployeeNumber = loadCurrentEmployeeNumber(companyId, employeeId);
        if (currentEmployeeNumber != null && !currentEmployeeNumber.isBlank()) {
            return currentEmployeeNumber;
        }

        return generateNextEmployeeNumber(companyId);
    }

    private void ensureEmployeeNumberSequenceRow(long companyId) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_number_sequences (company_id, prefix, padding, next_number)
                SELECT ?, 'EMP', 4,
                       COALESCE(MAX(
                         CASE
                           WHEN TRIM(COALESCE(employee_number, '')) REGEXP '^EMP-[0-9]+$'
                             THEN CAST(SUBSTRING(TRIM(employee_number), 5) AS UNSIGNED)
                           ELSE 0
                         END
                       ), 0) + 1
                FROM hr_employees
                WHERE company_id = ?
                ON DUPLICATE KEY UPDATE
                  next_number = GREATEST(hr_employee_number_sequences.next_number, VALUES(next_number))
                """,
            companyId,
            companyId
        );
    }

    private EmployeeNumberSequenceRow loadEmployeeNumberSequence(long companyId) {
        ensureEmployeeNumberSequenceRow(companyId);

        var rows = jdbcTemplate.query(
            """
                SELECT prefix, padding, next_number
                FROM hr_employee_number_sequences
                WHERE company_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new EmployeeNumberSequenceRow(
                safe(rs.getString("prefix")),
                rs.getInt("padding"),
                rs.getLong("next_number")
            ),
            companyId
        );

        if (rows.isEmpty()) {
            throw new IllegalStateException("Employee number sequence could not be initialized.");
        }

        return rows.getFirst();
    }

    private String generateNextEmployeeNumber(long companyId) {
        while (true) {
            var sequence = loadEmployeeNumberSequence(companyId);
            var candidate = formatEmployeeNumber(sequence.prefix(), sequence.padding(), sequence.nextNumber());

            jdbcTemplate.update(
                """
                    UPDATE hr_employee_number_sequences
                    SET next_number = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ?
                    """,
                sequence.nextNumber() + 1,
                companyId
            );

            if (!employeeNumberExists(companyId, candidate, null)) {
                return candidate;
            }
        }
    }

    private void synchronizeEmployeeNumberSequence(long companyId, String employeeNumber) {
        var normalized = normalizeEmployeeNumber(employeeNumber);
        if (normalized.isBlank()) {
            return;
        }

        var sequence = loadEmployeeNumberSequence(companyId);
        var expectedPrefix = sequence.prefix().toUpperCase(Locale.ROOT) + "-";
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
                    UPDATE hr_employee_number_sequences
                    SET next_number = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ?
                    """,
                nextNumber,
                companyId
            );
        }
    }

    private String formatEmployeeNumber(String prefix, int padding, long nextNumber) {
        var normalizedPrefix = prefix == null || prefix.isBlank() ? "EMP" : prefix.trim().toUpperCase(Locale.ROOT);
        var effectivePadding = Math.max(padding, 4);
        var digits = String.format(Locale.ROOT, "%0" + effectivePadding + "d", nextNumber);
        return normalizedPrefix + "-" + digits;
    }

    private boolean employeeNumberExists(long companyId, String employeeNumber, Long excludedEmployeeId) {
        if (employeeNumber == null || employeeNumber.isBlank()) {
            return false;
        }

        Integer count;
        if (excludedEmployeeId == null) {
            count = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM hr_employees
                    WHERE company_id = ?
                      AND employee_number = ?
                    """,
                Integer.class,
                companyId,
                employeeNumber
            );
        } else {
            count = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM hr_employees
                    WHERE company_id = ?
                      AND employee_number = ?
                      AND id <> ?
                    """,
                Integer.class,
                companyId,
                employeeNumber,
                excludedEmployeeId
            );
        }

        return count != null && count > 0;
    }

    private void ensureUniqueEmployeeNumber(long companyId, String employeeNumber, Long excludedEmployeeId) {
        if (employeeNumberExists(companyId, employeeNumber, excludedEmployeeId)) {
            throw new IllegalArgumentException("employee_number must be unique.");
        }
    }

    private String loadCurrentEmployeeNumber(long companyId, long employeeId) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(employee_number, '') AS employee_number
                FROM hr_employees
                WHERE company_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> safe(rs.getString("employee_number")),
            companyId,
            employeeId
        );

        return rows.isEmpty() ? "" : rows.getFirst();
    }

    private void requireEmployee(long companyId, long employeeId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employees WHERE company_id = ? AND id = ?",
            Integer.class,
            companyId,
            employeeId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("Employee not found.");
        }
    }

    private Map<String, Object> employeeDetails(long employeeId, long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT e.id,
                       e.employee_number,
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
                       COALESCE(e.status, 'active') AS status
                FROM hr_employees e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.id = ? AND e.company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapEmployeeRow(rs),
            employeeId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Employee not found.");
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("employee_id", employeeId);
        result.put("employee", rows.getFirst());
        result.put("profile", loadEmployeeProfile(companyId, employeeId));
        result.put("access", loadEmployeePortalAccess(companyId, employeeId));
        result.put("documents", loadEmployeeDocuments(companyId, employeeId));
        return result;
    }

    private Map<String, Object> loadEmployeeProfile(long companyId, long employeeId) {
        var rows = jdbcTemplate.query(
            """
                SELECT date_of_birth,
                       address,
                       national_id,
                       tax_id,
                       social_security_number,
                       registration_country,
                       state_province,
                       alternate_phone,
                       emergency_contact_name,
                       emergency_contact_relationship,
                       emergency_contact_phone,
                       workday_hours
                FROM hr_employee_profiles
                WHERE employee_id = ? AND company_id = ?
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
                profile.put("alternate_phone", safe(rs.getString("alternate_phone")));
                profile.put("emergency_contact_name", safe(rs.getString("emergency_contact_name")));
                profile.put("emergency_contact_relationship", safe(rs.getString("emergency_contact_relationship")));
                profile.put("emergency_contact_phone", safe(rs.getString("emergency_contact_phone")));
                profile.put("workday_hours", rs.getBigDecimal("workday_hours") == null ? new BigDecimal("8.00") : rs.getBigDecimal("workday_hours"));
                return profile;
            },
            employeeId,
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
        emptyProfile.put("alternate_phone", "");
        emptyProfile.put("emergency_contact_name", "");
        emptyProfile.put("emergency_contact_relationship", "");
        emptyProfile.put("emergency_contact_phone", "");
        emptyProfile.put("workday_hours", new BigDecimal("8.00"));
        return emptyProfile;
    }

    private Map<String, Object> loadEmployeePortalAccess(long companyId, long employeeId) {
        var rows = jdbcTemplate.query(
            """
                SELECT a.access_role,
                       a.linked_user_id,
                       COALESCE(u.full_name, '') AS linked_user_name,
                       COALESCE(u.email, '') AS linked_user_email,
                       a.invitation_id,
                       a.invitation_status,
                       a.last_invited_at
                FROM hr_employee_portal_access a
                LEFT JOIN users u ON u.id = a.linked_user_id
                WHERE a.employee_id = ? AND a.company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var access = new LinkedHashMap<String, Object>();
                access.put("access_role", normalizeAccessRole(rs.getString("access_role")));
                access.put("linked_user_id", getNullableLong(rs, "linked_user_id"));
                access.put("linked_user_name", safe(rs.getString("linked_user_name")));
                access.put("linked_user_email", safe(rs.getString("linked_user_email")));
                access.put("invitation_id", getNullableLong(rs, "invitation_id"));
                access.put("invitation_status", normalizeInvitationStatus(rs.getString("invitation_status")));
                access.put("last_invited_at", timestampToLocalDateTime(rs.getTimestamp("last_invited_at")));
                return access;
            },
            employeeId,
            companyId
        );

        if (!rows.isEmpty()) {
            return rows.getFirst();
        }

        var emptyAccess = new LinkedHashMap<String, Object>();
        emptyAccess.put("access_role", "employee");
        emptyAccess.put("linked_user_id", null);
        emptyAccess.put("linked_user_name", "");
        emptyAccess.put("linked_user_email", "");
        emptyAccess.put("invitation_id", null);
        emptyAccess.put("invitation_status", "not_invited");
        emptyAccess.put("last_invited_at", null);
        return emptyAccess;
    }

    private List<Map<String, Object>> loadEmployeeDocuments(long companyId, long employeeId) {
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
                FROM hr_employee_documents
                WHERE company_id = ? AND employee_id = ?
                ORDER BY FIELD(document_type, 'birth_certificate', 'government_id', 'proof_of_address', 'resume', 'profile_photo'), id ASC
                """,
            (rs, rowNum) -> mapDocumentRow(rs),
            companyId,
            employeeId
        );
    }

    private Map<String, Object> loadEmployeeDocument(long companyId, long employeeId, String documentType) {
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
                FROM hr_employee_documents
                WHERE company_id = ? AND employee_id = ? AND document_type = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapDocumentRow(rs),
            companyId,
            employeeId,
            documentType
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Employee document not found.");
        }

        return rows.getFirst();
    }

    private Map<String, Object> mapEmployeeRow(ResultSet rs) throws SQLException {
        var fullName = String.join(
            " ",
            safe(rs.getString("first_name")),
            safe(rs.getString("last_name"))
        ).trim();

        var employee = new LinkedHashMap<String, Object>();
        employee.put("id", rs.getLong("id"));
        employee.put("employee_number", safe(rs.getString("employee_number")));
        employee.put("first_name", safe(rs.getString("first_name")));
        employee.put("last_name", safe(rs.getString("last_name")));
        employee.put("full_name", fullName);
        employee.put("email", safe(rs.getString("email")));
        employee.put("phone", safe(rs.getString("phone")));
        employee.put("position", safe(rs.getString("position")));
        employee.put("position_title", safe(rs.getString("position")));
        employee.put("department", safe(rs.getString("department")));
        employee.put("unit_id", getNullableLong(rs, "unit_id"));
        employee.put("unit_name", safe(rs.getString("unit_name")));
        employee.put("business_id", getNullableLong(rs, "business_id"));
        employee.put("business_name", safe(rs.getString("business_name")));
        employee.put("hire_date", rs.getObject("hire_date"));
        employee.put("salary", rs.getBigDecimal("salary"));
        employee.put("pay_period", normalizePayPeriod(rs.getString("pay_period")));
        employee.put("salary_type", normalizeSalaryType(rs.getString("salary_type")));
        employee.put("hourly_rate", rs.getBigDecimal("hourly_rate"));
        employee.put("contract_type", normalizeContractType(rs.getString("contract_type")));
        employee.put("contract_start_date", rs.getObject("contract_start_date"));
        employee.put("contract_end_date", rs.getObject("contract_end_date"));
        employee.put("termination_date", rs.getObject("termination_date"));
        employee.put("last_working_day", rs.getObject("last_working_day"));
        employee.put("termination_reason_type", safe(rs.getString("termination_reason_type")));
        employee.put("termination_reason_code", safe(rs.getString("termination_reason_code")));
        employee.put("termination_summary", safe(rs.getString("termination_summary")));
        employee.put("status", normalizeEmployeeStatus(rs.getString("status")));
        return employee;
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

    private void deleteEmployeeDocumentObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }

        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Deleting the employee record should not fail because the document object is already missing.
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

    private boolean parseBoolean(Map<String, Object> payload, boolean fallback, String... keys) {
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }

            var value = payload.get(key);
            if (value instanceof Boolean bool) {
                return bool;
            }
            if (value instanceof String string) {
                var normalized = string.trim().toLowerCase(Locale.ROOT);
                if (normalized.equals("true") || normalized.equals("1") || normalized.equals("yes")) {
                    return true;
                }
                if (normalized.equals("false") || normalized.equals("0") || normalized.equals("no")) {
                    return false;
                }
            }
        }
        return fallback;
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

    private String normalizeEmployeeStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "active", "activo" -> "active";
            case "inactive", "inactivo" -> "inactive";
            case "terminated", "terminado" -> "terminated";
            default -> throw new IllegalArgumentException("Unsupported employee status.");
        };
    }

    private String normalizeTerminationReasonType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "resignation", "termination_for_cause", "contract_end", "mutual_agreement", "other" -> normalized;
            default -> throw new IllegalArgumentException("Unsupported reason_type.");
        };
    }

    private String normalizeAccessRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "employee", "colaborador" -> "employee";
            case "coordinator", "coordinador" -> "coordinator";
            case "manager", "gerente" -> "manager";
            case "administrator", "admin", "administrador" -> "administrator";
            default -> throw new IllegalArgumentException("Unsupported access_role.");
        };
    }

    private String normalizeInvitationRole(String accessRole) {
        return switch (normalizeAccessRole(accessRole)) {
            case "administrator" -> "admin";
            default -> "user";
        };
    }

    private String normalizeInvitationStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "linked", "pending", "not_invited" -> normalized;
            default -> "not_invited";
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

    private String normalizeDocumentObjectKey(long companyId, long employeeId, String documentType, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("object_key is required.");
        }

        var normalizedKey = objectKey.trim();
        var expectedPrefix = "hr/employees/" + companyId + "/" + employeeId + "/documents/" + documentType + "/";
        if (!normalizedKey.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("object_key must match the expected employee document upload prefix.");
        }
        return normalizedKey;
    }

    private String buildEmployeeDocumentObjectKey(
        long companyId,
        long employeeId,
        String documentType,
        String originalFileName,
        String contentType
    ) {
        return "hr/employees/"
            + companyId + "/"
            + employeeId + "/documents/"
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

    private String normalizeEmployeeNumber(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        var normalized = value.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() > 50) {
            throw new IllegalArgumentException("employee_number must be 50 characters or fewer.");
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

    private LocalDateTime timestampToLocalDateTime(Timestamp primary, Timestamp fallback) {
        var value = primary != null ? primary : fallback;
        return value == null ? null : value.toLocalDateTime();
    }

    private LocalDateTime timestampToLocalDateTime(Timestamp value) {
        return value == null ? null : value.toLocalDateTime();
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private void setNullableLong(java.sql.PreparedStatement statement, int parameterIndex, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(parameterIndex, Types.BIGINT);
        } else {
            statement.setLong(parameterIndex, value);
        }
    }

    private record EmployeeDraft(
        String employeeNumber,
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

        private EmployeeDraft withEmployeeNumber(String nextEmployeeNumber) {
            return new EmployeeDraft(
                nextEmployeeNumber,
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
                new BigDecimal("8.00")
            );
        }

        private String dateOfBirthRaw() {
            return dateOfBirth == null ? null : dateOfBirth.toString();
        }
    }

    private record PortalAccessDraft(
        String accessRole,
        boolean inviteOnSave
    ) {
        static PortalAccessDraft defaults() {
            return new PortalAccessDraft("employee", false);
        }
    }

    private record PendingInvitationRef(
        long id,
        LocalDateTime lastInvitedAt
    ) {
    }

    private record BusinessRef(
        long id,
        Long unitId
    ) {
    }

    private record EmployeeDocumentRef(
        long id,
        String objectKey
    ) {
    }

    private record EmployeeNumberSequenceRow(
        String prefix,
        int padding,
        long nextNumber
    ) {
    }
}
