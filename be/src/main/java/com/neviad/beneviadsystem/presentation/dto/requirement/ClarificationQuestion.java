package com.neviad.beneviadsystem.presentation.dto.requirement;

import java.util.List;

public record ClarificationQuestion(
        String topic,
        String text,
        List<String> suggestions
) {
    public ClarificationQuestion {
        suggestions = suggestions == null ? List.of() : List.copyOf(suggestions);
    }
}
