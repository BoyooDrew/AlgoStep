package com.algostep.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebConfig.class);

    @Value("${algostep.frontend.path:}")
    private String frontendPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = resolveFrontendLocation();
        log.info("静态资源根目录: {}", location);
        registry.addResourceHandler("/**").addResourceLocations(location);
    }

    /**
     * 按「配置值 → 工作目录 → 工作目录上级」顺序，取第一个真实存在 index.html 的目录。
     * 兼容 mvn spring-boot:run（工作目录=algostep-backend）与 IDE 直接运行 main
     * （工作目录=项目根）两种启动方式；返回绝对路径 file: URL，避免 Spring 对
     * "file:./" 相对位置的解析依赖 JVM 工作目录。
     */
    private String resolveFrontendLocation() {
        String[] candidates = {frontendPath, "file:./", "file:../"};
        for (String c : candidates) {
            if (c == null || c.isBlank()) continue;
            File dir = new File(c.replaceFirst("^file:", ""));
            try {
                if (new File(dir, "index.html").isFile()) {
                    String abs = dir.getCanonicalPath().replace('\\', '/');
                    return "file:" + (abs.endsWith("/") ? abs : abs + "/");
                }
            } catch (IOException ignored) {
                // 候选目录异常时尝试下一个
            }
        }
        log.warn("未在候选目录找到 index.html，静态页面将不可用（API 不受影响）");
        return "classpath:/static/";
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addRedirectViewController("/", "/index.html");
    }
}
