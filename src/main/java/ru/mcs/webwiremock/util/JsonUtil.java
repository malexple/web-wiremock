package ru.mcs.webwiremock.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JsonUtil {

    private final ObjectMapper objectMapper;

    public String toHtmlSafeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value)
                    .replace("</", "<\\/");
        } catch (JsonProcessingException e) {
            return "null";
        }
    }
}