package ru.mcs.webwiremock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.client.WiremockAdminClient;
import ru.mcs.webwiremock.dto.ui.ApiTreeNode;
import ru.mcs.webwiremock.dto.ui.ClientInfo;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.dto.wiremock.StubMappingsWrapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StubService {

    /**
     * Приоритет клиентского стаба (с JWT-матчером).
     * Меньшее значение = выше приоритет в WireMock.
     */
    public static final int CLIENT_STUB_PRIORITY = 1;

    /**
     * Приоритет прокси-стаба (catch-all).
     * Срабатывает только если клиентский стаб не совпал.
     */
    public static final int PROXY_STUB_PRIORITY = 10;

    private final WiremockAdminClient wiremockAdminClient;
    private final ApiTreeService apiTreeService;

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public List<StubMapping> getAllStubs() {
        StubMappingsWrapper wrapper = wiremockAdminClient.getAllMappings(null, null);
        return wrapper.getMappings() != null ? wrapper.getMappings() : Collections.emptyList();
    }

    public StubMapping getStubById(String id) {
        return wiremockAdminClient.getMappingById(id);
    }

    /**
     * Создаёт стаб. Если стаб содержит JWT customMatcher — автоматически
     * выставляет высокий приоритет CLIENT_STUB_PRIORITY = 1.
     */
    public StubMapping createStub(StubMapping stub) {
        if (hasJwtMatcher(stub)) {
            stub.setPriority(CLIENT_STUB_PRIORITY);
        }
        log.debug("Creating stub: {}", stub.getName());
        return wiremockAdminClient.createMapping(stub);
    }

    /**
     * Обновляет стаб. Id в теле выставляем из path-параметра.
     */
    public StubMapping updateStub(String id, StubMapping stub) {
        stub.setId(id);
        if (hasJwtMatcher(stub)) {
            stub.setPriority(CLIENT_STUB_PRIORITY);
        }
        log.debug("Updating stub id={}", id);
        return wiremockAdminClient.updateMapping(id, stub);
    }

    public void deleteStub(String id) {
        log.debug("Deleting stub id={}", id);
        wiremockAdminClient.deleteMapping(id);
    }

    // ── Фильтрация ────────────────────────────────────────────────────────────

    /**
     * Возвращает отфильтрованный список стабов.
     *
     * @param clientId точное совпадение metadata.clientId, null = без фильтра
     * @param urlPath  подстрока в эффективном URL-пути стаба, null = без фильтра
     */
    public List<StubMapping> filterStubs(String clientId, String urlPath) {
        return getAllStubs().stream()
                .filter(stub -> matchesClient(stub, clientId))
                .filter(stub -> matchesPath(stub, urlPath))
                .toList();
    }

    // ── Клиенты ───────────────────────────────────────────────────────────────

    /**
     * Собирает уникальных клиентов из metadata всех стабов.
     * Дедупликация по clientId, сохранение порядка первого вхождения.
     */
    public List<ClientInfo> getClients() {
        Map<String, ClientInfo> map = new LinkedHashMap<>();
        for (StubMapping stub : getAllStubs()) {
            if (stub.getMetadata() == null || stub.getMetadata().getClientId() == null) continue;
            String cid = stub.getMetadata().getClientId();
            map.putIfAbsent(cid, ClientInfo.builder()
                    .clientId(cid)
                    .clientName(stub.getMetadata().getClientName())
                    .build());
        }
        return new ArrayList<>(map.values());
    }

    // ── Дерево ────────────────────────────────────────────────────────────────

    public List<ApiTreeNode> buildStubTree(List<StubMapping> stubs) {
        return apiTreeService.buildTree(stubs);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean matchesClient(StubMapping stub, String clientId) {
        if (clientId == null || clientId.isBlank()) return true;
        if (stub.getMetadata() == null) return false;
        return clientId.equals(stub.getMetadata().getClientId());
    }

    private boolean matchesPath(StubMapping stub, String urlPath) {
        if (urlPath == null || urlPath.isBlank()) return true;
        String effectivePath = apiTreeService.extractEffectivePath(stub.getRequest());
        return effectivePath.contains(urlPath);
    }

    private boolean hasJwtMatcher(StubMapping stub) {
        return stub.getRequest() != null
                && stub.getRequest().getCustomMatcher() != null
                && stub.getRequest().getCustomMatcher().getName() != null;
    }
}