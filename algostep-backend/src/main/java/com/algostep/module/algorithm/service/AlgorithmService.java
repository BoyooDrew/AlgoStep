package com.algostep.module.algorithm.service;

import com.algostep.module.algorithm.vo.AlgorithmVO;

import java.util.List;

public interface AlgorithmService {

    List<AlgorithmVO> list(String category);

    AlgorithmVO getById(Long id);
}
