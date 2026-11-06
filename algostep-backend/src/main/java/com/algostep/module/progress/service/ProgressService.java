package com.algostep.module.progress.service;

import com.algostep.module.progress.dto.ProgressDTO;
import com.algostep.module.progress.vo.ProgressStatsVO;
import com.algostep.module.progress.vo.ProgressVO;

import java.util.List;

public interface ProgressService {

    List<ProgressVO> list();

    ProgressVO getByAlgorithmId(Long algorithmId);

    ProgressVO save(ProgressDTO dto);

    ProgressStatsVO getStats();
}
