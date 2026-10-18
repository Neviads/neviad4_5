package com.neviad.beneviadsystem.infrastructure.ai;

/**
 * Keeps the application startable in environments where AI credentials are absent.
 */
public final class UnavailableAiClient implements AiClient {

    @Override
    public String generate(String prompt) {
        throw new AiProviderUnavailableException(
                "Không có AI provider nào được cấu hình. Hãy đặt APP_AI_DEEPSEEK_API_KEY hoặc APP_AI_OPENAI_API_KEY."
        );
    }
}
