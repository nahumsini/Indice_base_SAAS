package com.indice.erp.hr.payroll.provider.ca;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.payroll.HrPayrollAuthorizationService;
import com.indice.erp.hr.payroll.HrPayrollScopeAccess;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CanadaPayrollProfileService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final HrPayrollScopeAccess scopeAccess;
    private final HrAccessService access;
    private final HrPayrollAuthorizationService authorization;

    public CanadaPayrollProfileService(JdbcTemplate jdbc, ObjectMapper mapper, HrPayrollScopeAccess scopeAccess,
        HrAccessService access, HrPayrollAuthorizationService authorization) {
        this.jdbc = jdbc; this.mapper = mapper; this.scopeAccess = scopeAccess;
        this.access = access; this.authorization = authorization;
    }

    public record SaveRequest(long expectedRevision, UUID requestId, CanadaPayrollProfile profile) {}
    public record ProfileVersion(long revision, CanadaPayrollProfile profile) {}
    public record ProfileResponse(long revision, CanadaPayrollProfile profile, boolean canConfigure, List<ProfileVersion> history) {}

    @Transactional(readOnly = true)
    public ProfileResponse get(AuthSessionUser actor, long employeeId) {
        requireEmployee(actor, employeeId, false);
        return response(actor, employeeId);
    }

    @Transactional
    public ProfileResponse save(AuthSessionUser actor, long employeeId, SaveRequest request) {
        if (!authorization.can(actor, HrPayrollAuthorizationService.Action.CONFIGURE)) throw new HrAccessDeniedException("Forbidden");
        requireEmployee(actor, employeeId, true);
        if (request == null || request.profile() == null || request.requestId() == null || request.expectedRevision() < 0)
            throw new IllegalArgumentException("Faltan los datos del perfil o su versión.");
        request.profile().validate();
        var repeated = jdbc.query("SELECT profile_json FROM payroll_canada_profile_versions WHERE company_id=? AND hr_user_id=? AND request_id=? FOR UPDATE",
            (rs, row) -> decode(rs.getString(1)), actor.companyId(), employeeId, request.requestId().toString());
        if (!repeated.isEmpty()) {
            if (!repeated.getFirst().equals(request.profile())) throw new IllegalArgumentException("La solicitud ya fue usada con otros datos.");
            return response(actor, employeeId, true);
        }
        long revision = latestRevision(actor.companyId(), employeeId);
        if (revision != request.expectedRevision()) throw new ProfileConflictException();
        jdbc.update("""
            INSERT INTO payroll_canada_profile_versions
              (company_id, hr_user_id, revision, request_id, effective_from, profile_json, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, actor.companyId(), employeeId, revision + 1, request.requestId().toString(),
            request.profile().effectiveFrom(), encode(request.profile()), actor.userId());
        return response(actor, employeeId, true);
    }

    /** Called only by the payroll owner, after its tenant and operational-scope checks. */
    public Map<String, Object> calculationMetadata(long companyId, long employeeId, LocalDate start, LocalDate end) {
        var rows = jdbc.query("""
            SELECT revision, profile_json FROM payroll_canada_profile_versions
            WHERE company_id=? AND hr_user_id=? AND effective_from<=?
            ORDER BY effective_from DESC, revision DESC LIMIT 1
            """, (rs, row) -> new ProfileVersion(rs.getLong(1), decode(rs.getString(2))), companyId, employeeId, start);
        if (rows.isEmpty()) return Map.of();
        var changes = jdbc.queryForObject("""
            SELECT COUNT(*) FROM payroll_canada_profile_versions
            WHERE company_id=? AND hr_user_id=? AND effective_from>? AND effective_from<=?
            """, Long.class, companyId, employeeId, start, end);
        var version = rows.getFirst();
        var metadata = new LinkedHashMap<String, Object>(Map.of("canadaProfileRevision", version.revision(), "canadaProfile",
            mapper.convertValue(version.profile(), new TypeReference<Map<String, Object>>() {}),
            "canadaProfileChangesWithinPeriod", changes != null && changes > 0));
        metadata.put("canadaPaymentDate", version.profile().paymentDate(end).toString());
        return Map.copyOf(metadata);
    }

    private ProfileResponse response(AuthSessionUser actor, long employeeId) {
        return response(actor, employeeId, false);
    }

    private ProfileResponse response(AuthSessionUser actor, long employeeId, boolean currentRead) {
        var history = jdbc.query("""
            SELECT revision, profile_json FROM payroll_canada_profile_versions
            WHERE company_id=? AND hr_user_id=? ORDER BY revision DESC
            """ + (currentRead ? " FOR UPDATE" : ""), (rs, row) -> new ProfileVersion(rs.getLong(1), decode(rs.getString(2))), actor.companyId(), employeeId);
        return new ProfileResponse(history.isEmpty() ? 0 : history.getFirst().revision(),
            history.isEmpty() ? null : history.getFirst().profile(),
            authorization.can(actor, HrPayrollAuthorizationService.Action.CONFIGURE), history);
    }

    private long latestRevision(long companyId, long employeeId) {
        // Current read: the enclosing employee edit may already have a repeatable-read snapshot.
        // The employee lock serializes writers; do not compare against an older snapshot here.
        var rows = jdbc.query("SELECT revision FROM payroll_canada_profile_versions WHERE company_id=? AND hr_user_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE",
            (rs, row) -> rs.getLong(1), companyId, employeeId);
        return rows.isEmpty() ? 0 : rows.getFirst();
    }

    private void requireEmployee(AuthSessionUser actor, long employeeId, boolean lock) {
        if (!access.canAccessManagementTab(actor, HrAccessService.HrTab.PAYROLL)) throw new HrAccessDeniedException("Forbidden");
        var scope = scopeAccess.resolve(actor);
        var parameters = new ArrayList<Object>(List.of(actor.companyId(), employeeId));
        parameters.addAll(scope.hrUserParameters());
        var found = jdbc.query("SELECT e.id FROM hr_users e WHERE e.company_id=? AND e.id=?"
            + scope.hrUserPredicate("e") + (lock ? " FOR UPDATE" : ""), (rs, row) -> rs.getLong(1), parameters.toArray());
        if (found.isEmpty()) throw new NoSuchElementException("Colaborador no disponible en tu ámbito de acceso.");
        if (lock) {
            var eligible=jdbc.queryForObject("SELECT COUNT(*) FROM hr_users WHERE company_id=? AND id=? AND registration_country='CA' AND payroll_treatment='fiscal_payroll'",
                Integer.class,actor.companyId(),employeeId);
            if(eligible==null || eligible==0)throw new IllegalArgumentException("El perfil de Canadá requiere país Canadá y nómina fiscal.");
        }
    }

    private String encode(CanadaPayrollProfile profile) {
        try { return mapper.writeValueAsString(profile); }
        catch (Exception ex) { throw new IllegalStateException("No se pudo guardar el perfil de nómina.", ex); }
    }
    private CanadaPayrollProfile decode(String json) {
        try { return mapper.readValue(json, CanadaPayrollProfile.class); }
        catch (Exception ex) { throw new IllegalStateException("No se pudo leer el perfil de nómina.", ex); }
    }
    public static class ProfileConflictException extends IllegalArgumentException {
        public ProfileConflictException() { super("Otro usuario actualizó estos datos. Recarga el perfil antes de guardar."); }
    }
}
