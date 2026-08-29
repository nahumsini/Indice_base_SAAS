package com.indice.erp.training;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-admin/training")
public class PlatformTrainingController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final TrainingProgramService training;
    private final TrainingResourceService resources;
    private final TrainingExamService exams;

    public PlatformTrainingController(SessionAuthService auth, SessionCsrfService csrf, TrainingProgramService training, TrainingResourceService resources, TrainingExamService exams) {
        this.auth = auth;
        this.csrf = csrf;
        this.training = training;
        this.resources = resources;
        this.exams = exams;
    }

    @GetMapping("/exams")
    public ResponseEntity<?> exams(HttpSession session) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            training.platformWorkspace(actor.userId());
            return ResponseEntity.ok(exams.summary(actor.userId()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping("/exams/{examCode}/start")
    public ResponseEntity<?> startExam(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable String examCode) {
        return examMutation(session, csrfToken, actorId -> exams.start(actorId, examCode));
    }

    @GetMapping("/exams/attempts/{attemptId}")
    public ResponseEntity<?> examAttempt(HttpSession session, @PathVariable long attemptId) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            training.platformWorkspace(actor.userId());
            return ResponseEntity.ok(exams.attempt(actor.userId(), attemptId));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", safeMessage(exception)));
        }
    }

    @PatchMapping("/exams/attempts/{attemptId}/answers")
    public ResponseEntity<?> saveExamAnswer(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable long attemptId, @RequestBody TrainingExamService.AnswerRequest request) {
        return examMutation(session, csrfToken, actorId -> exams.saveAnswer(actorId, attemptId, request));
    }

    @PostMapping("/exams/attempts/{attemptId}/submit")
    public ResponseEntity<?> submitExam(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable long attemptId) {
        return examMutation(session, csrfToken, actorId -> exams.submit(actorId, attemptId));
    }

    @GetMapping("/certificate")
    public ResponseEntity<?> certificate(HttpSession session) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            training.platformWorkspace(actor.userId());
            return ResponseEntity.ok(exams.certificate(actor.userId()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", safeMessage(exception)));
        }
    }

    private ResponseEntity<?> examMutation(HttpSession session, String csrfToken, java.util.function.LongFunction<Map<String, Object>> action) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            csrf.requireCsrf(session, csrfToken);
            training.platformWorkspace(actor.userId());
            return ResponseEntity.ok(action.apply(actor.userId()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", safeMessage(exception)));
        }
    }

    @GetMapping("/resources/{resourceId}/{format}")
    public ResponseEntity<?> resource(
        HttpSession session,
        @PathVariable String resourceId,
        @PathVariable String format,
        @RequestParam(defaultValue = "false") boolean download
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            var file = resources.platformResource(actor.userId(), resourceId, format);
            var disposition = download ? ContentDisposition.attachment() : ContentDisposition.inline();
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.filename(file.filename(), StandardCharsets.UTF_8).build().toString())
                .contentType(file.mediaType())
                .body(file.content());
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> workspace(HttpSession session) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(training.platformWorkspace(actor.userId()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        }
    }

    @PatchMapping("/progress")
    public ResponseEntity<?> updateProgress(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody TrainingProgramService.ProgressRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(training.updatePlatformProgress(actor.userId(), request));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", safeMessage(exception)));
        }
    }

    @PostMapping("/assessment")
    public ResponseEntity<?> validateAssessment(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody TrainingProgramService.AssessmentRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(training.validatePlatformAssessment(actor.userId(), request));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", safeMessage(exception)));
        }
    }

    private String safeMessage(RuntimeException exception) {
        return exception.getMessage() == null ? "No fue posible guardar el avance." : exception.getMessage();
    }
}
