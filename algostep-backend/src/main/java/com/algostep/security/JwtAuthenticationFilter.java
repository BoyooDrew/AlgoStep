package com.algostep.security;

import com.algostep.common.constant.SecurityConstant;
import com.algostep.common.utils.JwtUtils;
import com.algostep.common.utils.UserContext;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = resolveToken(request);

        if (StringUtils.hasText(token) && jwtUtils.isTokenValid(token)) {
            if (jwtUtils.isAccessToken(token)) {
                Claims claims = jwtUtils.parseToken(token);
                Long userId = ((Number) claims.get("userId")).longValue();
                String username = claims.get("username", String.class);
                String role = claims.get("role", String.class);
                if (role == null) role = "USER";

                UserContext.set(userId, username, role);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                username, null,
                                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(SecurityConstant.TOKEN_HEADER);
        if (StringUtils.hasText(header) && header.startsWith(SecurityConstant.TOKEN_PREFIX)) {
            return header.substring(SecurityConstant.TOKEN_PREFIX.length());
        }
        return null;
    }
}
