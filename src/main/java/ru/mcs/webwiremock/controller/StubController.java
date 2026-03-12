package ru.mcs.webwiremock.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import ru.mcs.webwiremock.config.WiremockProperties;
import ru.mcs.webwiremock.dto.ui.ApiResponse;
import ru.mcs.webwiremock.dto.ui.ApiTreeNode;
import ru.mcs.webwiremock.dto.ui.ClientInfo;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.service.ApiTreeService;
import ru.mcs.webwiremock.service.StubService;

import java.util.List;

@Slf4j
@Controller
@RequestMapping("/stubs")
@RequiredArgsConstructor
public class StubController {

    private final StubService stubService;
    private final ApiTreeService apiTreeService;
    private final WiremockProperties wiremockProperties;
    private final ObjectMapper objectMapper;

    @GetMapping
    public String stubsPage(
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String urlPath,
            @RequestParam(required = false) String selectedId,
            Model model) {

        List<StubMapping> allStubs = stubService.getAllStubs();

        List<StubMapping> stubs = (clientId != null && !clientId.isBlank())
                || (urlPath != null && !urlPath.isBlank())
                ? stubService.filterStubs(clientId, urlPath)
                : allStubs;

        List<ApiTreeNode> tree = stubService.buildStubTree(stubs);
        List<ClientInfo> clients = stubService.getClients();

        // Все уникальные пути для второго дропдауна (из всех стабов, без фильтра)
        List<String> allPaths = allStubs.stream()
                .map(s -> apiTreeService.extractEffectivePath(s.getRequest()))
                .filter(p -> p != null && !p.equals("/"))
                .distinct()
                .sorted()
                .toList();

        model.addAttribute("tree", tree);
        model.addAttribute("clients", clients);
        model.addAttribute("allPaths", allPaths);
        model.addAttribute("selectedClientId", clientId);
        model.addAttribute("selectedUrlPath", urlPath);
        model.addAttribute("selectedStubId", selectedId);
        model.addAttribute("wiremockHost", wiremockProperties.getWiremockHost());
        model.addAttribute("totalStubs", stubs.size());

        return "stubs/index";
    }

    @GetMapping("/{id}/json")
    @ResponseBody
    public ResponseEntity<ApiResponse<StubMapping>> getStubJson(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(stubService.getStubById(id)));
    }

    @PostMapping
    @ResponseBody
    public ResponseEntity<ApiResponse<StubMapping>> createStub(@RequestBody StubMapping stub) {
        return ResponseEntity.ok(ApiResponse.ok("Stub created", stubService.createStub(stub)));
    }

    @PutMapping("/{id}")
    @ResponseBody
    public ResponseEntity<ApiResponse<StubMapping>> updateStub(
            @PathVariable String id, @RequestBody StubMapping stub) {
        return ResponseEntity.ok(ApiResponse.ok("Stub updated", stubService.updateStub(id, stub)));
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> deleteStub(@PathVariable String id) {
        stubService.deleteStub(id);
        return ResponseEntity.ok(ApiResponse.ok("Stub deleted", null));
    }

    @GetMapping("/wizard")
    public String wizardPage(Model model) {
        model.addAttribute("clients", stubService.getClients());
        model.addAttribute("wiremockHost", wiremockProperties.getWiremockHost());
        return "stubs/wizard";
    }
}