package com.indice.erp.learning;
import java.lang.annotation.*;
/** Opt-in owner contract: annotate only mutations that return after successful durable completion. */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LearningApplied {
    String value() default "";
    String pathVariable() default "";
    String[] chaptersByValue() default {};
}
