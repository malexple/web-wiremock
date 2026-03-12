package ru.mcs.webwiremock.dto.ui;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ApiTreeNode {

    /**
     * Отображаемый сегмент пути (например "v1") или имя стаба для листьев
     */
    private String segment;

    /**
     * true — это листовой узел (стаб), false — промежуточный узел (сегмент пути)
     */
    private boolean leaf;

    /** Заполнено только для листьев */
    private String stubId;
    private String stubName;

    /**
     * HTTP-метод: GET, POST, PUT, DELETE, PATCH, ANY.
     * Заполнено только для листьев.
     */
    private String method;

    private List<ApiTreeNode> children;

    /**
     * Метод ANY подсвечивается отдельным цветом в UI
     */
    public boolean isMethodAny() {
        return "ANY".equalsIgnoreCase(method);
    }
}