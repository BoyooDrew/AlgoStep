package com.algostep.common.constant;

public final class SecurityConstant {

    private SecurityConstant() {}

    public static final String TOKEN_HEADER = "Authorization";
    public static final String TOKEN_PREFIX = "Bearer ";

    public static final String[] WHITELIST = {
            "/",
            "/health",
            "/api/status",
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/algorithms",
            "/api/algorithms/**",
            "/doc.html",
            "/webjars/**",
            "/swagger-resources/**",
            "/v3/api-docs/**",
            "/favicon.ico",
            "/h2-console/**",
            "/*.html",
            "/css/**",
            "/js/**",
            "/algorithms/**",
            "/assets/**"
    };
}
