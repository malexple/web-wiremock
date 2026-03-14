package ru.mcs.webwiremock.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.client.WiremockAdminClient;
import ru.mcs.webwiremock.dto.ui.*;
import ru.mcs.webwiremock.dto.wiremock.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScenarioService {

    private final WiremockAdminClient wiremockAdminClient;
    private final ObjectMapper objectMapper;

    // ─── Список всех сценариев ────────────────────────────────

    public List<ScenarioInfo> getAllScenarios() {
        ScenariosWrapper wrapper = wiremockAdminClient.getAllScenarios();
        List<WiremockScenario> wmScenarios = wrapper.getScenarios() != null
                ? wrapper.getScenarios() : Collections.emptyList();
        if (wmScenarios.isEmpty()) return Collections.emptyList();

        Map<String, List<StubMapping>> stubsByScenario = loadStubsByScenario();

        return wmScenarios.stream()
                .map(wm -> buildScenarioInfo(wm,
                        stubsByScenario.getOrDefault(wm.getName(), Collections.emptyList())))
                .sorted(Comparator.comparing(ScenarioInfo::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    // ─── Один сценарий ────────────────────────────────────────

    public ScenarioInfo getScenario(String name) {
        WiremockScenario wm = findWmScenario(name);
        List<StubMapping> stubs = loadStubsByScenario()
                .getOrDefault(name, Collections.emptyList());
        return buildScenarioInfo(wm, stubs);
    }

    // ─── Создать новый сценарий ───────────────────────────────

    public ScenarioInfo createScenario(CreateScenarioRequest req) {
        if (req.getSteps() == null || req.getSteps().isEmpty())
            throw new IllegalArgumentException("Сценарий должен содержать хотя бы один шаг");

        List<CreateScenarioStepRequest> steps = req.getSteps();

        // Строим цепочку состояний: Started → label2 → label3 → null
        List<String> stateChain = buildStateChain(steps);

        for (int i = 0; i < steps.size(); i++) {
            CreateScenarioStepRequest stepReq = steps.get(i);
            String requiredState = stateChain.get(i);
            String newState      = (i + 1 < stateChain.size()) ? stateChain.get(i + 1) : null;

            StubMapping stub = resolveStub(stepReq, req.getExternalId());

            // Устанавливаем сценарные поля
            stub.setScenarioName(req.getScenarioName());
            stub.setRequiredScenarioState(requiredState);
            stub.setNewScenarioState(newState);

            // Обновляем имя стаба для читаемости в списке Stubs
            String stepLabel = requiredState.equals("Started") ? "Step 1" : requiredState;
            stub.setName(String.format("🎬 %s | %s | %s %s → %d",
                    req.getScenarioName(),
                    stepLabel,
                    stub.getRequest() != null ? nvl(stub.getRequest().getMethod(), "?") : "?",
                    stub.getRequest() != null ? nvl(extractUrl(stub), "?") : "?",
                    stub.getResponse() != null && stub.getResponse().getStatus() != null
                            ? stub.getResponse().getStatus() : 200));

            // Обновляем metadata
            if (req.getExternalId() != null && !req.getExternalId().isBlank()) {
                StubMetadata meta = stub.getMetadata() != null
                        ? stub.getMetadata() : StubMetadata.builder().build();
                meta.setClientId(req.getExternalId());
                stub.setMetadata(meta);
            }

            // Сбрасываем UUID чтобы WireMock создал новый стаб (не перезаписал оригинал)
            stub.setId(null);

            wiremockAdminClient.createMapping(stub);
            log.info("Created scenario stub: scenario='{}' step={} state='{}'→'{}'",
                    req.getScenarioName(), i + 1, requiredState, newState);
        }

        return getScenario(req.getScenarioName());
    }

    // ─── Управление состоянием ────────────────────────────────

    public void resetScenario(String name) {
        wiremockAdminClient.setScenarioState(name,
                ScenarioSetStateRequest.builder().state("Started").build());
        log.info("Reset scenario '{}' to Started", name);
    }

    public void resetAllScenarios() {
        wiremockAdminClient.resetAllScenarios();
        log.info("Reset all scenarios to Started");
    }

    public void setScenarioState(String name, String state) {
        wiremockAdminClient.setScenarioState(name,
                ScenarioSetStateRequest.builder().state(state).build());
        log.info("Set scenario '{}' state → '{}'", name, state);
    }

    // ─── Удаление ─────────────────────────────────────────────

    public int deleteScenario(String name) {
        List<StubMapping> stubs = loadStubsByScenario()
                .getOrDefault(name, Collections.emptyList());
        stubs.forEach(s -> wiremockAdminClient.deleteMapping(s.getId()));
        log.info("Deleted scenario '{}' ({} stubs)", name, stubs.size());
        return stubs.size();
    }

    // ─── Экспорт ──────────────────────────────────────────────

    public ProfileBundle exportScenario(String name) {
        List<StubMapping> stubs = loadStubsByScenario()
                .getOrDefault(name, Collections.emptyList());
        return ProfileBundle.builder()
                .name("scenario-" + name)
                .description("Scenario: " + name)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .stubs(stubs)
                .build();
    }

    // ─── Список стабов для выбора в мастере ──────────────────

    public List<StubMapping> getAvailableStubs() {
        StubMappingsWrapper wrapper = wiremockAdminClient.getAllMappings(1000, 0);
        return wrapper.getMappings() != null ? wrapper.getMappings() : Collections.emptyList();
    }

    // ─── Private helpers ──────────────────────────────────────

    private List<String> buildStateChain(List<CreateScenarioStepRequest> steps) {
        List<String> chain = new ArrayList<>();
        chain.add("Started"); // Шаг 1 всегда Started
        for (int i = 1; i < steps.size(); i++) {
            String label = steps.get(i).getStateLabel();
            if (label == null || label.isBlank()) label = "Step " + (i + 1);
            chain.add(label);
        }
        return chain;
    }

    /**
     * Получить стаб: клонировать существующий или создать новый.
     */
    private StubMapping resolveStub(CreateScenarioStepRequest stepReq, String externalId) {
        if (stepReq.getSourceStubId() != null && !stepReq.getSourceStubId().isBlank()) {
            // Клонируем существующий стаб
            StubMapping source = wiremockAdminClient.getMappingById(stepReq.getSourceStubId());
            // Глубокое копирование через Jackson в поле — просто копируем объект
            return StubMapping.builder()
                    .name(source.getName())
                    .priority(source.getPriority())
                    .persistent(source.getPersistent())
                    .request(source.getRequest())
                    .response(source.getResponse())
                    .metadata(source.getMetadata())
                    .build();
        }

        // Создаём новый стаб из полей формы
        String method      = nvl(stepReq.getMethod(), "GET");
        String urlPath     = nvl(stepReq.getUrlPath(), "/");
        int status         = stepReq.getResponseStatus() != null ? stepReq.getResponseStatus() : 200;
        String body        = nvl(stepReq.getResponseBody(), "");
        String contentType = nvl(stepReq.getContentType(), "application/json");

        StubMappingRequest request = StubMappingRequest.builder()
                .method(method)
                .urlPath(urlPath)
                .build();

        StubMappingResponse response = StubMappingResponse.builder()
                .status(status)
                .body(body.isBlank() ? null : body)
                .headers(Map.of("Content-Type", contentType))
                .build();

        StubMetadata metadata = StubMetadata.builder()
                .clientId(externalId)
                .build();

        return StubMapping.builder()
                .priority(externalId != null && !externalId.isBlank() ? 1 : 5)
                .persistent(true)
                .request(request)
                .response(response)
                .metadata(metadata)
                .build();
    }

    private Map<String, List<StubMapping>> loadStubsByScenario() {
        StubMappingsWrapper wrapper = wiremockAdminClient.getAllMappings(1000, 0);
        if (wrapper.getMappings() == null) return Collections.emptyMap();
        return wrapper.getMappings().stream()
                .filter(s -> s.getScenarioName() != null && !s.getScenarioName().isBlank())
                .collect(Collectors.groupingBy(StubMapping::getScenarioName));
    }

    private WiremockScenario findWmScenario(String name) {
        ScenariosWrapper wrapper = wiremockAdminClient.getAllScenarios();
        return Optional.ofNullable(wrapper.getScenarios()).orElse(Collections.emptyList())
                .stream()
                .filter(s -> name.equals(s.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Scenario not found: " + name));
    }

    private ScenarioInfo buildScenarioInfo(WiremockScenario wm, List<StubMapping> stubs) {
        String currentState = wm.getState();
        List<ScenarioStep> steps = buildStepChain(stubs, currentState);

        String externalId = stubs.stream()
                .map(StubMapping::getMetadata)
                .filter(m -> m != null && m.getClientId() != null)
                .map(StubMetadata::getClientId)
                .findFirst().orElse(null);

        String prevState = null, nextState = null;
        boolean completed = false;

        for (int i = 0; i < steps.size(); i++) {
            if (steps.get(i).isActive()) {
                prevState = i > 0 ? steps.get(i - 1).getRequiredState() : null;
                nextState = steps.get(i).getNewState();
                break;
            }
        }

        if (steps.stream().noneMatch(ScenarioStep::isActive)) {
            completed = steps.stream().anyMatch(s -> currentState.equals(s.getNewState()));
            if (completed && !steps.isEmpty())
                prevState = steps.get(steps.size() - 1).getRequiredState();
        }

        return ScenarioInfo.builder()
                .name(wm.getName())
                .currentState(currentState)
                .possibleStates(wm.getPossibleStates() != null
                        ? wm.getPossibleStates() : Collections.emptyList())
                .steps(steps)
                .stepCount(steps.size())
                .externalId(externalId)
                .global(externalId == null)
                .prevState(prevState)
                .nextState(nextState)
                .completed(completed)
                .build();
    }

    private List<ScenarioStep> buildStepChain(List<StubMapping> stubs, String currentState) {
        if (stubs.isEmpty()) return Collections.emptyList();

        Map<String, StubMapping> stateToStub = new LinkedHashMap<>();
        stubs.stream()
                .filter(s -> s.getRequiredScenarioState() != null)
                .forEach(s -> stateToStub.putIfAbsent(s.getRequiredScenarioState(), s));

        List<ScenarioStep> steps = new ArrayList<>();
        String cursor = "Started";
        Set<String> visited = new HashSet<>();
        int index = 1;

        while (cursor != null && stateToStub.containsKey(cursor) && visited.add(cursor)) {
            StubMapping stub = stateToStub.get(cursor);
            String newState  = stub.getNewScenarioState();
            boolean isActive = cursor.equals(currentState);
            boolean isTerminal = newState == null || !stateToStub.containsKey(newState);

            steps.add(ScenarioStep.builder()
                    .index(index++)
                    .requiredState(cursor)
                    .newState(newState)
                    .label(cursor.equals("Started") ? "Step 1" : cursor)
                    .stubId(stub.getId())
                    .stubName(stub.getName())
                    .method(extractMethod(stub))
                    .url(extractUrl(stub))
                    .responseStatus(extractStatus(stub))
                    .active(isActive)
                    .terminal(isTerminal)
                    .build());

            cursor = newState;
        }
        return steps;
    }

    private String extractMethod(StubMapping stub) {
        return stub.getRequest() != null ? stub.getRequest().getMethod() : null;
    }

    private String extractUrl(StubMapping stub) {
        if (stub.getRequest() == null) return "—";
        StubMappingRequest r = stub.getRequest();
        if (r.getUrlPath() != null)        return r.getUrlPath();
        if (r.getUrl() != null)            return r.getUrl();
        if (r.getUrlPathPattern() != null) return r.getUrlPathPattern() + " ~";
        if (r.getUrlPattern() != null)     return r.getUrlPattern() + " ~";
        return "—";
    }

    private Integer extractStatus(StubMapping stub) {
        return stub.getResponse() != null ? stub.getResponse().getStatus() : null;
    }

    private String nvl(String val, String def) {
        return val != null && !val.isBlank() ? val : def;
    }
}