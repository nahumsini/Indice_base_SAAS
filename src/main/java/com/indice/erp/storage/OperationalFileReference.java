package com.indice.erp.storage;

/** Passive metadata only. Object keys remain internal to authorized owner ports. */
public record OperationalFileReference(long id, String fileName, String mimeType, long sizeBytes, String objectKey) {}
