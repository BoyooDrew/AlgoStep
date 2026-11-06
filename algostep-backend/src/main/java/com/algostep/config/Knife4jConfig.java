package com.algostep.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class Knife4jConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AlgoStep API")
                        .description("AlgoStep 算法可视化教学工具后端接口文档")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("boyooDrew")
                                .email("BoyooDrew@163.com")));
    }
}
