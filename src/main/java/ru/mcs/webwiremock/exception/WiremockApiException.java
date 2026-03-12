package ru.mcs.webwiremock.exception;

import lombok.Getter;

@Getter
public class WiremockApiException extends RuntimeException {

    private final int statusCode;

    public WiremockApiException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public WiremockApiException(String message, int statusCode, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
    }
}