package com.algostep.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshDTO {

    @NotBlank(message = "refreshToken不能为空")
    private String refreshToken;
}
