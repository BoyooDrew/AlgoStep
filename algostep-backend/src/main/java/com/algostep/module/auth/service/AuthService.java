package com.algostep.module.auth.service;

import com.algostep.module.auth.dto.LoginDTO;
import com.algostep.module.auth.dto.RefreshDTO;
import com.algostep.module.auth.dto.RegisterDTO;
import com.algostep.module.auth.vo.LoginVO;
import com.algostep.module.user.vo.UserVO;

public interface AuthService {

    void register(RegisterDTO dto);

    LoginVO login(LoginDTO dto);

    void logout();

    LoginVO refresh(RefreshDTO dto);

    UserVO getCurrentUser();
}
