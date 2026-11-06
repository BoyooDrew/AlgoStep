package com.algostep.module.favorite.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FavoriteVO {

    private Long id;
    private Long algorithmId;
    private String algorithmName;
    private String algorithmNameZh;
    private String category;
    private String difficulty;
    private String url;
    private LocalDateTime createTime;
}
