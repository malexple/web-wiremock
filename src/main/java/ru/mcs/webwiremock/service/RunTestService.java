package ru.mcs.webwiremock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import ru.mcs.webwiremock.dto.ui.RunTestRequest;
import ru.mcs.webwiremock.dto.ui.RunTestResponse;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RunTestService {

    private final RestClient runTestRestClient;

    public RunTestResponse execute(RunTestRequest request) {
        long start = System.currentTimeMillis();
        HttpMethod httpMethod = resolveMethod(request.getMethod());

        log.debug("RunTest → {} {}", httpMethod, request.getUrl());

        try {
            RestClient.RequestBodySpec spec = runTestRestClient
                    .method(httpMethod)
                    .uri(request.getUrl());

            // Выставляем заголовки из запроса
            if (request.getHeaders() != null) {
                request.getHeaders().forEach(spec::header);
            }

            // Добавляем тело только для методов, где это имеет смысл
            RestClient.RequestHeadersSpec<?> headersSpec = spec;
            if (request.getBody() != null && !request.getBody().isBlank()) {
                headersSpec = spec.body(request.getBody());
            }

            ResponseEntity<String> response = headersSpec
                    .retrieve()
                    // onStatus перехватывает 4xx/5xx без исключения
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {})
                    .toEntity(String.class);

            return buildResponse(response, System.currentTimeMillis() - start);

        } catch (Exception ex) {
            log.error("RunTest failed for URL={}: {}", request.getUrl(), ex.getMessage());
            return RunTestResponse.builder()
                    .statusCode(0)
                    .statusText("Connection error")
                    .responseBody(ex.getMessage())
                    .durationMs(System.currentTimeMillis() - start)
                    .success(false)
                    .build();
        }
    }

    private RunTestResponse buildResponse(ResponseEntity<String> response, long durationMs) {
        return RunTestResponse.builder()
                .statusCode(response.getStatusCode().value())
                .statusText(response.getStatusCode().toString())
                .responseHeaders(flattenHeaders(response.getHeaders()))
                .responseBody(response.getBody())
                .durationMs(durationMs)
                .success(response.getStatusCode().is2xxSuccessful())
                .build();
    }

    private HttpMethod resolveMethod(String method) {
        if (method == null) return HttpMethod.GET;
        return switch (method.toUpperCase()) {
            case "POST"    -> HttpMethod.POST;
            case "PUT"     -> HttpMethod.PUT;
            case "DELETE"  -> HttpMethod.DELETE;
            case "PATCH"   -> HttpMethod.PATCH;
            case "HEAD"    -> HttpMethod.HEAD;
            case "OPTIONS" -> HttpMethod.OPTIONS;
            default        -> HttpMethod.GET;
        };
    }

    private Map<String, String> flattenHeaders(HttpHeaders headers) {
        if (headers == null) return Map.of();
        Map<String, String> flat = new HashMap<>();
        headers.forEach((key, values) -> flat.put(key, String.join(", ", values)));
        return flat;
    }
}