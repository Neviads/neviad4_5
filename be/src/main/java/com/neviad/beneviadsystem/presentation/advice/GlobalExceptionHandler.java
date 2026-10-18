package com.neviad.beneviadsystem.presentation.advice;

import java.time.Instant;
import java.util.Map;

import com.neviad.beneviadsystem.infrastructure.ai.AiProviderUnavailableException;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleInvalidRequest(Exception exception) {
        String message = "JSON không hợp lệ hoặc sai kiểu dữ liệu.";
        if (exception instanceof MethodArgumentNotValidException validationException) {
            message = validationException.getBindingResult().getFieldErrors().stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(java.util.stream.Collectors.joining("; "));
        }
        return Map.of("status", 400, "error", "Bad Request", "message", message);
    }

    @ExceptionHandler(AiProviderUnavailableException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Map<String, Object> handleAiProviderUnavailable(AiProviderUnavailableException exception) {
        return Map.of(
                "status", HttpStatus.SERVICE_UNAVAILABLE.value(),
                "error", "AI Provider Unavailable",
                "message", exception.getMessage()
        );
    }

    @ExceptionHandler(InvalidAgentResponseException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public Map<String, Object> handleInvalidAgentResponse(InvalidAgentResponseException exception) {
        return Map.of(
                "status", HttpStatus.BAD_GATEWAY.value(),
                "error", "Invalid AI Response",
                "message", exception.getMessage()
        );
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, Object> handleUnexpectedException(Exception exception) {
        return Map.of(
                "timestamp", Instant.now(),
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "error", "Internal Server Error",
                "message", exception.getMessage() == null ? "Unexpected error" : exception.getMessage());
    }
}
