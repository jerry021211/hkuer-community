import { TOKEN_KEYS, type LoginResponse } from './config'

// Token 管理工具
class TokenManager {
    // 保存 token 信息
    setTokens(loginData: LoginResponse): void {
        localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, loginData.accessToken)
        localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, loginData.refreshToken)
        localStorage.setItem(TOKEN_KEYS.TOKEN_TYPE, loginData.tokenType)
        localStorage.setItem(TOKEN_KEYS.USER_ID, loginData.userId)
        localStorage.setItem(TOKEN_KEYS.USERNAME, loginData.username)
        localStorage.setItem(TOKEN_KEYS.NICKNAME, loginData.nickname)
    }

    // 更新 access token
    updateAccessToken(accessToken: string): void {
        localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken)
    }

    // 更新所有 tokens
    updateTokens(loginData: LoginResponse): void {
        this.setTokens(loginData)
    }

    // 获取 access token
    getAccessToken(): string | null {
        return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)
    }

    // 获取 refresh token
    getRefreshToken(): string | null {
        return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
    }

    // 获取 token type
    getTokenType(): string {
        return localStorage.getItem(TOKEN_KEYS.TOKEN_TYPE) || 'bearer'
    }

    // 获取完整的 authorization header
    getAuthorization(): string | null {
        const token = this.getAccessToken()
        const type = this.getTokenType()
        return token ? `${type} ${token}` : null
    }

    // 获取用户信息
    getUserInfo() {
        return {
            userId: localStorage.getItem(TOKEN_KEYS.USER_ID),
            username: localStorage.getItem(TOKEN_KEYS.USERNAME),
            nickname: localStorage.getItem(TOKEN_KEYS.NICKNAME)
        }
    }

    // 清除所有 token
    clearTokens(): void {
        localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN)
        localStorage.removeItem(TOKEN_KEYS.TOKEN_TYPE)
        localStorage.removeItem(TOKEN_KEYS.USER_ID)
        localStorage.removeItem(TOKEN_KEYS.USERNAME)
        localStorage.removeItem(TOKEN_KEYS.NICKNAME)
    }

    // 检查是否已登录
    isAuthenticated(): boolean {
        return !!this.getAccessToken()
    }
}

export const tokenManager = new TokenManager()

