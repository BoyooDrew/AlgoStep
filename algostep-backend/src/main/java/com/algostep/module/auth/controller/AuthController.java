package com.algostep.module.auth.controller;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.guard.LoginAttemptGuard;
import com.algostep.common.result.Result;
import com.algostep.common.result.ResultCode;
import com.algostep.module.auth.dto.LoginDTO;
import com.algostep.module.auth.dto.RefreshDTO;
import com.algostep.module.auth.dto.RegisterDTO;
import com.algostep.module.auth.service.AuthService;
import com.algostep.module.auth.vo.LoginVO;
import com.algostep.module.user.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "认证管理")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginAttemptGuard loginAttemptGuard;

    @Operation(summary = "注册")
    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody RegisterDTO dto) {
        authService.register(dto);
        return Result.success();
    }

    @Operation(summary = "登录")
    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO dto, HttpServletRequest request) {
        String guardKey = clientIp(request) + ":" + dto.getUsername();
        loginAttemptGuard.check(guardKey);

        try {
            LoginVO vo = authService.login(dto);
            loginAttemptGuard.clear(guardKey);
            return Result.success(vo);
        } catch (BusinessException e) {
            int code = e.getCode();
            if (code == ResultCode.PASSWORD_ERROR.getCode()
                    || code == ResultCode.USER_NOT_FOUND.getCode()) {
                loginAttemptGuard.recordFailure(guardKey);
            }
            throw e;
        }
    }

    @Operation(summary = "登出")
    @PostMapping("/logout")
    public Result<Void> logout() {
        authService.logout();
        return Result.success();
    }

    @Operation(summary = "刷新Token")
    @PostMapping("/refresh")
    public Result<LoginVO> refresh(@Valid @RequestBody RefreshDTO dto) {
        return Result.success(authService.refresh(dto));
    }

    @Operation(summary = "获取当前登录用户信息")
    @GetMapping("/me")
    public Result<UserVO> me() {
        return Result.success(authService.getCurrentUser());
    }

    /** 取客户端 IP，兼容反向代理场景 */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
