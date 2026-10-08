package com.indice.erp.scheduling;

import java.util.NoSuchElementException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(basePackageClasses=SchedulingController.class)
public class SchedulingExceptionHandler {
    public record Error(String code,String message) { }
    @ExceptionHandler(NoSuchElementException.class) public ResponseEntity<Error> missing(){
        return ResponseEntity.status(404).body(new Error("scheduling_unavailable","Scheduling resource unavailable."));
    }
    @ExceptionHandler(SecurityException.class) public ResponseEntity<Error> forbidden(){
        return ResponseEntity.status(403).body(new Error("scheduling_forbidden","Scheduling access denied."));
    }
    @ExceptionHandler({IllegalStateException.class,DataIntegrityViolationException.class,org.springframework.dao.TransientDataAccessException.class}) public ResponseEntity<Error> conflict(){
        return ResponseEntity.status(409).body(new Error("scheduling_conflict","Availability or record changed. Reload before continuing."));
    }
    @ExceptionHandler({IllegalArgumentException.class,java.time.DateTimeException.class}) public ResponseEntity<Error> invalid(){
        return ResponseEntity.badRequest().body(new Error("scheduling_invalid","Check the scheduling fields."));
    }
}
