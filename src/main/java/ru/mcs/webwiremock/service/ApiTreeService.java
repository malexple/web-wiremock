package ru.mcs.webwiremock.service;

import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.dto.ui.ApiTreeNode;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.dto.wiremock.StubMappingRequest;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ApiTreeService {

    /**
     * Строит дерево из списка стабов.
     * Каждый сегмент пути — промежуточный узел, стаб — листовой узел
     * дочерним к последнему сегменту его URL-пути.
     *
     * Пример для /api/integration/v1:
     * api → integration → v1 → [POST] stub-name
     */
    public List<ApiTreeNode> buildTree(List<StubMapping> stubs) {
        MutableNode root = new MutableNode("root");

        for (StubMapping stub : stubs) {
            String[] segments = splitPath(extractEffectivePath(stub.getRequest()));
            if (segments.length == 0) segments = new String[]{"/"};

            MutableNode current = root;
            for (String segment : segments) {
                current = current.children.computeIfAbsent(segment, MutableNode::new);
            }

            current.stubs.add(buildLeaf(stub));
        }

        return toApiTreeNodes(root.children);
    }

    /**
     * Извлекает эффективный URL-путь из request-части стаба.
     * Порядок приоритета: urlPath > url > urlPathTemplate > urlPathPattern > urlPattern
     */
    public String extractEffectivePath(StubMappingRequest request) {
        if (request == null) return "/";

        if (request.getUrlPath() != null)         return request.getUrlPath();
        if (request.getUrl() != null)             return stripQuery(request.getUrl());
        if (request.getUrlPathTemplate() != null) return request.getUrlPathTemplate();
        if (request.getUrlPathPattern() != null)  return cleanRegex(request.getUrlPathPattern());
        if (request.getUrlPattern() != null)      return cleanRegex(stripQuery(request.getUrlPattern()));

        return "/";
    }

    // ── private ──────────────────────────────────────────────────────────────

    private ApiTreeNode buildLeaf(StubMapping stub) {
        String method = (stub.getRequest() != null && stub.getRequest().getMethod() != null)
                ? stub.getRequest().getMethod()
                : "ANY";
        String path = extractEffectivePath(stub.getRequest());
        String name = Objects.requireNonNullElse(stub.getName(), path);

        return ApiTreeNode.builder()
                .segment(name)
                .leaf(true)
                .stubId(stub.getId())
                .stubName(name)
                .method(method)
                .children(Collections.emptyList())
                .build();
    }

    private List<ApiTreeNode> toApiTreeNodes(Map<String, MutableNode> map) {
        return map.values().stream()
                .map(node -> {
                    List<ApiTreeNode> children = new ArrayList<>(toApiTreeNodes(node.children));
                    children.addAll(node.stubs);
                    return ApiTreeNode.builder()
                            .segment(node.segment)
                            .leaf(false)
                            .children(children)
                            .build();
                })
                .toList();
    }

    private String[] splitPath(String path) {
        return Arrays.stream(path.split("/"))
                .filter(s -> !s.isBlank())
                .toArray(String[]::new);
    }

    private String stripQuery(String url) {
        int idx = url.indexOf('?');
        return idx >= 0 ? url.substring(0, idx) : url;
    }

    /** Убирает regex-якоря ^ и $, а также .* в хвосте — для читаемого отображения */
    private String cleanRegex(String pattern) {
        return pattern
                .replaceAll("^\\^", "")
                .replaceAll("\\.\\*$", "")
                .replaceAll("\\$$", "")
                .trim();
    }

    // ── internal builder structure ────────────────────────────────────────────

    private static class MutableNode {
        final String segment;
        final Map<String, MutableNode> children = new LinkedHashMap<>();
        final List<ApiTreeNode> stubs = new ArrayList<>();

        MutableNode(String segment) {
            this.segment = segment;
        }
    }
}