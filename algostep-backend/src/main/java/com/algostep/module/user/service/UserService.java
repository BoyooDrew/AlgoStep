package com.algostep.module.user.service;

import com.algostep.module.user.dto.ChangePasswordDTO;
import com.algostep.module.user.dto.UserProfileDTO;
import com.algostep.module.user.entity.User;
import com.algostep.module.user.vo.UserVO;

public interface UserService {

    User getById(Long id);

    User getByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    UserVO toVO(User user);

    UserVO getCurrentUserInfo();

    UserVO updateProfile(UserProfileDTO dto);

    void changePassword(ChangePasswordDTO dto);
}
