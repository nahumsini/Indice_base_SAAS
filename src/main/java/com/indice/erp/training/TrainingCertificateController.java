package com.indice.erp.training;

import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/training-certificates")
public class TrainingCertificateController {
    private final TrainingExamService exams;

    public TrainingCertificateController(TrainingExamService exams) {
        this.exams = exams;
    }

    @GetMapping("/{folio}")
    public ResponseEntity<?> verify(@PathVariable String folio, @RequestParam String token) {
        try {
            return ResponseEntity.ok(exams.verifyCertificate(folio, token));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No se pudo validar el certificado."));
        }
    }
}
