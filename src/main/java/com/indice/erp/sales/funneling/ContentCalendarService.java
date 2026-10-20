package com.indice.erp.sales.funneling;

import static com.indice.erp.sales.funneling.ContentCalendarContracts.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.auth.AuthSessionUser;
import jakarta.validation.Validator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ContentCalendarService {
    private final ContentCalendarRepository repository;
    private final FunnelRepository funnels;
    private final ModuleAccessService modules;
    private final Validator validator;
    public ContentCalendarService(ContentCalendarRepository repository, FunnelRepository funnels, ModuleAccessService modules, Validator validator) {
        this.repository = repository; this.funnels = funnels; this.modules = modules; this.validator = validator;
    }
    @Transactional(readOnly = true)
    public ContentCalendarContracts.Calendar get(AuthSessionUser actor, String funnel) {
        require(funnels.find(actor.companyId(), funnel).isPresent(), HttpStatus.NOT_FOUND, "funnel_not_found");
        return repository.find(actor, funnel).map(ContentCalendarRepository.Stored::calendar)
            .orElseGet(() -> new ContentCalendarContracts.Calendar(new Document("UTC", null, List.of()), 0, null, ContentCalendarRepository.actorKey(actor)));
    }
    @Transactional
    public ContentCalendarContracts.Calendar save(AuthSessionUser actor, String funnel, String expectedActor, Input input) {
        require(ContentCalendarRepository.actorKey(actor).equals(expectedActor), HttpStatus.CONFLICT, "content_calendar_actor_changed");
        require(input != null && validator.validate(input).isEmpty(), HttpStatus.BAD_REQUEST, "content_calendar_invalid");
        uuid(input.mutationId());
        funnels.lockCompany(actor.companyId());
        require(modules.companyCanAccessForMutation(actor.companyId(), "crm"), HttpStatus.FORBIDDEN, "funnel_module_unavailable");
        require(funnels.find(actor.companyId(), funnel).isPresent(), HttpStatus.NOT_FOUND, "funnel_not_found");
        validate(input.content());
        String json = repository.encode(input.content());
        require(json.getBytes(StandardCharsets.UTF_8).length <= 512 * 1024, HttpStatus.BAD_REQUEST, "content_calendar_too_large");
        String digest = digest(json);
        var previous = repository.find(actor, funnel);
        if (previous.isPresent() && previous.get().mutationId().equals(input.mutationId())) {
            require(previous.get().digest().equals(digest) && previous.get().calendar().version() == input.version() + 1,
                HttpStatus.CONFLICT, "content_calendar_conflict");
            return previous.get().calendar();
        }
        require(previous.map(row -> row.calendar().version()).orElse(0L) == input.version(), HttpStatus.CONFLICT, "content_calendar_conflict");
        // Entries are retained, including cancelled/published work; no hard-delete lifecycle.
        previous.ifPresent(row -> require(input.content().entries().stream().map(Entry::id).collect(java.util.stream.Collectors.toSet())
            .containsAll(row.calendar().content().entries().stream().map(Entry::id).toList()),
            HttpStatus.BAD_REQUEST, "content_calendar_keep_history"));
        repository.save(actor, funnel, input, json, digest);
        return get(actor, funnel);
    }
    private void validate(Document doc) {
        try {
            require(ZoneId.getAvailableZoneIds().contains(doc.timeZone()), HttpStatus.BAD_REQUEST, "content_calendar_invalid");
            ZoneId zone = ZoneId.of(doc.timeZone());
            var ids = new HashSet<String>();
            for (Entry entry : doc.entries()) {
                uuid(entry.id());
                require(ids.add(entry.id()) && compatible(entry.channel(), entry.format()), HttpStatus.BAD_REQUEST, "content_calendar_invalid");
                boolean dated = entry.date() != null && !entry.date().isBlank();
                require(dated || Set.of("IDEA", "CANCELLED").contains(entry.status()), HttpStatus.BAD_REQUEST, "content_calendar_date_required");
                require(dated || entry.time() == null || entry.time().isBlank(), HttpStatus.BAD_REQUEST, "content_calendar_invalid");
                if (dated) {
                    LocalDate date = date(entry.date());
                    if (entry.time() != null && !entry.time().isBlank()) {
                        LocalTime time = time(entry.time());
                        require(!zone.getRules().getValidOffsets(date.atTime(time)).isEmpty(), HttpStatus.BAD_REQUEST, "content_calendar_time_invalid");
                    }
                }
                require(entry.reference().isBlank() || entry.reference().matches("https?://[^\\s]+"), HttpStatus.BAD_REQUEST, "content_calendar_invalid");
            }
            var settings = doc.settings();
            if (settings != null) {
                require(date(settings.startDate()).plusDays(settings.weeks() * 7L - 1).getYear() <= 2100,
                    HttpStatus.BAD_REQUEST, "content_calendar_invalid");
                time(settings.time());
                require(new HashSet<>(settings.days()).size() == settings.days().size()
                    && new HashSet<>(settings.channels()).size() == settings.channels().size()
                    && new HashSet<>(settings.formats()).size() == settings.formats().size()
                    && settings.channels().stream().allMatch(channel -> settings.formats().stream().anyMatch(format -> compatible(channel, format)))
                    && settings.formats().stream().allMatch(format -> settings.channels().stream().anyMatch(channel -> compatible(channel, format))),
                    HttpStatus.BAD_REQUEST, "content_calendar_invalid");
            }
        } catch (DateTimeException invalid) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content_calendar_time_invalid"); }
    }
    private LocalDate date(String text) {
        LocalDate value = LocalDate.parse(text);
        require(value.toString().equals(text) && value.getYear() >= 2000 && value.getYear() <= 2100, HttpStatus.BAD_REQUEST, "content_calendar_invalid");
        return value;
    }
    private LocalTime time(String text) {
        require(text.matches("\\d{2}:\\d{2}"), HttpStatus.BAD_REQUEST, "content_calendar_invalid");
        return LocalTime.parse(text);
    }
    static boolean compatible(String channel, String format) { return "GOOGLE_SEARCH".equals(channel) == "SEARCH_AD".equals(format); }
    private static void uuid(String id) {
        try { require(id != null && UUID.fromString(id).toString().equals(id), HttpStatus.BAD_REQUEST, "content_calendar_invalid"); }
        catch (IllegalArgumentException invalid) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content_calendar_invalid"); }
    }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private static void require(boolean ok, HttpStatus status, String code) { if (!ok) throw new ResponseStatusException(status, code); }
}
