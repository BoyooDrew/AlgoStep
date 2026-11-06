package com.algostep.module.user.controller;

import com.algostep.common.result.Result;
import com.algostep.module.user.dto.ChangePasswordDTO;
import com.algostep.module.user.dto.UserProfileDTO;
import com.algostep.module.user.service.UserService;
import com.algostep.module.user.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "用户管理")
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "获取个人信息")
    @GetMapping("/profile")
    public Result<UserVO> getProfile() {
        return Result.success(userService.getCurrentUserInfo());
    }

    @Operation(summary = "修改个人信息")
    @PutMapping("/profile")
    public Result<UserVO> updateProfile(@Valid @RequestBody UserProfileDTO dto) {
        return Result.success(userService.updateProfile(dto));
    }

    @Operation(summary = "修改密码")
    @PutMapping("/password")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordDTO dto) {
        userService.changePassword(dto);
        return Result.success();
    }
}
