package com.neviad.beneviadsystem.domain.model;

/** One stored source file of a collection, its path relative to the collection's root (e.g. {@code shared/view-transform.ts}). */
public record SourceFile(String path, String content) { }
