package com.algostep.module.user.vo;

import lombok.Data;

@Data
public class UserVO {

    private Long id;
    private String username;
    private String email;
    private String nickname;
    private String avatar;
    private String role;
}
