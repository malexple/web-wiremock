package ru.mcs.webwiremock.dto.ui;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientInfo {

    /** externalId из JWT payload */
    private String clientId;

    /** Человекочитаемое имя, задаётся в metadata стаба */
    private String clientName;

    /**
     * Возвращает clientName если задан, иначе clientId.
     * Используется в выпадающем списке.
     */
    public String getDisplayName() {
        return (clientName != null && !clientName.isBlank()) ? clientName : clientId;
    }
}