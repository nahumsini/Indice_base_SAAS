package com.indice.erp.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TrainingExamLocalizationTest {
    @Test
    void everyLanguageHasEveryPromptAndOptionWithoutChangingQuestionIdentity() {
        for (String locale : List.of("en-CA", "en-US", "fr-CA", "pt-BR", "ko-CA", "zh-CA")) {
            var copy = TrainingExamLocalization.copyFor(locale);
            assertThat(copy).hasSize(175);
            for (String module : TrainingExamQuestionBank.moduleExamCodes()) {
                for (var source : TrainingExamQuestionBank.bank(module)) {
                    var translated = copy.get(source.code());
                    assertThat(translated.code()).isEqualTo(source.code());
                    assertThat(translated.prompt()).isNotBlank().isNotEqualTo(source.prompt());
                    assertThat(translated.options()).containsOnlyKeys("a", "b", "c");
                    assertThat(translated.options().values()).allSatisfy(value -> assertThat(value).isNotBlank());
                }
            }
        }
    }

    @Test
    void preservesShuffledPublicOptionCodesAnswersAndScoringWhileLocalizingOnlySelectedQuestions() {
        var source = TrainingExamQuestionBank.find("indice.q01");
        Map<String, Object> question = Map.of("code", source.code(), "prompt", source.prompt(), "options", List.of(
            Map.of("code", "option-1", "label", source.options().get(2).label()),
            Map.of("code", "option-2", "label", source.options().get(0).label()),
            Map.of("code", "option-3", "label", source.options().get(1).label())
        ));
        Map<String, Object> attempt = Map.of("id", 77L, "questions", List.of(question), "status", "IN_PROGRESS",
            "answers", Map.of(source.code(), "option-2"), "answered_count", 1, "pass_score", 16);
        var translated = TrainingExamLocalization.copyFor("fr-CA").get(source.code());
        var localized = TrainingExamLocalization.localize(attempt, "fr-CA");
        assertThat(localized).containsEntry("id", 77L).containsEntry("status", "IN_PROGRESS")
            .containsEntry("answers", attempt.get("answers")).containsEntry("answered_count", 1).containsEntry("pass_score", 16);
        assertThat(localized.keySet()).isEqualTo(attempt.keySet());
        var questions = (List<?>) localized.get("questions");
        assertThat(questions).hasSize(1);
        assertThat((Map<?, ?>) questions.getFirst()).isEqualTo(Map.of("code", source.code(), "prompt", translated.prompt(), "options", List.of(
            Map.of("code", "option-1", "label", translated.options().get("c")),
            Map.of("code", "option-2", "label", translated.options().get("a")),
            Map.of("code", "option-3", "label", translated.options().get("b"))
        )));
        assertThat(question.get("prompt")).isEqualTo(source.prompt());
        assertThat(attempt.get("questions")).isEqualTo(List.of(question));
    }

    @Test
    void handlesEverySupportedRegionAndDefaultsUnsupportedLocalesToCanadianEnglish() {
        assertThat(TrainingExamLocalization.resolveLocale("en-US")).isEqualTo("en-CA");
        for (String locale : List.of("en-CA", "fr-CA", "pt-BR", "ko-CA", "zh-CA", "es-MX", "es-CO")) {
            assertThat(TrainingExamLocalization.resolveLocale(locale)).isEqualTo(locale);
        }
        assertThat(TrainingExamLocalization.resolveLocale(null)).isEqualTo("en-CA");
        assertThat(TrainingExamLocalization.resolveLocale("../../arbitrary")).isEqualTo("en-CA");
        Map<String, Object> view = Map.of("questions", List.of(), "status", "IN_PROGRESS");
        assertThat(TrainingExamLocalization.localize(view, "es-MX")).isSameAs(view);
        assertThat(TrainingExamLocalization.localize(view, "es-CO")).isSameAs(view);
    }
}
