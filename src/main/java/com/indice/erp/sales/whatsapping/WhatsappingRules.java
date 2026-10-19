package com.indice.erp.sales.whatsapping;

import com.google.i18n.phonenumbers.PhoneNumberUtil;
import java.net.URI;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class WhatsappingRules {
  static final Set<String> VARIABLES =
      Set.of("name", "clientCompany", "seller", "company", "offer", "link");
  private static final Pattern TOKEN = Pattern.compile("\\{\\{\\s*([^{}]+?)\\s*}}");

  static void require(boolean valid, HttpStatus status, String code) {
    if (!valid) throw new ResponseStatusException(status, "whatsapping_" + code);
  }

  static void id(String id) {
    try {
      require(UUID.fromString(id).toString().equals(id), HttpStatus.BAD_REQUEST, "invalid_id");
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "whatsapping_invalid_id");
    }
  }

  static String phone(String raw, String region) {
    try {
      var util = PhoneNumberUtil.getInstance();
      var parsed = util.parse(raw, region);
      if (parsed.hasExtension() || !util.isValidNumber(parsed)) return "";
      return util.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
    } catch (Exception e) {
      return "";
    }
  }

  static boolean validRegion(String region) {
    return PhoneNumberUtil.getInstance().getSupportedRegions().contains(region);
  }

  static void template(String body) {
    var matcher = TOKEN.matcher(body);
    while (matcher.find())
      require(
          VARIABLES.contains(matcher.group(1).trim()), HttpStatus.BAD_REQUEST, "unknown_variable");
    var rest = matcher.replaceAll("");
    require(
        !rest.contains("{{") && !rest.contains("}}"), HttpStatus.BAD_REQUEST, "unknown_variable");
  }

  static String render(String body, Map<String, String> values) {
    var matcher = TOKEN.matcher(body);
    var result = new StringBuffer();
    while (matcher.find()) {
      String value = values.getOrDefault(matcher.group(1).trim(), "");
      matcher.appendReplacement(
          result,
          java.util.regex.Matcher.quoteReplacement(value.isBlank() ? matcher.group() : value));
    }
    matcher.appendTail(result);
    return result.toString();
  }

  static boolean unresolved(String text) {
    return text.contains("{{") || text.contains("}}");
  }

  static boolean resource(String text) {
    if (text.isBlank()) return true;
    try {
      URI uri = URI.create(text);
      String host = uri.getHost();
      return "https".equalsIgnoreCase(uri.getScheme())
          && host != null
          && host.contains(".")
          && uri.getUserInfo() == null
          && !host.equalsIgnoreCase("localhost")
          && !host.endsWith(".local")
          && !host.matches("[0-9.]+")
          && !host.contains(":");
    } catch (IllegalArgumentException e) {
      return false;
    }
  }

  static String term(String text) {
    return "%" + text.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
  }
}
