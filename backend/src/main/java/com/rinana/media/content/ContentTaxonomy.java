package com.rinana.media.content;

import com.rinana.media.auth.ApiException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

final class ContentTaxonomy {
  private static final int MAX_CATEGORY_LENGTH = 80;
  private static final int MAX_TAG_LENGTH = 40;
  private static final int MAX_TAG_COUNT = 12;

  private ContentTaxonomy() {
  }

  static String normalizeCategory(String category) {
    if (category == null) {
      return null;
    }

    String normalized = category.trim();
    if (normalized.isEmpty()) {
      return null;
    }

    if (normalized.length() > MAX_CATEGORY_LENGTH) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TAXONOMY", "Category is too long");
    }

    return normalized;
  }

  static String serializeTags(List<String> tags) {
    List<String> normalizedTags = normalizeTags(tags);
    if (normalizedTags.isEmpty()) {
      return null;
    }

    return "," + String.join(",", normalizedTags) + ",";
  }

  static List<String> parseTags(String serializedTags) {
    if (serializedTags == null || serializedTags.isBlank()) {
      return List.of();
    }

    return List.of(serializedTags.split(",")).stream()
      .map(String::trim)
      .filter(tag -> !tag.isEmpty())
      .toList();
  }

  static String tagFilterKey(String tag) {
    if (tag == null || tag.isBlank()) {
      return "";
    }

    List<String> normalizedTags = normalizeTags(List.of(tag));
    return normalizedTags.isEmpty() ? "" : "," + normalizedTags.get(0) + ",";
  }

  private static List<String> normalizeTags(List<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return List.of();
    }

    LinkedHashSet<String> seen = new LinkedHashSet<>();
    for (String tag : tags) {
      if (tag == null) {
        continue;
      }

      String normalized = tag.trim().replace(",", "").toLowerCase(Locale.ROOT);
      if (normalized.isEmpty()) {
        continue;
      }

      if (normalized.length() > MAX_TAG_LENGTH) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TAXONOMY", "Tag is too long");
      }

      seen.add(normalized);
      if (seen.size() > MAX_TAG_COUNT) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TAXONOMY", "Too many tags");
      }
    }

    return new ArrayList<>(seen);
  }
}
