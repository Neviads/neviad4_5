package com.neviad.beneviadsystem.service.agent.tools.livecode;

import com.neviad.beneviadsystem.config.WebSocketConfig;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.http.HttpMessageConvertersAutoConfiguration;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.DispatcherServletAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.ServletWebServerFactoryAutoConfiguration;
import org.springframework.boot.autoconfigure.websocket.servlet.WebSocketMessagingAutoConfiguration;
import org.springframework.boot.autoconfigure.websocket.servlet.WebSocketServletAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * Minimal real server for the live code bridge: the production WebSocket/STOMP config and the bridge beans,
 * without the database, security or AI wiring of the full application.
 */
@Configuration(proxyBeanMethods = false)
@ImportAutoConfiguration({
        ServletWebServerFactoryAutoConfiguration.class, DispatcherServletAutoConfiguration.class,
        WebSocketServletAutoConfiguration.class, WebSocketMessagingAutoConfiguration.class,
        JacksonAutoConfiguration.class, HttpMessageConvertersAutoConfiguration.class})
@Import({WebSocketConfig.class, StompLiveCodeBridge.class, LiveCodeMessageHandler.class})
public class LiveCodeTestApp {
}
