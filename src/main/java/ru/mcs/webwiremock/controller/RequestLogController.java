package ru.mcs.webwiremock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import ru.mcs.webwiremock.dto.ui.ApiResponse;
import ru.mcs.webwiremock.dto.wiremock.ServeEvent;
import ru.mcs.webwiremock.service.RequestLogService;
import ru.mcs.webwiremock.util.JsonUtil;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/requests")
@RequiredArgsConstructor
public class RequestLogController {

    private final RequestLogService requestLogService;
    private final JsonUtil          jsonUtil;

    @GetMapping
    public String requestLogPage(
            @RequestParam(required = false) Integer sinceMinutes,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String urlContains,
            @RequestParam(required = false) String bodyContains,
            @RequestParam(required = false, defaultValue = "false") boolean unmatched,
            Model model) {

        List<ServeEvent> events;
        if (unmatched) {
            events = requestLogService.getUnmatchedRequests();
        } else if (sinceMinutes != null && sinceMinutes > 0) {
            events = requestLogService.getRequestsSince(sinceMinutes);
        } else {
            events = requestLogService.getRecentRequests(null);
        }
        List<ServeEvent> filtered = requestLogService
                .filterRequests(events, method, urlContains, bodyContains);

        model.addAttribute("requests",      filtered);
        model.addAttribute("totalCount",    filtered.size());
        model.addAttribute("sinceMinutes",  sinceMinutes);
        model.addAttribute("filterMethod",  method);
        model.addAttribute("filterUrl",     urlContains);
        model.addAttribute("filterBody",    bodyContains);
        model.addAttribute("showUnmatched", unmatched);

        Map<String, Object> appData = new LinkedHashMap<>();
        appData.put("requests", filtered);
        model.addAttribute("appDataJson", jsonUtil.toHtmlSafeJson(appData));

        return "requests/index";
    }


    @GetMapping("/data")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ServeEvent>>> getRequestsData(
            @RequestParam(required = false) Integer sinceMinutes,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String urlContains,
            @RequestParam(required = false) String bodyContains) {

        List<ServeEvent> events = sinceMinutes != null
                ? requestLogService.getRequestsSince(sinceMinutes)
                : requestLogService.getRecentRequests(null);

        return ResponseEntity.ok(ApiResponse.ok(
                requestLogService.filterRequests(events, method, urlContains, bodyContains)));
    }

    @DeleteMapping
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> clearLog() {
        requestLogService.clearRequestLog();
        return ResponseEntity.ok(ApiResponse.ok("Request log cleared", null));
    }
}
