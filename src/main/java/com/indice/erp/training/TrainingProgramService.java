package com.indice.erp.training;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingProgramService {

    public static final String PROGRAM_CODE = "INDICE_FOUNDATIONS";
    public static final String PROGRAM_VERSION = "2026.2";
    private static final Map<String, String> ASSESSMENT_ANSWERS = Map.of(
        "assessment.indice", "configure-foundation",
        "assessment.rh", "configure-people-control",
        "assessment.procesos", "repeatable-process",
        "assessment.finanzas", "controlled-fund",
        "assessment.ventas", "commercial-flow",
        "assessment.kpis", "validate-and-drill",
        "assessment.comercial", "diagnose-value"
    );
    private static final Set<String> ITEM_CODES = Set.of(
        "indice.propuesta", "indice.navegacion", "indice.personalizacion", "indice.dashboard",
        "indice.filtros", "indice.notificaciones", "rh.colaboradores", "rh.agregar", "rh.editar",
        "rh.columnas", "rh.accesos", "rh.asistencia", "rh.documentos", "rh.nomina",
        "procesos.diferencia", "procesos.crear", "procesos.seguimiento", "tareas.crear",
        "tareas.evidencia", "tareas.vistas", "finanzas.caja", "finanzas.gastos",
        "finanzas.proveedores", "finanzas.compras", "finanzas.cuentas", "finanzas.presupuestos",
        "finanzas.impuestos", "ventas.clientes", "ventas.oportunidades", "ventas.cotizaciones",
        "ventas.cierre", "ventas.pipeline", "ventas.inventario", "ventas.posventa", "kpis.operativos",
        "kpis.filtros", "kpis.detalle", "estados.resultados", "estados.balance", "estados.flujo",
        "estados.decision", "comercial.origen", "comercial.investigar", "comercial.contacto",
        "comercial.mensaje", "consultoria.preparacion", "consultoria.presentacion", "consultoria.escucha",
        "consultoria.dolor", "consultoria.demo", "cierre.alcance", "cierre.temperatura", "cierre.valor",
        "cierre.acuerdos", "acompanamiento.implementacion", "acompanamiento.adopcion", "acompanamiento.60meses",
        "assessment.indice", "assessment.rh", "assessment.procesos", "assessment.finanzas",
        "assessment.ventas", "assessment.kpis", "assessment.comercial"
    );

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService platformAccess;
    private final DistributorPortfolioAccessPolicy distributorAccess;
    private final Clock clock;

    public TrainingProgramService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService platformAccess,
        DistributorPortfolioAccessPolicy distributorAccess,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.platformAccess = platformAccess;
        this.distributorAccess = distributorAccess;
        this.clock = clock;
    }

    public Map<String, Object> platformWorkspace(long actorUserId) {
        platformAccess.require(actorUserId, "PLATFORM_VIEW");
        return workspace(actorUserId, true);
    }

    public Map<String, Object> distributorWorkspace(AuthSessionUser actor) {
        distributorAccess.requireDistributor(actor);
        return workspace(actor.userId(), false);
    }

    @Transactional
    public Map<String, Object> updatePlatformProgress(long actorUserId, ProgressRequest request) {
        platformAccess.require(actorUserId, "PLATFORM_VIEW");
        return update(actorUserId, request, true);
    }

    @Transactional
    public Map<String, Object> updateDistributorProgress(AuthSessionUser actor, ProgressRequest request) {
        distributorAccess.requireDistributor(actor);
        return update(actor.userId(), request, false);
    }

    @Transactional
    public Map<String, Object> validatePlatformAssessment(long actorUserId, AssessmentRequest request) {
        platformAccess.require(actorUserId, "PLATFORM_VIEW");
        return validateAssessment(actorUserId, request, true);
    }

    @Transactional
    public Map<String, Object> validateDistributorAssessment(AuthSessionUser actor, AssessmentRequest request) {
        distributorAccess.requireDistributor(actor);
        return validateAssessment(actor.userId(), request, false);
    }

    private Map<String, Object> update(long userId, ProgressRequest request, boolean includeSummary) {
        var itemCode = normalizeItemCode(request == null ? null : request.itemCode());
        if (itemCode.startsWith("assessment.") && request != null && request.completed()) {
            throw new IllegalArgumentException("La competencia debe acreditarse mediante su validación obligatoria.");
        }
        return setCompletion(userId, itemCode, request != null && request.completed(), includeSummary);
    }

    private Map<String, Object> validateAssessment(long userId, AssessmentRequest request, boolean includeSummary) {
        var itemCode = normalizeItemCode(request == null ? null : request.itemCode());
        var expectedAnswer = ASSESSMENT_ANSWERS.get(itemCode);
        if (expectedAnswer == null) {
            throw new IllegalArgumentException("La validación solicitada no existe.");
        }
        if (request == null || !request.practiceConfirmed()) {
            throw new IllegalArgumentException("Debes realizar y confirmar la práctica antes de acreditar la etapa.");
        }
        var answerCode = request.answerCode() == null ? "" : request.answerCode().trim().toLowerCase();
        if (!expectedAnswer.equals(answerCode)) {
            throw new IllegalArgumentException("La respuesta todavía no demuestra el criterio consultivo esperado. Revisa el caso e inténtalo nuevamente.");
        }
        return setCompletion(userId, itemCode, true, includeSummary);
    }

    private Map<String, Object> setCompletion(long userId, String itemCode, boolean completed, boolean includeSummary) {
        if (completed) {
            jdbcTemplate.update(
                """
                    INSERT INTO training_item_progress
                        (user_id, program_code, program_version, item_code, completed_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE completed_at = VALUES(completed_at), updated_at = VALUES(updated_at)
                    """,
                userId, PROGRAM_CODE, PROGRAM_VERSION, itemCode,
                Timestamp.from(clock.instant()), Timestamp.from(clock.instant())
            );
        } else {
            jdbcTemplate.update(
                "DELETE FROM training_item_progress WHERE user_id = ? AND program_code = ? AND program_version = ? AND item_code = ?",
                userId, PROGRAM_CODE, PROGRAM_VERSION, itemCode
            );
        }
        return workspace(userId, includeSummary);
    }

    private Map<String, Object> workspace(long userId, boolean includeSummary) {
        var completedItems = jdbcTemplate.queryForList(
            """
                SELECT item_code FROM training_item_progress
                WHERE user_id = ? AND program_code = ? AND program_version = ?
                ORDER BY completed_at
                """,
            String.class, userId, PROGRAM_CODE, PROGRAM_VERSION
        );
        var response = new LinkedHashMap<String, Object>();
        response.put("program_code", PROGRAM_CODE);
        response.put("program_version", PROGRAM_VERSION);
        response.put("completed_item_codes", completedItems);
        if (includeSummary) response.put("audience_summary", audienceSummary());
        return response;
    }

    private Map<String, Object> audienceSummary() {
        var rows = jdbcTemplate.queryForList(
            """
                SELECT COUNT(DISTINCT progress.user_id) AS active_learners,
                       COUNT(*) AS completed_checks,
                       MAX(progress.updated_at) AS last_activity_at
                FROM training_item_progress progress
                WHERE progress.program_code = ? AND progress.program_version = ?
                """,
            PROGRAM_CODE, PROGRAM_VERSION
        );
        return rows.isEmpty() ? Map.of("active_learners", 0, "completed_checks", 0) : rows.getFirst();
    }

    private String normalizeItemCode(String rawItemCode) {
        var itemCode = rawItemCode == null ? "" : rawItemCode.trim().toLowerCase();
        if (!ITEM_CODES.contains(itemCode)) {
            throw new IllegalArgumentException("El tema de capacitación no es válido.");
        }
        return itemCode;
    }

    public record ProgressRequest(String itemCode, boolean completed) {}
    public record AssessmentRequest(String itemCode, String answerCode, boolean practiceConfirmed) {}
}
