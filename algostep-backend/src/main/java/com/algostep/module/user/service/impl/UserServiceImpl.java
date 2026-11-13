package com.algostep.module.user.service.impl;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import com.algostep.common.utils.PasswordUtils;
import com.algostep.common.utils.UserContext;
import com.algostep.module.user.dto.ChangePasswordDTO;
import com.algostep.module.user.dto.UserProfileDTO;
import com.algostep.module.user.entity.User;
import com.algostep.module.user.mapper.UserMapper;
import com.algostep.module.user.service.UserService;
import com.algostep.module.user.vo.UserVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final PasswordUtils passwordUtils;

    @Override
    public User getById(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }
        return user;
    }

    @Override
    public User getByUsername(String username) {
        return userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, username));
    }

    @Override
    public boolean existsByUsername(String username) {
        return userMapper.exists(
                new LambdaQueryWrapper<User>().eq(User::getUsername, username));
    }

    @Override
    public boolean existsByEmail(String email) {
        return userMapper.exists(
                new LambdaQueryWrapper<User>().eq(User::getEmail, email));
    }

    @Override
    public UserVO toVO(User user) {
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setEmail(user.getEmail());
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setRole(user.getRole());
        return vo;
    }

    @Override
    public UserVO getCurrentUserInfo() {
        Long userId = UserContext.getUserId();
        return toVO(getById(userId));
    }

    @Override
    @Transactional
    public UserVO updateProfile(UserProfileDTO dto) {
        Long userId = UserContext.getUserId();
        User user = getById(userId);

        if (StringUtils.hasText(dto.getNickname())) {
            user.setNickname(dto.getNickname());
        }
        // 新逻辑：null 表示“不修改”，空字符串表示“清空”
        if (dto.getAvatar() != null) {
            String avatar = dto.getAvatar().trim();
            user.setAvatar(avatar.isEmpty() ? null : avatar);
        }

        userMapper.updateById(user);
        log.info("用户信息更新成功 | userId={}", userId);
        return toVO(user);
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordDTO dto) {
        Long userId = UserContext.getUserId();
        User user = getById(userId);

        if (!passwordUtils.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.PASSWORD_ERROR, "原密码不正确");
        }

        user.setPassword(passwordUtils.encode(dto.getNewPassword()));
        userMapper.updateById(user);
        log.info("用户密码修改成功 | userId={}", userId);
    }
}
