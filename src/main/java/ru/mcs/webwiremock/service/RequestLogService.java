package ru.mcs.webwiremock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.client.WiremockAdminClient;
import ru.mcs.webwiremock.dto.wiremock.LoggedRequest;
import ru.mcs.webwiremock.dto.wiremock.LoggedRequestsWrapper;

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

    public List<LoggedRequest> getRecentRequests(Integer limit) {
        int effectiveLimit = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;
        LoggedRequestsWrapper wrapper = wiremockAdminClient.getRequests(effectiveLimit, null);
        return wrapper.getRequests() != null ? wrapper.getRequests() : Collections.emptyList();
    }

    public List<LoggedRequest> getRequestsSince(int sinceMinutesAgo) {
        String since = DateTimeFormatter.ISO_INSTANT
                .format(Instant.now().minusSeconds((long) sinceMinutesAgo * 60));
        LoggedRequestsWrapper wrapper = wiremockAdminClient.getRequests(DEFAULT_LIMIT, since);
        return wrapper.getRequests() != null ? wrapper.getRequests() : Collections.emptyList();
    }

    public List<LoggedRequest> getUnmatchedRequests() {
        LoggedRequestsWrapper wrapper = wiremockAdminClient.getUnmatchedRequests();
        return wrapper.getRequests() != null ? wrapper.getRequests() : Collections.emptyList();
    }

    public void clearRequestLog() {
        log.info("Clearing WireMock request journal");
        wiremockAdminClient.clearRequests();
    }

    /**
     * Фильтрация на стороне нашего сервиса.
     * WireMock Admin API не поддерживает серверную фильтрацию по методу / URL / телу.
     *
     * @param method       HTTP-метод (GET, POST и т.д.), null = без фильтра
     * @param urlContains  подстрока в URL, null = без фильтра
     * @param bodyContains подстрока в теле запроса, null = без фильтра
     */
    public List<LoggedRequest> filterRequests(List<LoggedRequest> requests,
                                              String method,
                                              String urlContains,
                                              String bodyContains) {
        return requests.stream()
                .filter(r -> isBlank(method)
                        || method.equalsIgnoreCase(r.getMethod()))
                .filter(r -> isBlank(urlContains)
                        || (r.getUrl() != null && r.getUrl().contains(urlContains)))
                .filter(r -> isBlank(bodyContains)
                        || (r.getBody() != null && r.getBody().contains(bodyContains)))
                .toList();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
