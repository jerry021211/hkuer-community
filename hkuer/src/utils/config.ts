// API 基础配置
// 开发环境使用空字符串，通过 Vite 代理转发到 http://localhost:9090
// 生产环境需要设置为实际的后端 API 地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '' : '/hkuers')
// 响应数据结构
export interface ApiResponse<T = any> {
    code: string
    msg?: string
    data: T
    message?: string
}

// 登录响应数据
export interface LoginResponse {
    accessToken: string
    refreshToken: string
    tokenType: string
    userId: string
    username: string
    nickname: string
}

// Token 存储键名
export const TOKEN_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    TOKEN_TYPE: 'tokenType',
    USER_ID: 'userId',
    USERNAME: 'username',
    NICKNAME: 'nickname'
} as const

