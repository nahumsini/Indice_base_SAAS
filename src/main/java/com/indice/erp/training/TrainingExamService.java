package com.indice.erp.training;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.SecureRandom;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingExamService {

    public static final String FINAL_EXAM_CODE = "final";
    private static final int MODULE_QUESTION_COUNT = 10;
    private static final int MODULE_PASS_SCORE = 8;
    private static final int MODULE_DURATION_MINUTES = 15;
    private static final int FINAL_QUESTION_COUNT = 20;
    private static final int FINAL_PASS_SCORE = 16;
    private static final int FINAL_DURATION_MINUTES = 35;
    private static final Duration RETRY_COOLDOWN = Duration.ofMinutes(15);
    private static final List<String> MODULE_CODES = TrainingExamQuestionBank.moduleExamCodes();
    private static final Map<String, Set<String>> REQUIRED_ITEMS = Map.of(
        "indice", Set.of("indice.propuesta", "indice.navegacion", "indice.personalizacion", "indice.dashboard", "indice.filtros", "indice.notificaciones"),
        "rh", Set.of("rh.colaboradores", "rh.agregar", "rh.editar", "rh.columnas", "rh.accesos", "rh.asistencia", "rh.documentos", "rh.nomina"),
        "procesos", Set.of("procesos.diferencia", "procesos.crear", "procesos.seguimiento", "tareas.crear", "tareas.evidencia", "tareas.vistas"),
        "finanzas", Set.of("finanzas.caja", "finanzas.gastos", "finanzas.proveedores", "finanzas.compras", "finanzas.cuentas", "finanzas.presupuestos", "finanzas.impuestos"),
        "ventas", Set.of("ventas.clientes", "ventas.oportunidades", "ventas.cotizaciones", "ventas.cierre", "ventas.pipeline", "ventas.inventario", "ventas.posventa"),
        "kpis", Set.of("kpis.operativos", "kpis.filtros", "kpis.detalle", "estados.resultados", "estados.balance", "estados.flujo", "estados.decision"),
        "comercial", Set.of("comercial.origen", "comercial.investigar", "comercial.contacto", "comercial.mensaje", "consultoria.preparacion", "consultoria.presentacion", "consultoria.escucha", "consultoria.dolor", "consultoria.demo", "cierre.alcance", "cierre.temperatura", "cierre.valor", "cierre.acuerdos", "acompanamiento.implementacion", "acompanamiento.adopcion", "acompanamiento.60meses")
    );

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public TrainingExamService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional
    public Map<String, Object> summary(long userId) {
        expireOpenAttempts(userId);
        var modules = new ArrayList<Map<String, Object>>();
        for (var code : MODULE_CODES) modules.add(examSummary(userId, code));
        var response = new LinkedHashMap<String, Object>();
        response.put("program_code", TrainingProgramService.PROGRAM_CODE);
        response.put("program_version", TrainingProgramService.PROGRAM_VERSION);
        response.put("server_time", clock.instant());
        response.put("modules", modules);
        response.put("final_exam", examSummary(userId, FINAL_EXAM_CODE));
        response.put("all_modules_passed", modules.stream().allMatch(row -> Boolean.TRUE.equals(row.get("passed"))));
        response.put("certificate", findCertificate(userId));
        return response;
    }

    @Transactional
    public Map<String, Object> start(long userId, String rawExamCode) {
        var examCode = normalizeExamCode(rawExamCode);
        expireOpenAttempts(userId);
        var active = findActiveAttempt(userId, examCode);
        if (active != null) return attemptView(active);
        requireEligible(userId, examCode);
        requireCooldownComplete(userId, examCode);

        var questions = selectQuestions(examCode);
        var now = clock.instant();
        var expiresAt = now.plus(Duration.ofMinutes(durationMinutes(examCode)));
        var keyHolder = new GeneratedKeyHolder();
        var nextAttempt = jdbcTemplate.queryForObject(
            "SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM training_exam_attempts WHERE user_id = ? AND program_code = ? AND program_version = ? AND exam_code = ?",
            Integer.class, userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, examCode
        );
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                """
                    INSERT INTO training_exam_attempts
                        (user_id, program_code, program_version, exam_code, attempt_number, status,
                         started_at, expires_at, question_codes_json, answers_json, total_questions)
                    VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, userId);
            statement.setString(2, TrainingProgramService.PROGRAM_CODE);
            statement.setString(3, TrainingProgramService.PROGRAM_VERSION);
            statement.setString(4, examCode);
            statement.setInt(5, nextAttempt == null ? 1 : nextAttempt);
            statement.setTimestamp(6, Timestamp.from(now));
            statement.setTimestamp(7, Timestamp.from(expiresAt));
            statement.setString(8, writeJson(questions.stream().map(TrainingExamQuestionBank.Question::code).toList()));
            statement.setString(9, "{}");
            statement.setInt(10, questions.size());
            return statement;
        }, keyHolder);
        var key = keyHolder.getKey();
        if (key == null) throw new IllegalStateException("No fue posible iniciar la evaluación.");
        return attemptView(requireAttempt(userId, key.longValue(), false));
    }

    @Transactional
    public Map<String, Object> attempt(long userId, long attemptId) {
        var attempt = requireAttempt(userId, attemptId, false);
        if ("IN_PROGRESS".equals(attempt.status()) && !clock.instant().isBefore(attempt.expiresAt())) {
            return submitInternal(attempt);
        }
        return attemptView(attempt);
    }

    @Transactional
    public Map<String, Object> saveAnswer(long userId, long attemptId, AnswerRequest request) {
        var attempt = requireAttempt(userId, attemptId, true);
        requireInProgress(attempt);
        if (!clock.instant().isBefore(attempt.expiresAt())) {
            return submitInternal(attempt);
        }
        var questionCode = request == null || request.questionCode() == null ? "" : request.questionCode().trim();
        var optionCode = request == null || request.optionCode() == null ? "" : request.optionCode().trim();
        if (!attempt.questionCodes().contains(questionCode)) throw new IllegalArgumentException("La pregunta no pertenece a este intento.");
        var question = TrainingExamQuestionBank.find(questionCode);
        if (resolveInternalOption(attempt.id(), question, optionCode) == null) throw new IllegalArgumentException("La respuesta no es válida.");
        var answers = new LinkedHashMap<>(attempt.answers());
        answers.put(questionCode, optionCode);
        jdbcTemplate.update("UPDATE training_exam_attempts SET answers_json = ?, updated_at = ? WHERE id = ?", writeJson(answers), Timestamp.from(clock.instant()), attemptId);
        return attemptView(requireAttempt(userId, attemptId, false));
    }

    @Transactional
    public Map<String, Object> submit(long userId, long attemptId) {
        return submitInternal(requireAttempt(userId, attemptId, true));
    }

    public Map<String, Object> certificate(long userId) {
        var certificate = findCertificate(userId);
        if (certificate == null) throw new NoSuchElementException("Todavía no existe un certificado vigente para este programa.");
        return certificate;
    }

    public Map<String, Object> verifyCertificate(String rawFolio, String rawToken) {
        var folio = rawFolio == null ? "" : rawFolio.trim().toUpperCase();
        var token = rawToken == null ? "" : rawToken.trim();
        if (token.isBlank()) throw new NoSuchElementException("El certificado no existe.");
        var rows = jdbcTemplate.query(
            """
                SELECT c.folio, c.program_version, c.issued_at, c.expires_at, c.status
                FROM training_certificates c WHERE c.folio = ? AND c.verification_token = ?
                """,
            (rs, rowNum) -> {
                var expiresAt = rs.getTimestamp("expires_at").toInstant();
                var result = new LinkedHashMap<String, Object>();
                result.put("authentic", true);
                result.put("folio", rs.getString("folio"));
                result.put("program_version", rs.getString("program_version"));
                result.put("issued_at", rs.getTimestamp("issued_at").toInstant());
                result.put("expires_at", expiresAt);
                result.put("status", "ACTIVE".equals(rs.getString("status")) && clock.instant().isBefore(expiresAt) ? "ACTIVE" : "EXPIRED");
                return result;
            }, folio, token
        );
        if (rows.isEmpty()) throw new NoSuchElementException("El certificado no existe.");
        return rows.getFirst();
    }

    private Map<String, Object> submitInternal(Attempt attempt) {
        if (!"IN_PROGRESS".equals(attempt.status())) return attemptView(attempt);
        int score = 0;
        for (var questionCode : attempt.questionCodes()) {
            var question = TrainingExamQuestionBank.find(questionCode);
            var selected = resolveInternalOption(attempt.id(), question, attempt.answers().get(questionCode));
            if (selected != null && question.correctOptionCode().equals(selected.code())) score++;
        }
        var submittedAt = clock.instant();
        var passed = score >= passScore(attempt.examCode());
        jdbcTemplate.update(
            "UPDATE training_exam_attempts SET status = 'SUBMITTED', submitted_at = ?, score = ?, passed = ?, updated_at = ? WHERE id = ?",
            Timestamp.from(submittedAt), score, passed, Timestamp.from(submittedAt), attempt.id()
        );
        if (passed && FINAL_EXAM_CODE.equals(attempt.examCode())) issueCertificate(attempt.userId(), score, attempt.totalQuestions(), submittedAt);
        return attemptView(requireAttempt(attempt.userId(), attempt.id(), false));
    }

    private void issueCertificate(long userId, int score, int total, Instant issuedAt) {
        var folio = "IND-" + issuedAt.atZone(java.time.ZoneOffset.UTC).getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        jdbcTemplate.update(
            """
                INSERT INTO training_certificates
                    (user_id, program_code, program_version, folio, verification_token, final_score,
                     total_questions, issued_at, expires_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                ON DUPLICATE KEY UPDATE final_score = GREATEST(final_score, VALUES(final_score)), updated_at = CURRENT_TIMESTAMP(6)
                """,
            userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, folio,
            UUID.randomUUID().toString(), score, total, Timestamp.from(issuedAt), Timestamp.from(issuedAt.plus(365, ChronoUnit.DAYS))
        );
    }

    private void requireEligible(long userId, String examCode) {
        if (FINAL_EXAM_CODE.equals(examCode)) {
            var passed = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT exam_code) FROM training_exam_attempts WHERE user_id = ? AND program_code = ? AND program_version = ? AND passed = TRUE AND exam_code <> ?",
                Integer.class, userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, FINAL_EXAM_CODE
            );
            if (passed == null || passed < MODULE_CODES.size()) throw new IllegalStateException("Debes aprobar las siete evaluaciones de etapa antes del examen final.");
            return;
        }
        var required = REQUIRED_ITEMS.get(examCode);
        var completed = jdbcTemplate.queryForList(
            "SELECT item_code FROM training_item_progress WHERE user_id = ? AND program_code = ? AND program_version = ?",
            String.class, userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION
        );
        if (!completed.containsAll(required)) throw new IllegalStateException("Completa todas las prácticas de esta etapa antes de iniciar su evaluación.");
    }

    private void requireCooldownComplete(long userId, String examCode) {
        var submitted = jdbcTemplate.query(
            """
                SELECT submitted_at FROM training_exam_attempts
                WHERE user_id = ? AND program_code = ? AND program_version = ? AND exam_code = ? AND passed = FALSE
                ORDER BY submitted_at DESC LIMIT 1
                """,
            (rs, rowNum) -> rs.getTimestamp(1).toInstant(), userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, examCode
        );
        if (!submitted.isEmpty()) {
            var availableAt = submitted.getFirst().plus(RETRY_COOLDOWN);
            if (clock.instant().isBefore(availableAt)) throw new IllegalStateException("Podrás repetir la evaluación después del periodo de revisión de 15 minutos.");
        }
    }

    private List<TrainingExamQuestionBank.Question> selectQuestions(String examCode) {
        if (!FINAL_EXAM_CODE.equals(examCode)) {
            var questions = new ArrayList<>(TrainingExamQuestionBank.bank(examCode));
            Collections.shuffle(questions, secureRandom);
            return List.copyOf(questions.subList(0, MODULE_QUESTION_COUNT));
        }
        var selected = new ArrayList<TrainingExamQuestionBank.Question>();
        var remaining = new ArrayList<TrainingExamQuestionBank.Question>();
        for (var moduleCode : MODULE_CODES) {
            var bank = new ArrayList<>(TrainingExamQuestionBank.bank(moduleCode));
            Collections.shuffle(bank, secureRandom);
            selected.addAll(bank.subList(0, 2));
            remaining.addAll(bank.subList(2, bank.size()));
        }
        Collections.shuffle(remaining, secureRandom);
        selected.addAll(remaining.subList(0, FINAL_QUESTION_COUNT - selected.size()));
        Collections.shuffle(selected, secureRandom);
        return List.copyOf(selected);
    }

    private Map<String, Object> attemptView(Attempt attempt) {
        var questions = new ArrayList<Map<String, Object>>();
        for (var questionCode : attempt.questionCodes()) {
            var question = TrainingExamQuestionBank.find(questionCode);
            var options = shuffledOptions(attempt.id(), question);
            var publicOptions = new ArrayList<Map<String, String>>();
            for (int index = 0; index < options.size(); index++) {
                publicOptions.add(Map.of("code", "option-" + (index + 1), "label", options.get(index).label()));
            }
            var row = new LinkedHashMap<String, Object>();
            row.put("code", question.code());
            row.put("prompt", question.prompt());
            row.put("options", publicOptions);
            questions.add(row);
        }
        var response = new LinkedHashMap<String, Object>();
        response.put("id", attempt.id());
        response.put("exam_code", attempt.examCode());
        response.put("attempt_number", attempt.attemptNumber());
        response.put("status", attempt.status());
        response.put("started_at", attempt.startedAt());
        response.put("expires_at", attempt.expiresAt());
        response.put("server_time", clock.instant());
        response.put("duration_seconds", durationMinutes(attempt.examCode()) * 60);
        response.put("questions", questions);
        response.put("answers", attempt.answers());
        response.put("answered_count", attempt.answers().size());
        response.put("total_questions", attempt.totalQuestions());
        response.put("pass_score", passScore(attempt.examCode()));
        response.put("score", attempt.score());
        response.put("passed", attempt.passed());
        response.put("submitted_at", attempt.submittedAt());
        return response;
    }

    private Map<String, Object> examSummary(long userId, String examCode) {
        var rows = jdbcTemplate.queryForList(
            """
                SELECT COUNT(*) AS attempts,
                       COALESCE(MAX(CASE WHEN passed = TRUE THEN 1 ELSE 0 END), 0) AS passed,
                       MAX(score) AS best_score,
                       MAX(CASE WHEN status = 'IN_PROGRESS' THEN id END) AS active_attempt_id,
                       MAX(CASE WHEN passed = FALSE THEN submitted_at END) AS latest_failed_at
                FROM training_exam_attempts
                WHERE user_id = ? AND program_code = ? AND program_version = ? AND exam_code = ?
                """,
            userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, examCode
        );
        var row = rows.getFirst();
        var failedAt = row.get("latest_failed_at") instanceof Timestamp timestamp ? timestamp.toInstant() : null;
        var cooldownUntil = failedAt == null ? null : failedAt.plus(RETRY_COOLDOWN);
        var result = new LinkedHashMap<String, Object>();
        result.put("code", examCode);
        result.put("question_count", FINAL_EXAM_CODE.equals(examCode) ? FINAL_QUESTION_COUNT : MODULE_QUESTION_COUNT);
        result.put("duration_minutes", durationMinutes(examCode));
        result.put("pass_score", passScore(examCode));
        result.put("attempts", ((Number) row.get("attempts")).intValue());
        result.put("passed", ((Number) row.get("passed")).intValue() == 1);
        result.put("best_score", row.get("best_score"));
        result.put("active_attempt_id", row.get("active_attempt_id"));
        result.put("cooldown_until", cooldownUntil != null && clock.instant().isBefore(cooldownUntil) ? cooldownUntil : null);
        result.put("ready", FINAL_EXAM_CODE.equals(examCode) ? allModulesPassed(userId) : practicesComplete(userId, examCode));
        return result;
    }

    private boolean allModulesPassed(long userId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(DISTINCT exam_code) FROM training_exam_attempts WHERE user_id = ? AND program_code = ? AND program_version = ? AND passed = TRUE AND exam_code <> ?",
            Integer.class, userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, FINAL_EXAM_CODE
        );
        return count != null && count >= MODULE_CODES.size();
    }

    private boolean practicesComplete(long userId, String examCode) {
        var completed = jdbcTemplate.queryForList(
            "SELECT item_code FROM training_item_progress WHERE user_id = ? AND program_code = ? AND program_version = ?",
            String.class, userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION
        );
        return completed.containsAll(REQUIRED_ITEMS.get(examCode));
    }

    private void expireOpenAttempts(long userId) {
        var ids = jdbcTemplate.queryForList(
            "SELECT id FROM training_exam_attempts WHERE user_id = ? AND program_code = ? AND program_version = ? AND status = 'IN_PROGRESS' AND expires_at <= ?",
            Long.class, userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, Timestamp.from(clock.instant())
        );
        for (var id : ids) submitInternal(requireAttempt(userId, id, true));
    }

    private Attempt findActiveAttempt(long userId, String examCode) {
        var rows = queryAttempts(
            "SELECT * FROM training_exam_attempts WHERE user_id = ? AND program_code = ? AND program_version = ? AND exam_code = ? AND status = 'IN_PROGRESS' ORDER BY id DESC LIMIT 1",
            userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION, examCode
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Attempt requireAttempt(long userId, long attemptId, boolean forUpdate) {
        var sql = "SELECT * FROM training_exam_attempts WHERE id = ? AND user_id = ?" + (forUpdate ? " FOR UPDATE" : "");
        var rows = queryAttempts(sql, attemptId, userId);
        if (rows.isEmpty()) throw new NoSuchElementException("La evaluación no existe.");
        return rows.getFirst();
    }

    private List<Attempt> queryAttempts(String sql, Object... args) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> new Attempt(
            rs.getLong("id"), rs.getLong("user_id"), rs.getString("exam_code"), rs.getInt("attempt_number"), rs.getString("status"),
            rs.getTimestamp("started_at").toInstant(), rs.getTimestamp("expires_at").toInstant(),
            rs.getTimestamp("submitted_at") == null ? null : rs.getTimestamp("submitted_at").toInstant(),
            readList(rs.getString("question_codes_json")), readAnswers(rs.getString("answers_json")),
            (Integer) rs.getObject("score"), rs.getInt("total_questions"), (Boolean) rs.getObject("passed")
        ), args);
    }

    private Map<String, Object> findCertificate(long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT c.folio, c.verification_token, c.program_version, c.final_score, c.total_questions, c.issued_at, c.expires_at,
                       c.status, COALESCE(NULLIF(u.full_name, ''), u.email) AS holder_name
                FROM training_certificates c JOIN users u ON u.id = c.user_id
                WHERE c.user_id = ? AND c.program_code = ? AND c.program_version = ? LIMIT 1
                """,
            (rs, rowNum) -> certificateMap(
                rs.getString("folio"), rs.getString("holder_name"), rs.getString("program_version"),
                rs.getInt("final_score"), rs.getInt("total_questions"), rs.getTimestamp("issued_at").toInstant(),
                rs.getTimestamp("expires_at").toInstant(), rs.getString("status"), rs.getString("verification_token")
            ), userId, TrainingProgramService.PROGRAM_CODE, TrainingProgramService.PROGRAM_VERSION
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Map<String, Object> certificateMap(String folio, String holderName, String version, int score, int total, Instant issuedAt, Instant expiresAt, String storedStatus, String verificationToken) {
        var status = "ACTIVE".equals(storedStatus) && clock.instant().isBefore(expiresAt) ? "ACTIVE" : "EXPIRED";
        var result = new LinkedHashMap<String, Object>();
        result.put("folio", folio);
        result.put("holder_name", holderName);
        result.put("program_version", version);
        result.put("final_score", score);
        result.put("total_questions", total);
        result.put("issued_at", issuedAt);
        result.put("expires_at", expiresAt);
        result.put("status", status);
        result.put("verification_path", "/certificates/verify/" + folio + "?token=" + verificationToken);
        return result;
    }

    private String normalizeExamCode(String raw) {
        var examCode = raw == null ? "" : raw.trim().toLowerCase();
        if (!MODULE_CODES.contains(examCode) && !FINAL_EXAM_CODE.equals(examCode)) throw new IllegalArgumentException("La evaluación solicitada no existe.");
        return examCode;
    }

    private int durationMinutes(String examCode) { return FINAL_EXAM_CODE.equals(examCode) ? FINAL_DURATION_MINUTES : MODULE_DURATION_MINUTES; }
    private int passScore(String examCode) { return FINAL_EXAM_CODE.equals(examCode) ? FINAL_PASS_SCORE : MODULE_PASS_SCORE; }

    private List<TrainingExamQuestionBank.Option> shuffledOptions(long attemptId, TrainingExamQuestionBank.Question question) {
        var options = new ArrayList<>(question.options());
        Collections.shuffle(options, new Random((attemptId * 31L) + question.code().hashCode()));
        return options;
    }

    private TrainingExamQuestionBank.Option resolveInternalOption(long attemptId, TrainingExamQuestionBank.Question question, String publicCode) {
        if (publicCode == null || !publicCode.startsWith("option-")) return null;
        try {
            int index = Integer.parseInt(publicCode.substring("option-".length())) - 1;
            var options = shuffledOptions(attemptId, question);
            return index >= 0 && index < options.size() ? options.get(index) : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private void requireInProgress(Attempt attempt) {
        if (!"IN_PROGRESS".equals(attempt.status())) throw new IllegalStateException("Esta evaluación ya fue enviada.");
    }

    private String writeJson(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception exception) { throw new IllegalStateException("No fue posible guardar la evaluación.", exception); }
    }

    private List<String> readList(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception exception) { throw new IllegalStateException("La evaluación guardada no es válida.", exception); }
    }

    private Map<String, String> readAnswers(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception exception) { throw new IllegalStateException("Las respuestas guardadas no son válidas.", exception); }
    }

    public record AnswerRequest(String questionCode, String optionCode) {}
    private record Attempt(long id, long userId, String examCode, int attemptNumber, String status, Instant startedAt,
                           Instant expiresAt, Instant submittedAt, List<String> questionCodes, Map<String, String> answers,
                           Integer score, int totalQuestions, Boolean passed) {}
}
