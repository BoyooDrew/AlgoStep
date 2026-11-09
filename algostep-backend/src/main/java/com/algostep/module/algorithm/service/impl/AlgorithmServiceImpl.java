package com.algostep.module.algorithm.service.impl;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import com.algostep.module.algorithm.entity.Algorithm;
import com.algostep.module.algorithm.mapper.AlgorithmMapper;
import com.algostep.module.algorithm.service.AlgorithmService;
import com.algostep.module.algorithm.vo.AlgorithmVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlgorithmServiceImpl implements AlgorithmService {

    private final AlgorithmMapper algorithmMapper;

    @Override
    public List<AlgorithmVO> list(String category) {
        LambdaQueryWrapper<Algorithm> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(category)) {
            wrapper.eq(Algorithm::getCategory, category);
        }
        wrapper.orderByAsc(Algorithm::getSortOrder);

        List<Algorithm> list = algorithmMapper.selectList(wrapper);
        return list.stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public AlgorithmVO getById(Long id) {
        Algorithm algorithm = algorithmMapper.selectById(id);
        if (algorithm == null) {
            throw new BusinessException(ResultCode.ALGORITHM_NOT_FOUND);
        }
        return toVO(algorithm);
    }

    private AlgorithmVO toVO(Algorithm algorithm) {
        AlgorithmVO vo = new AlgorithmVO();
        vo.setId(algorithm.getId());
        vo.setName(algorithm.getName());
        vo.setNameZh(algorithm.getNameZh());
        vo.setCategory(algorithm.getCategory());
        vo.setDifficulty(algorithm.getDifficulty());
        vo.setComplexity(algorithm.getComplexity());
        vo.setUrl(algorithm.getUrl());
        vo.setDescription(algorithm.getDescription());
        return vo;
    }
}
