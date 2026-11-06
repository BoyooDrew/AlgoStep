package com.algostep.module.auth.service.impl;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import com.algostep.common.utils.JwtUtils;
import com.algostep.common.utils.PasswordUtils;
import com.algostep.module.auth.dto.LoginDTO;
import com.algostep.module.auth.dto.RefreshDTO;
import com.algostep.module.auth.dto.RegisterDTO;
import com.algostep.module.auth.service.AuthService;
import com.algostep.module.auth.vo.LoginVO;
import com.algostep.module.user.entity.User;
import com.algostep.module.user.mapper.UserMapper;
import com.algostep.module.user.service.UserService;
import com.algostep.module.user.vo.UserVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final UserService userService;
    private final PasswordUtils passwordUtils;
    private final JwtUtils jwtUtils;

    @Override
    @Transactional
    public void register(RegisterDTO dto) {
        if (userService.existsByUsername(dto.getUsername())) {
            throw new BusinessException(ResultCode.USER_EXISTS);
        }
        if (userService.existsByEmail(dto.getEmail())) {
            throw new BusinessException(ResultCode.EMAIL_EXISTS);
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordUtils.encode(dto.getPassword()));
        user.setEmail(dto.getEmail());
        user.setNickname(dto.getUsername());
        user.setRole("USER");
        user.setStatus(1);

        userMapper.insert(user);
        log.info("用户注册成功 | username={}", dto.getUsername());
    }

    @Override
    public LoginVO login(LoginDTO dto) {
        User user = userService.getByUsername(dto.getUsername());
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }

        if (!passwordUtils.matches(dto.getPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.PASSWORD_ERROR);
        }

        if (user.getStatus() == 0) {
            throw new BusinessException(ResultCode.USER_DISABLED);
        }

        String accessToken = jwtUtils.generateAccessToken(user.getId(), user.getUsername(), user.getRole());
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getUsername(), user.getRole());

        LoginVO vo = new LoginVO();
        vo.setToken(accessToken);
        vo.setRefreshToken(refreshToken);
        vo.setUserId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setRole(user.getRole());

        log.info("用户登录成功 | username={}", dto.getUsername());
        return vo;
    }

    @Override
    public void logout() {
        // 无状态JWT：客户端丢弃Token即可
        // 后续接入Redis后：从Redis删除Token实现服务端失效
        log.info("用户登出 | userId={}", com.algostep.common.utils.UserContext.getUserId());
    }

    @Override
    public LoginVO refresh(RefreshDTO dto) {
        String refreshToken = dto.getRefreshToken();

        if (!jwtUtils.isTokenValid(refreshToken)) {
            throw new BusinessException(ResultCode.TOKEN_INVALID);
        }
        if (!jwtUtils.isRefreshToken(refreshToken)) {
            throw new BusinessException(ResultCode.REFRESH_TOKEN_INVALID);
        }

        Long userId = jwtUtils.getUserIdFromToken(refreshToken);
        User user = userService.getById(userId);

        if (user.getStatus() == 0) {
            throw new BusinessException(ResultCode.USER_DISABLED);
        }

        String newAccessToken = jwtUtils.generateAccessToken(user.getId(), user.getUsername(), user.getRole());
        String newRefreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getUsername(), user.getRole());

        LoginVO vo = new LoginVO();
        vo.setToken(newAccessToken);
        vo.setRefreshToken(newRefreshToken);
        vo.setUserId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setRole(user.getRole());

        log.info("Token刷新成功 | userId={}", userId);
        return vo;
    }

    @Override
    public UserVO getCurrentUser() {
        return userService.getCurrentUserInfo();
    }
}
