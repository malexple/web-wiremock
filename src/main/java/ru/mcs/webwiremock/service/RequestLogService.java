package ru.mcs.webwiremock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.client.WiremockAdminClient;
import ru.mcs.webwiremock.dto.wiremock.LoggedRequestsWrapper;
import ru.mcs.webwiremock.dto.wiremock.ServeEvent;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RequestLogService {

    private static final int DEFAULT_LIMIT = 200;

    private final WiremockAdminClient wiremockAdminClient;

    public List<ServeEvent> getRecentRequests(Integer limit) {
        int effectiveLimit = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;
        LoggedRequestsWrapper wrapper = wiremockAdminClient.getRequests(effectiveLimit, null);
        return wrapper.getRequests() != null ? wrapper.getRequests() : Collections.emptyList();
    }

    public List<ServeEvent> getRequestsSince(int sinceMinutesAgo) {
        String since = DateTimeFormatter.ISO_INSTANT
                .format(Instant.now().minusSeconds((long) sinceMinutesAgo * 60));
        LoggedRequestsWrapper wrapper = wiremockAdminClient.getRequests(DEFAULT_LIMIT, since);
        return wrapper.getRequests() != null ? wrapper.getRequests() : Collections.emptyList();
    }

    public List<ServeEvent> getUnmatchedRequests() {
        LoggedRequestsWrapper wrapper = wiremockAdminClient.getUnmatchedRequests();
        return wrapper.getRequests() != null ? wrapper.getRequests() : Collections.emptyList();
    }

    public void clearRequestLog() {
        log.info("Clearing WireMock request journal");
        wiremockAdminClient.clearRequests();
    }

    /**
     * Фильтрация на стороне нашего сервиса.
     * Обращаемся к полям через event.getRequest().getXxx()
     */
    public List<ServeEvent> filterRequests(List<ServeEvent> events,
                                           String method,
                                           String urlContains,
                                           String bodyContains) {
        return events.stream()
                .filter(e -> isBlank(method)
                        || (e.getRequest() != null
                        && method.equalsIgnoreCase(e.getRequest().getMethod())))
                .filter(e -> isBlank(urlContains)
                        || (e.getRequest() != null && e.getRequest().getUrl() != null
                        && e.getRequest().getUrl().contains(urlContains)))
                .filter(e -> isBlank(bodyContains)
                        || (e.getRequest() != null && e.getRequest().getBody() != null
                        && e.getRequest().getBody().contains(bodyContains)))
                .toList();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
