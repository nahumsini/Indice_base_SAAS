package com.indice.erp.dashboard.personalperformance;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PersonalPerformanceService {

    private static final List<String> SECTION_ORDER = List.of(
        "sleep_recovery",
        "nutrition_energy",
        "stress_clarity",
        "balance_sustainability"
    );
    private static final Set<String> SECTION_KEYS = Set.copyOf(SECTION_ORDER);
    private static final Set<String> VALID_STATUSES = Set.of("draft", "in_progress", "completed");
    private static final Map<String, String> DEFAULT_UI_KEYS = Map.of(
        "sleep_recovery", "sleep_recovery",
        "nutrition_energy", "nutrition_energy",
        "stress_clarity", "stress_clarity",
        "balance_sustainability", "balance_sustainability"
    );
    private static final int DEFAULT_QUESTION_COUNT = 10;
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final TypeReference<LinkedHashMap<String, Object>> JSON_MAP_TYPE = new TypeReference<>() {
    };

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PersonalPerformanceService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> getPersonalPerformance(long userId, long companyId) {
        var profile = loadProfileByUserId(userId);
        if (profile == null) {
            return buildResponse(new ProfileRow(null, userId, companyId, 1, "draft", null, null), Map.of());
        }

        return buildResponse(profile, loadSections(profile.id()));
    }

    @Transactional
    public Map<String, Object> savePersonalPerformance(long userId, long companyId, Map<String, Object> payload) {
        var profile = loadProfileByUserId(userId);
        var profileId = profile == null ? createProfile(userId, companyId) : profile.id();
        var now = LocalDateTime.now();

        var sectionsPayload = readSectionsPayload(payload);
        for (var entry : sectionsPayload.entrySet()) {
            var sectionKey = normalizeSectionKey(entry.getKey());
            var sectionPayload = asMap(entry.getValue(), "sections." + sectionKey);
            var data = normalizeSectionData(sectionKey, sectionPayload.get("data"), now);
            var sectionStatus = normalizeStatus(
                stringValue(sectionPayload.get("status")),
                deriveSectionStatus(data)
            );
            var completedAt = resolveCompletedAt(sectionStatus, stringValue(sectionPayload.get("completed_at")), data);
            upsertSection(profileId, sectionKey, sectionStatus, completedAt, data);
        }

        var savedSections = loadSections(profileId);
        var derivedProfileStatus = deriveProfileStatus(savedSections);
        var profileCompletedAt = "completed".equals(derivedProfileStatus) ? latestCompletedAt(savedSections) : null;

        updateProfile(profileId, companyId, derivedProfileStatus, profileCompletedAt);

        var savedProfile = loadProfileById(profileId);
        if (savedProfile == null) {
            throw new IllegalStateException("Personal performance profile was saved but could not be reloaded.");
        }

        return buildResponse(savedProfile, savedSections);
    }

    private ProfileRow loadProfileByUserId(long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, user_id, company_id, version, status, started_at, completed_at
                FROM user_personal_performance_profiles
                WHERE user_id = ?
                ORDER BY version DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new ProfileRow(
                rs.getLong("id"),
                rs.getLong("user_id"),
                rs.getLong("company_id"),
                rs.getInt("version"),
                safe(rs.getString("status"), "draft"),
                toLocalDateTime(rs.getTimestamp("started_at")),
                toLocalDateTime(rs.getTimestamp("completed_at"))
            ),
            userId
        );

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private ProfileRow loadProfileById(long profileId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, user_id, company_id, version, status, started_at, completed_at
                FROM user_personal_performance_profiles
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ProfileRow(
                rs.getLong("id"),
                rs.getLong("user_id"),
                rs.getLong("company_id"),
                rs.getInt("version"),
                safe(rs.getString("status"), "draft"),
                toLocalDateTime(rs.getTimestamp("started_at")),
                toLocalDateTime(rs.getTimestamp("completed_at"))
            ),
            profileId
        );

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private long createProfile(long userId, long companyId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        var now = LocalDateTime.now();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_personal_performance_profiles
                    (user_id, company_id, version, status, started_at)
                    VALUES (?, ?, 1, 'draft', ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, userId);
            statement.setLong(2, companyId);
            statement.setObject(3, now);
            return statement;
        }, keyHolder);

        if (keyHolder.getKey() == null) {
            throw new IllegalStateException("Personal performance profile row could not be created.");
        }

        return keyHolder.getKey().longValue();
    }

    private Map<String, SectionRow> loadSections(long profileId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, section_key, status, completed_at, data
                FROM user_personal_performance_answers
                WHERE personal_performance_profile_id = ?
                ORDER BY CASE section_key
                    WHEN 'sleep_recovery' THEN 1
                    WHEN 'nutrition_energy' THEN 2
                    WHEN 'stress_clarity' THEN 3
                    WHEN 'balance_sustainability' THEN 4
                    ELSE 99
                END, id ASC
                """,
            (rs, rowNum) -> new SectionRow(
                rs.getLong("id"),
                rs.getString("section_key"),
                safe(rs.getString("status"), "draft"),
                toLocalDateTime(rs.getTimestamp("completed_at")),
                normalizeStoredSectionData(rs.getString("section_key"), parseJsonMap(rs.getString("data")))
            ),
            profileId
        );

        var sections = new LinkedHashMap<String, SectionRow>();
        for (var row : rows) {
            sections.put(row.sectionKey(), row);
        }
        return sections;
    }

    private void updateProfile(long profileId, long companyId, String status, LocalDateTime completedAt) {
        jdbcTemplate.update(
            """
                UPDATE user_personal_performance_profiles
                SET company_id = ?, status = ?, completed_at = ?
                WHERE id = ?
                """,
            companyId,
            status,
            completedAt,
            profileId
        );
    }

    private void upsertSection(
        long profileId,
        String sectionKey,
        String status,
        LocalDateTime completedAt,
        Map<String, Object> data
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO user_personal_performance_answers
                (personal_performance_profile_id, section_key, status, completed_at, data)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    completed_at = VALUES(completed_at),
                    data = VALUES(data),
                    updated_at = CURRENT_TIMESTAMP
                """,
            profileId,
            sectionKey,
            status,
            completedAt,
            serializeJson(data)
        );
    }

    private Map<String, Object> buildResponse(ProfileRow profile, Map<String, SectionRow> savedSections) {
        var profileMap = new LinkedHashMap<String, Object>();
        profileMap.put("id", profile.id());
        profileMap.put("user_id", profile.userId());
        profileMap.put("company_id", profile.companyId());
        profileMap.put("version", profile.version());
        profileMap.put("status", profile.status());
        profileMap.put("started_at", formatDateTime(profile.startedAt()));
        profileMap.put("completed_at", formatDateTime(profile.completedAt()));

        var sectionsMap = new LinkedHashMap<String, Object>();
        for (var sectionKey : SECTION_ORDER) {
            var row = savedSections.get(sectionKey);
            sectionsMap.put(sectionKey, toSectionPayload(sectionKey, row));
        }

        var response = new LinkedHashMap<String, Object>();
        response.put("profile", profileMap);
        response.put("sections", sectionsMap);
        return response;
    }

    private Map<String, Object> toSectionPayload(String sectionKey, SectionRow row) {
        var section = new LinkedHashMap<String, Object>();
        section.put("id", row == null ? null : row.id());
        section.put("section_key", sectionKey);
        section.put("status", row == null ? "draft" : row.status());
        section.put("completed_at", row == null ? null : formatDateTime(row.completedAt()));
        section.put("data", row == null ? defaultSectionData(sectionKey) : row.data());
        return section;
    }

    private Map<String, Object> readSectionsPayload(Map<String, Object> payload) {
        var rawSections = payload.get("sections");
        if (rawSections == null) {
            return Map.of();
        }
        return asMap(rawSections, "sections");
    }

    private String deriveProfileStatus(Map<String, SectionRow> sections) {
        if (sections.isEmpty()) {
            return "draft";
        }

        var allCompleted = true;
        var hasProgress = false;
        for (var section : sections.values()) {
            if (!"completed".equals(section.status())) {
                allCompleted = false;
            }

            var answeredCount = readInt(section.data().get("answered_count"), 0, "answered_count");
            if (answeredCount > 0 || !"draft".equals(section.status())) {
                hasProgress = true;
            }
        }

        if (allCompleted && sections.keySet().containsAll(SECTION_KEYS)) {
            return "completed";
        }
        if (hasProgress) {
            return "in_progress";
        }
        return "draft";
    }

    private LocalDateTime latestCompletedAt(Map<String, SectionRow> sections) {
        LocalDateTime latest = null;
        for (var section : sections.values()) {
            if (section.completedAt() != null && (latest == null || section.completedAt().isAfter(latest))) {
                latest = section.completedAt();
            }
        }
        return latest;
    }

    private String deriveSectionStatus(Map<String, Object> data) {
        var answeredCount = readInt(data.get("answered_count"), 0, "answered_count");
        var questionCount = readInt(data.get("question_count"), DEFAULT_QUESTION_COUNT, "question_count");
        if (answeredCount <= 0) {
            return "draft";
        }
        if (answeredCount >= questionCount) {
            return "completed";
        }
        return "in_progress";
    }

    private LocalDateTime resolveCompletedAt(String status, String rawCompletedAt, Map<String, Object> data) {
        if (!"completed".equals(status)) {
            return null;
        }

        if (!rawCompletedAt.isBlank()) {
            return parseDateTime(rawCompletedAt, "completed_at");
        }

        var savedAt = stringValue(data.get("saved_at"));
        if (!savedAt.isBlank()) {
            return parseDateTime(savedAt, "data.saved_at");
        }

        return LocalDateTime.now();
    }

    private Map<String, Object> normalizeStoredSectionData(String sectionKey, Map<String, Object> storedData) {
        return normalizeSectionData(sectionKey, storedData, LocalDateTime.now());
    }

    private Map<String, Object> normalizeSectionData(String sectionKey, Object rawData, LocalDateTime defaultSavedAt) {
        var source = rawData == null ? Map.<String, Object>of() : asMap(rawData, "data");
        var normalized = new LinkedHashMap<String, Object>();
        for (var entry : source.entrySet()) {
            if (!Set.of("answers", "ui_key", "saved_at", "answered_count", "question_count").contains(entry.getKey())) {
                normalized.put(entry.getKey(), entry.getValue());
            }
        }

        var answers = normalizeAnswers(source.get("answers"), sectionKey);
        var questionCount = readInt(source.get("question_count"), DEFAULT_QUESTION_COUNT, "data.question_count");
        if (questionCount <= 0) {
            throw new IllegalArgumentException("data.question_count must be greater than zero.");
        }

        normalized.put("ui_key", firstNonBlank(stringValue(source.get("ui_key")), DEFAULT_UI_KEYS.get(sectionKey)));
        normalized.put("answers", answers);
        normalized.put("answered_count", answers.size());
        normalized.put("question_count", questionCount);

        var savedAt = stringValue(source.get("saved_at")).isBlank()
            ? defaultSavedAt
            : parseDateTime(stringValue(source.get("saved_at")), "data.saved_at");
        normalized.put("saved_at", formatDateTime(savedAt));

        return normalized;
    }

    private Map<String, Integer> normalizeAnswers(Object rawAnswers, String sectionKey) {
        var answers = new LinkedHashMap<String, Integer>();
        if (rawAnswers == null) {
            return answers;
        }

        if (!(rawAnswers instanceof Map<?, ?> rawMap)) {
            throw new IllegalArgumentException("data.answers must be an object for section " + sectionKey + ".");
        }

        for (var entry : rawMap.entrySet()) {
            var key = String.valueOf(entry.getKey()).trim();
            if (key.isBlank()) {
                throw new IllegalArgumentException("Answer keys must not be blank for section " + sectionKey + ".");
            }

            var value = readInt(entry.getValue(), -1, "data.answers." + key);
            if (value < 1 || value > 4) {
                throw new IllegalArgumentException("Answer values must be between 1 and 4 for section " + sectionKey + ".");
            }

            answers.put(key, value);
        }

        return answers;
    }

    private String normalizeSectionKey(String rawSectionKey) {
        var normalized = rawSectionKey == null ? "" : rawSectionKey.trim().toLowerCase();
        if (!SECTION_KEYS.contains(normalized)) {
            throw new IllegalArgumentException("Unknown personal performance section: " + rawSectionKey);
        }
        return normalized;
    }

    private String normalizeStatus(String rawStatus, String defaultStatus) {
        var normalized = rawStatus == null ? "" : rawStatus.trim().toLowerCase();
        if (normalized.isBlank()) {
            return defaultStatus;
        }
        if (!VALID_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid personal performance status: " + rawStatus);
        }
        return normalized;
    }

    private Map<String, Object> defaultSectionData(String sectionKey) {
        var data = new LinkedHashMap<String, Object>();
        data.put("ui_key", DEFAULT_UI_KEYS.get(sectionKey));
        data.put("answers", new LinkedHashMap<String, Integer>());
        data.put("saved_at", null);
        data.put("answered_count", 0);
        data.put("question_count", DEFAULT_QUESTION_COUNT);
        return data;
    }

    private Map<String, Object> parseJsonMap(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return new LinkedHashMap<>();
        }

        try {
            return objectMapper.readValue(rawJson, JSON_MAP_TYPE);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Stored personal performance section JSON is invalid.", ex);
        }
    }

    private String serializeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Personal performance payload could not be serialized.", ex);
        }
    }

    private Map<String, Object> asMap(Object value, String fieldName) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            throw new IllegalArgumentException(fieldName + " must be an object.");
        }

        var normalized = new LinkedHashMap<String, Object>();
        for (var entry : rawMap.entrySet()) {
            normalized.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        return normalized;
    }

    private int readInt(Object value, int defaultValue, String fieldName) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String string && !string.isBlank()) {
            try {
                return Integer.parseInt(string.trim());
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(fieldName + " must be numeric.");
            }
        }
        throw new IllegalArgumentException(fieldName + " must be numeric.");
    }

    private LocalDateTime parseDateTime(String rawValue, String fieldName) {
        var value = rawValue == null ? "" : rawValue.trim();
        if (value.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDateTime.parse(value, TIMESTAMP_FORMAT);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException(fieldName + " must use ISO date-time or YYYY-MM-DD HH:MM:SS format.");
            }
        }
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? null : value.format(TIMESTAMP_FORMAT);
    }

    private LocalDateTime toLocalDateTime(Timestamp value) {
        return value == null ? null : value.toLocalDateTime();
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String firstNonBlank(String left, String right) {
        return left != null && !left.isBlank() ? left : right;
    }

    private String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private record ProfileRow(
        Long id,
        long userId,
        long companyId,
        int version,
        String status,
        LocalDateTime startedAt,
        LocalDateTime completedAt
    ) {
    }

    private record SectionRow(
        Long id,
        String sectionKey,
        String status,
        LocalDateTime completedAt,
        Map<String, Object> data
    ) {
    }
}
