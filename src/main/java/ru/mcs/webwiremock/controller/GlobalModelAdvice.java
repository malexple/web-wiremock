package ru.mcs.webwiremock.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalModelAdvice {

    @ModelAttribute("contextPath")
    public String contextPath(HttpServletRequest request) {
        return request.getContextPath(); // вернёт "/web-wiremock"
    }
}