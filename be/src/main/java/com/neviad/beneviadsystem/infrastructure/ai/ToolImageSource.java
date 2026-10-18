package com.neviad.beneviadsystem.infrastructure.ai;

import java.util.List;

/**
 * A tool callback that can attach pictures to its latest result, for example screenshots of the scene a check just
 * ran. Providers that can show images to the model read them with {@link #takeImages()} right after the call;
 * providers that cannot simply never call it and the model only sees the text result.
 */
public interface ToolImageSource {
    /** {@code dataUrl} is a complete {@code data:image/...;base64,...} URL; {@code label} says what the picture shows. */
    record Image(String label, String dataUrl) { }

    /** Returns the pictures attached to the last result and forgets them, so a picture is never shown twice. */
    List<Image> takeImages();
}
