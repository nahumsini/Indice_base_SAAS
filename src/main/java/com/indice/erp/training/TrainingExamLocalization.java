package com.indice.erp.training;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Localizes only the authorized attempt view; the question bank and answer key stay on the server. */
final class TrainingExamLocalization {
    private static final List<String> LOCALES = List.of("en-CA", "fr-CA", "pt-BR", "ko-CA", "zh-CA");
    private static final Map<String, Map<String, QuestionCopy>> COPIES = loadCopies();

    private TrainingExamLocalization() {}

    static Map<String, Object> localize(Map<String, Object> attempt, String requestedLocale) {
        String locale = resolveLocale(requestedLocale);
        if (locale.startsWith("es") || !(attempt.get("questions") instanceof List<?> questions)) return attempt;
        Map<String, QuestionCopy> copy = COPIES.get(locale);
        var localizedQuestions = new ArrayList<Map<String, Object>>();
        for (Object value : questions) {
            if (!(value instanceof Map<?, ?> question)) throw new IllegalStateException("Invalid exam question view");
            String code = String.valueOf(question.get("code"));
            var original = TrainingExamQuestionBank.find(code);
            var translated = copy.get(code);
            var localized = copyMap(question);
            localized.put("prompt", translated.prompt());
            var options = new ArrayList<Map<String, Object>>();
            for (Object optionValue : (List<?>) question.get("options")) {
                var option = (Map<?, ?>) optionValue;
                // Public option codes are shuffled per attempt. Never infer the answer from their order.
                var source = original.options().stream()
                    .filter(candidate -> candidate.label().equals(option.get("label")))
                    .findFirst().orElseThrow(() -> new IllegalStateException("Invalid exam option view"));
                var localizedOption = copyMap(option);
                localizedOption.put("label", translated.options().get(source.code()));
                options.add(localizedOption);
            }
            localized.put("options", options);
            localizedQuestions.add(localized);
        }
        var result = new LinkedHashMap<>(attempt);
        result.put("questions", localizedQuestions);
        return result;
    }

    static String resolveLocale(String locale) {
        if ("es-MX".equals(locale) || "es-CO".equals(locale)) return locale;
        if ("en-US".equals(locale)) return "en-CA";
        return locale != null && LOCALES.contains(locale) ? locale : "en-CA";
    }

    static Map<String, QuestionCopy> copyFor(String locale) {
        return COPIES.get(resolveLocale(locale));
    }

    private static Map<String, Object> copyMap(Map<?, ?> source) {
        var result = new LinkedHashMap<String, Object>();
        source.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    private static Map<String, Map<String, QuestionCopy>> loadCopies() {
        var mapper = new ObjectMapper();
        var result = new LinkedHashMap<String, Map<String, QuestionCopy>>();
        for (String locale : LOCALES) {
            String resource = "/training/translations/" + locale + ".json";
            try (var input = TrainingExamLocalization.class.getResourceAsStream(resource)) {
                if (input == null) throw new IllegalStateException("Missing training locale: " + locale);
                List<QuestionCopy> entries = mapper.readValue(input, new TypeReference<>() {});
                var copy = new LinkedHashMap<String, QuestionCopy>();
                for (var entry : entries) {
                    if (copy.putIfAbsent(entry.code(), entry) != null) throw new IllegalStateException("Duplicate training translation");
                }
                for (String module : TrainingExamQuestionBank.moduleExamCodes()) {
                    for (var question : TrainingExamQuestionBank.bank(module)) {
                        var translated = copy.get(question.code());
                        if (translated == null || translated.prompt() == null || translated.prompt().isBlank()
                            || translated.options() == null || translated.options().size() != question.options().size()
                            || question.options().stream().anyMatch(option -> translated.options().get(option.code()) == null
                                || translated.options().get(option.code()).isBlank())) {
                            throw new IllegalStateException("Incomplete training translation: " + locale);
                        }
                    }
                }
                result.put(locale, Map.copyOf(copy));
            } catch (IOException exception) {
                throw new IllegalStateException("Invalid training locale: " + locale, exception);
            }
        }
        return Map.copyOf(result);
    }

    record QuestionCopy(String code, String prompt, Map<String, String> options) {}
}
