package com.algostep.common.utils;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import lombok.AllArgsConstructor;
import lombok.Data;

public class UserContext {

    private static final ThreadLocal<CurrentUser> CONTEXT = new ThreadLocal<>();

    public static void set(Long userId, String username, String role) {
        CONTEXT.set(new CurrentUser(userId, username, role));
    }

    public static CurrentUser get() {
        CurrentUser user = CONTEXT.get();
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return user;
    }

    public static Long getUserId() {
        return get().getUserId();
    }

    public static String getUsername() {
        return get().getUsername();
    }

    public static void clear() {
        CONTEXT.remove();
    }

    @Data
    @AllArgsConstructor
    public static class CurrentUser {
        private Long userId;
        private String username;
        private String role;
    }
}
