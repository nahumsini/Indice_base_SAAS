package com.indice.erp.meetings;

import java.util.NoSuchElementException;
import java.time.DateTimeException;
import org.springframework.dao.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(basePackageClasses=MeetingController.class)
public class MeetingExceptionHandler {
    public record Error(String code,String message) { }
    @ExceptionHandler(MeetingPlanningException.class) public ResponseEntity<Error> planning(MeetingPlanningException exception){return ResponseEntity.badRequest().body(new Error(exception.code(),"Check the meeting planning fields."));}
    @ExceptionHandler(NoSuchElementException.class) public ResponseEntity<Error> missing(){return ResponseEntity.status(404).body(new Error("meeting_unavailable","Meeting resource unavailable."));}
    @ExceptionHandler(SecurityException.class) public ResponseEntity<Error> forbidden(){return ResponseEntity.status(403).body(new Error("meeting_forbidden","Meeting access denied."));}
    @ExceptionHandler({IllegalStateException.class,DataIntegrityViolationException.class,TransientDataAccessException.class}) public ResponseEntity<Error> conflict(){return ResponseEntity.status(409).body(new Error("meeting_conflict","Record changed. Reload before continuing."));}
    @ExceptionHandler({IllegalArgumentException.class,DateTimeException.class}) public ResponseEntity<Error> invalid(){return ResponseEntity.badRequest().body(new Error("meeting_invalid","Check the meeting fields."));}
}
