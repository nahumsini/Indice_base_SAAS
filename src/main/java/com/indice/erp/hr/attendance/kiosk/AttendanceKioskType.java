package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.models.LocationRow;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public final class AttendanceKioskType {

    public static final String METADATA_KEY = "kiosk_type";
    public static final String BUSINESS_UNIT = "business_unit";
    public static final String CONTRACT_SITE = "contract_site";
    public static final String HEAD_OFFICE = "head_office";
    public static final String OPEN_ATTENDANCE = "open_attendance";
    private static final Set<String> HEAD_OFFICE_EXACT_KEYS = Set.of(
        "corporateoffice",
        "oficinacorporativa",
        "sedecorporativa",
        "headquarter",
        "headquarters",
        "headoffice",
        "mainoffice",
        "oficinacentral"
    );
    private static final Set<String> HEAD_OFFICE_CONTAINS_KEYS = Set.of(
        "corporateoffice",
        "oficinacorporativa",
        "sedecorporativa",
        "headoffice",
        "mainoffice",
        "oficinacentral"
    );

    private AttendanceKioskType() {
    }

    public static String normalize(Object value) {
        if (value == null) {
            return null;
        }
        var normalized = String.valueOf(value).trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (normalized.isBlank() || "null".equals(normalized)) {
            return null;
        }
        return switch (normalized) {
            case "business", "unit", "business_unit", "business_unit_kiosk" -> BUSINESS_UNIT;
            case "contract", "contract_site", "contract_site_kiosk", "site" -> CONTRACT_SITE;
            case "hq", "headquarters", "head_office", "head_office_kiosk", "holding", "holding_identity" -> HEAD_OFFICE;
            case "open", "open_attendance", "open_attendance_kiosk", "open_kiosk", "unrestricted" -> OPEN_ATTENDANCE;
            default -> throw new IllegalArgumentException("Unsupported kiosk type.");
        };
    }

    public static String fromMetadata(Map<String, Object> metadata) {
        var kioskType = normalize(metadata.get(METADATA_KEY));
        return kioskType == null ? BUSINESS_UNIT : kioskType;
    }

    public static String infer(LocationRow location) {
        var managedSource = safe(location == null ? null : location.managedSource()).toLowerCase(Locale.ROOT);
        if ("contract_site".equals(managedSource)) {
            return CONTRACT_SITE;
        }
        if ("business_structure".equals(managedSource) && isHeadOfficeLocation(location)) {
            return HEAD_OFFICE;
        }
        return BUSINESS_UNIT;
    }

    public static void validateLocationPurpose(String kioskType, LocationRow location) {
        if (location == null) {
            throw new IllegalArgumentException("Kiosk check-in location is required.");
        }
        if ("inactive".equalsIgnoreCase(location.status())) {
            throw new IllegalArgumentException("Kiosk check-in location must be active.");
        }

        var managedSource = safe(location.managedSource()).toLowerCase(Locale.ROOT);
        if (CONTRACT_SITE.equals(kioskType)) {
            if (!"contract_site".equals(managedSource)) {
                throw new IllegalArgumentException("Contract site kiosks must use a contract site location.");
            }
            return;
        }
        if (HEAD_OFFICE.equals(kioskType)) {
            if (!"business_structure".equals(managedSource) || !isHeadOfficeLocation(location)) {
                throw new IllegalArgumentException("Head office kiosks must use the company head office location.");
            }
            return;
        }
        if (!"business_structure".equals(managedSource) || location.businessId() == null) {
            throw new IllegalArgumentException("Business / Unit kiosks must use a business attendance location.");
        }
    }

    private static boolean isHeadOfficeLocation(LocationRow location) {
        if (location == null) {
            return false;
        }
        if (location.businessId() == null) {
            return true;
        }

        return hasHeadOfficeName(location.name())
            || hasHeadOfficeName(location.unitName())
            || hasHeadOfficeName(location.businessName());
    }

    private static boolean hasHeadOfficeName(String value) {
        var normalized = normalizeNameKey(value);
        if (normalized.isBlank()) {
            return false;
        }
        return HEAD_OFFICE_EXACT_KEYS.contains(normalized)
            || HEAD_OFFICE_CONTAINS_KEYS.stream().anyMatch(normalized::contains);
    }

    private static String normalizeNameKey(String value) {
        if (isBlank(value)) {
            return "";
        }
        return Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^a-z0-9]+", "");
    }
}
