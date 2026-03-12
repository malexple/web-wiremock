package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RequestTiming {
    private Integer addedDelay;
    private Integer processTime;
    private Integer responseSendTime;
    private Integer serveTime;
    private Integer totalTime;
}
