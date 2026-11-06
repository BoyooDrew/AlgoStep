package com.algostep.module.favorite.service;

import com.algostep.module.favorite.vo.FavoriteVO;

import java.util.List;

public interface FavoriteService {

    List<FavoriteVO> list();

    void add(Long algorithmId);

    void remove(Long algorithmId);
}
