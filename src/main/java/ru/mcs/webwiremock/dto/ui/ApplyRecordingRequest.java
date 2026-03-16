package ru.mcs.webwiremock.dto.ui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApplyRecordingRequest {

    /** ID стабов, которые нужно оставить */
    private List<String> keepIds;

    /** ID стабов, которые нужно удалить */
    private List<String> deleteIds;

    /** clientId для привязки JWT-матчера. null = не привязывать */
    private String clientId;

    /** Читаемое имя клиента для metadata */
    private String clientName;

    /** Имя профиля для сохранения. null = не сохранять */
    private String profileName;
}
