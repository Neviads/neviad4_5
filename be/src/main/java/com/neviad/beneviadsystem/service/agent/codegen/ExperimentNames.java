package com.neviad.beneviadsystem.service.agent.codegen;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Every name and path of one generated experiment, derived from its slug, so the code agents, the engine smoke test and the
 * frontend registry agree on them.
 */
public record ExperimentNames(String slug, String pascal, String camel, String snake) {
    private static final Pattern SLUG = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    public static final int MAX_SLUG = 40;

    public static ExperimentNames of(String slug) {
        if (slug == null || slug.length() < 3 || slug.length() > MAX_SLUG || !SLUG.matcher(slug).matches()) {
            throw new IllegalArgumentException("slug phải gồm chữ thường, số và dấu gạch ngang, dài 3 đến " + MAX_SLUG + " ký tự: " + slug);
        }
        String pascal = Arrays.stream(slug.split("-")).map(word -> Character.toUpperCase(word.charAt(0)) + word.substring(1)).collect(Collectors.joining());
        // A TypeScript identifier cannot start with a digit.
        if (Character.isDigit(pascal.charAt(0))) pascal = "E" + pascal;
        return new ExperimentNames(slug, pascal, Character.toLowerCase(pascal.charAt(0)) + pascal.substring(1), slug.toUpperCase().replace('-', '_'));
    }

    /** A slug from a Vietnamese title: no accents, lower case, hyphens, at most {@value #MAX_SLUG} characters. */
    public static String slugify(String title) {
        String text = title == null ? "" : title.replace('đ', 'd').replace('Đ', 'D');
        text = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").toLowerCase();
        text = text.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (text.length() > MAX_SLUG) text = text.substring(0, MAX_SLUG).replaceAll("-+$", "");
        return text.length() < 3 ? "thi-nghiem" : text;
    }

    public List<String> engineFiles() {
        return List.of(engineFile());
    }

    /** The whole engine of the experiment: types, constants, state machine and physics in one file. */
    public String engineFile() {
        return "engines/" + slug + "/engine.ts";
    }

    public List<String> rendererFiles() {
        return List.of("renderers/" + slug + "/view-constants.ts", "renderers/" + slug + "/" + slug + "-scene.tsx");
    }

    public List<String> experimentFiles() {
        return List.of("experiments/" + pascal + "Experiment.tsx", "presets/" + slug + ".ts");
    }
}
