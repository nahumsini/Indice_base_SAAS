package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.MetaLeadImportDtos.ImportResponse;
import com.indice.erp.sales.MetaLeadImportDtos.ImportedContactResponse;
import com.indice.erp.sales.MetaLeadImportDtos.ProviderLead;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MetaLeadImportPersistenceService {

    private final MetaLeadImportRepository repository;
    private final SalesService salesService;

    MetaLeadImportPersistenceService(MetaLeadImportRepository repository, SalesService salesService) {
        this.repository = repository;
        this.salesService = salesService;
    }

    @Transactional
    ImportResponse persist(AuthSessionUser actor, List<ProviderLead> leads) {
        var leadIds = new LinkedHashSet<String>();
        leads.stream().map(ProviderLead::id).filter(id -> id != null && !id.isBlank()).forEach(leadIds::add);
        var previouslyImportedIds = new LinkedHashSet<>(repository.findImportedLeadIds(actor.companyId(), leadIds));
        var identities = repository.listContactIdentities(actor.companyId());
        var contactByIdentity = new LinkedHashMap<String, Long>();
        identities.forEach(identity -> addIdentityKeys(contactByIdentity, identity.id(), identity.email(), identity.phone()));

        var importedContacts = new ArrayList<ImportedContactResponse>();
        var skippedPreviouslyImported = 0;
        var skippedDuplicates = 0;
        var skippedInvalid = 0;

        for (var lead : leads) {
            if (lead.id() == null || lead.id().isBlank()) {
                skippedInvalid += 1;
                continue;
            }
            if (previouslyImportedIds.contains(lead.id())) {
                skippedPreviouslyImported += 1;
                continue;
            }

            var contactDraft = toContactDraft(actor, lead);
            if (!contactDraft.valid()) {
                skippedInvalid += 1;
                continue;
            }

            var duplicateId = findDuplicateId(contactByIdentity, contactDraft.email(), contactDraft.phone());
            if (duplicateId != null) {
                repository.recordImport(actor.companyId(), actor.userId(), duplicateId, lead);
                previouslyImportedIds.add(lead.id());
                skippedDuplicates += 1;
                continue;
            }

            var saved = salesService.create(actor.companyId(), actor.userId(), "contacts", contactDraft.payload());
            var contactId = number(saved.get("id"));
            if (contactId == null) {
                throw new IllegalStateException("The imported contact did not receive an identifier.");
            }
            repository.recordImport(actor.companyId(), actor.userId(), contactId, lead);
            previouslyImportedIds.add(lead.id());
            addIdentityKeys(contactByIdentity, contactId, contactDraft.email(), contactDraft.phone());
            importedContacts.add(new ImportedContactResponse(
                    contactId,
                    text(saved.get("contactCode")),
                    text(saved.get("contactPerson")),
                    text(saved.get("email")),
                    text(saved.get("phone"))));
        }

        return new ImportResponse(
                leads.size(),
                importedContacts.size(),
                skippedPreviouslyImported,
                skippedDuplicates,
                skippedInvalid,
                List.copyOf(importedContacts));
    }

    private ContactDraft toContactDraft(AuthSessionUser actor, ProviderLead lead) {
        var email = firstField(lead, "email");
        var phone = firstField(lead, "phone_number", "phone", "mobile_phone");
        var fullName = firstField(lead, "full_name", "name");
        if (fullName.isBlank()) {
            fullName = String.join(" ", List.of(
                    firstField(lead, "first_name"),
                    firstField(lead, "last_name"))).trim();
        }
        var company = firstField(lead, "company_name", "company", "business_name");
        var role = firstField(lead, "job_title", "job_position", "position");
        var valid = !email.isBlank() || !phone.isBlank() || !fullName.isBlank() || !company.isBlank();
        if (!valid) {
            return new ContactDraft(Map.of(), email, phone, false);
        }

        var contactPerson = firstNonBlank(fullName, company, email, phone, "Meta lead");
        var companyName = firstNonBlank(company, fullName, contactPerson, "Meta lead");
        var metaFields = new LinkedHashMap<String, Object>();
        metaFields.put("leadId", lead.id());
        metaFields.put("pageId", lead.pageId());
        metaFields.put("formId", lead.formId());
        metaFields.put("formName", lead.formName());
        metaFields.put("campaignId", lead.campaignId());
        metaFields.put("campaignName", lead.campaignName());
        metaFields.put("adId", lead.adId());
        metaFields.put("adName", lead.adName());
        metaFields.put("createdAt", lead.sourceCreatedAt() == null ? "" : lead.sourceCreatedAt().toString());
        metaFields.put("answers", lead.fields());

        var customFields = new LinkedHashMap<String, Object>();
        customFields.put("role", bounded(role, 180));
        customFields.put("metaLead", metaFields);

        var payload = new LinkedHashMap<String, Object>();
        payload.put("companyName", bounded(companyName, 220));
        payload.put("contactPerson", bounded(contactPerson, 180));
        payload.put("phone", bounded(phone, 80));
        payload.put("email", bounded(email, 220));
        payload.put("source", "social_media");
        payload.put("status", "active");
        if (actor.userCompanyId() != null) {
            payload.put("ownerUserCompanyId", actor.userCompanyId());
        }
        payload.put("ownerName", bounded(actor.userName(), 180));
        payload.put("tags", List.of("Meta Lead Ads"));
        payload.put("customFields", customFields);
        return new ContactDraft(payload, email, phone, true);
    }

    private static Long findDuplicateId(Map<String, Long> contactByIdentity, String email, String phone) {
        var emailKey = emailKey(email);
        if (!emailKey.isBlank() && contactByIdentity.containsKey(emailKey)) {
            return contactByIdentity.get(emailKey);
        }
        var phoneKey = phoneKey(phone);
        return !phoneKey.isBlank() ? contactByIdentity.get(phoneKey) : null;
    }

    private static void addIdentityKeys(Map<String, Long> target, long contactId, String email, String phone) {
        var normalizedEmail = emailKey(email);
        if (!normalizedEmail.isBlank()) {
            target.putIfAbsent(normalizedEmail, contactId);
        }
        var normalizedPhone = phoneKey(phone);
        if (!normalizedPhone.isBlank()) {
            target.putIfAbsent(normalizedPhone, contactId);
        }
    }

    private static String firstField(ProviderLead lead, String... names) {
        for (var name : names) {
            var values = lead.fields().get(name);
            if (values != null) {
                for (var value : values) {
                    if (value != null && !value.isBlank()) {
                        return value.trim();
                    }
                }
            }
        }
        return "";
    }

    private static String firstNonBlank(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private static String emailKey(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? "" : "email:" + normalized;
    }

    private static String phoneKey(String value) {
        var normalized = value == null ? "" : value.replaceAll("[^0-9]", "");
        return normalized.isBlank() ? "" : "phone:" + normalized;
    }

    private static String bounded(String value, int maximumLength) {
        var normalized = value == null ? "" : value.trim();
        return normalized.length() <= maximumLength ? normalized : normalized.substring(0, maximumLength);
    }

    private static Long number(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private record ContactDraft(Map<String, Object> payload, String email, String phone, boolean valid) {
    }
}
