package com.indice.erp.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import org.junit.jupiter.api.Test;

class TrainingExamQuestionBankTest {

    @Test
    void providesTwentyFiveUniqueQuestionsForEveryCertificationStage() {
        assertThat(TrainingExamQuestionBank.moduleExamCodes()).containsExactlyInAnyOrder(
            "indice", "rh", "procesos", "finanzas", "ventas", "kpis", "comercial"
        );
        var allCodes = new HashSet<String>();
        for (var moduleCode : TrainingExamQuestionBank.moduleExamCodes()) {
            var bank = TrainingExamQuestionBank.bank(moduleCode);
            assertThat(bank).hasSize(25);
            assertThat(bank).allSatisfy(question -> {
                assertThat(question.prompt()).isNotBlank();
                assertThat(question.options()).hasSize(3);
                assertThat(question.options()).extracting(TrainingExamQuestionBank.Option::code).contains(question.correctOptionCode());
                assertThat(allCodes.add(question.code())).isTrue();
            });
        }
        assertThat(allCodes).hasSize(175);
    }
}
