package com.algostep.common.result;

import lombok.Getter;

@Getter
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    CREATED(201, "创建成功"),

    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "未登录或Token已过期"),
    FORBIDDEN(403, "无权限访问"),
    NOT_FOUND(404, "资源不存在"),
    METHOD_NOT_ALLOWED(405, "请求方法不支持"),
    CONFLICT(409, "资源冲突"),

    INTERNAL_ERROR(500, "服务器内部错误"),
    SERVICE_UNAVAILABLE(503, "服务暂不可用"),

    USER_EXISTS(1001, "用户名已存在"),
    EMAIL_EXISTS(1002, "邮箱已被注册"),
    USER_NOT_FOUND(1003, "用户不存在"),
    PASSWORD_ERROR(1004, "密码错误"),
    USER_DISABLED(1005, "账号已被禁用"),
    TOKEN_INVALID(1006, "Token无效"),
    TOKEN_EXPIRED(1007, "Token已过期"),
    REFRESH_TOKEN_INVALID(1008, "RefreshToken无效"),

    ALGORITHM_NOT_FOUND(2001, "算法不存在"),
    PROGRESS_NOT_FOUND(2002, "学习进度不存在"),
    FAVORITE_EXISTS(2003, "已收藏过该算法"),
    FAVORITE_NOT_FOUND(2004, "未收藏该算法"),

    RATE_LIMIT(9001, "请求过于频繁，请稍后再试");

    private final int code;
    private final String msg;

    ResultCode(int code, String msg) {
        this.code = code;
        this.msg = msg;
    }
}
