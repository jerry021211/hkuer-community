import { api } from './request'
import { API_BASE_URL } from './config'

// 用户信息接口
export interface UserInfo {
    userId: string
    nickName: string
}

// 用户信息缓存键名
const USER_INFO_CACHE_KEY = 'user_info'
const CACHE_EXPIRE_TIME = 5 * 60 * 1000 // 5分钟

interface CachedUserInfo {
    data: UserInfo
    timestamp: number
}

/**
 * 获取缓存的用户信息
 */
function getCachedUserInfo(): UserInfo | null {
    try {
        const cached = localStorage.getItem(USER_INFO_CACHE_KEY)
        if (!cached) return null

        const { data, timestamp }: CachedUserInfo = JSON.parse(cached)

        // 检查缓存是否过期
        if (Date.now() - timestamp > CACHE_EXPIRE_TIME) {
            localStorage.removeItem(USER_INFO_CACHE_KEY)
            return null
        }

        return data
    } catch {
        return null
    }
}

/**
 * 设置缓存的用户信息
 */
export function setCachedUserInfo(userInfo: UserInfo): void {
    const cached: CachedUserInfo = {
        data: userInfo,
        timestamp: Date.now()
    }
    localStorage.setItem(USER_INFO_CACHE_KEY, JSON.stringify(cached))
}

/**
 * 清除缓存的用户信息
 */
export function clearCachedUserInfo(): void {
    localStorage.removeItem(USER_INFO_CACHE_KEY)
}

/**
 * 获取当前用户信息
 * 支持自动登录：如果token过期但refreshToken有效，会自动刷新token
 * @param forceRefresh 是否强制刷新，不使用缓存
 * @returns 用户信息，如果未登录则返回null
 */
export async function getCurrentUser(forceRefresh = false): Promise<UserInfo | null> {
    // 如果不强制刷新，先检查缓存
    if (!forceRefresh) {
        const cached = getCachedUserInfo()
        if (cached) {
            return cached
        }
    }

    try {
        // 调用whoami_frontend接口验证登录状态
        // 如果token过期，axios拦截器会自动刷新token（自动登录）
        const userInfo = await api.get<UserInfo>('/java/user/whoami_frontend')

        if (userInfo) {
            // 缓存用户信息
            setCachedUserInfo(userInfo)
            return userInfo
        }

        // 如果接口返回失败，清除缓存
        clearCachedUserInfo()
        return null
    } catch (error: any) {
        // 请求失败
        // 如果是404错误，可能是后端Controller路径映射问题，打印详细信息
        if (error.response?.status === 404) {
            console.error('[whoami_frontend 404]', {
                url: `${API_BASE_URL}/java/user/whoami_frontend`,
                message: '接口返回404，请检查：1. 后端Controller的路径映射是否正确 2. Spring Security是否拦截了请求 3. 请求路径是否完全匹配'
            })
        }

        // 如果是401错误，说明token都过期了，已由拦截器处理跳转登录
        // 401错误时不清除缓存，因为可能是token过期但refreshToken有效的情况
        if (error.response?.status !== 401) {
            clearCachedUserInfo()
        }

        return null
    }
}

/**
 * 检查是否已登录
 * 支持自动登录：如果token过期但refreshToken有效，会自动刷新token
 * @returns 是否已登录
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        const userInfo = await getCurrentUser()
        return userInfo !== null
    } catch {
        return false
    }
}

/**
 * 获取当前用户ID
 * 支持自动登录：如果token过期但refreshToken有效，会自动刷新token
 * @returns 用户ID，如果未登录则返回null
 */
export async function getUserId(): Promise<string | null> {
    try {
        const userInfo = await getCurrentUser()
        return userInfo?.userId || null
    } catch {
        return null
    }
}

/**
 * 退出登录
 * @returns Promise<void>
 */
export async function logout(): Promise<void> {
    try {
        // 调用后端logout接口，后端会清除Cookie
        await api.post('/java/user/logout')
    } catch (error) {
        // 即使调用失败，也清除本地缓存
        console.error('退出登录失败:', error)
    } finally {
        // 清除本地用户信息缓存
        clearCachedUserInfo()
    }
}

