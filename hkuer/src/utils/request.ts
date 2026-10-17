import axios, {
    type AxiosError,
    type AxiosRequestConfig,
    type AxiosResponse,
    type InternalAxiosRequestConfig
} from 'axios'
import { API_BASE_URL, type ApiResponse } from './config'
import router from '@/router'
import { clearCachedUserInfo } from './auth'
import { tokenManager } from './token'

// 创建 axios 实例
const request = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    withCredentials: true, // 支持Cookie跨域
    headers: {
        'Content-Type': 'application/json'
    }
})

// 扩展 axios 类型，拦截器返回的是 data.data 而不是整个 response
declare module 'axios' {
    export interface AxiosInstance {
        get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
        post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
        put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
        delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
        patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    }
}

// 是否正在刷新 token
let isRefreshing = false
// 等待刷新 token 的请求队列
let requests: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
}> = []

// 是否已检测到用户被封号（一旦为 true，所有请求都会被阻止）
let isBanned = false
// 是否正在处理封号状态（防止多个并发请求同时触发多次弹窗/跳转）
let isHandlingBanned = false

// 白名单路径（不需要token的接口）
const publicPaths = [
    '/java/mesh/public/',
    '/java/user/public-key',
    '/java/user/login',
    '/java/user/insert', // 注册接口
    '/java/user/sendverificationcode', // 发送验证码接口
]

// 请求拦截器
request.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 如果用户已被封号，直接阻止请求发出
        if (isBanned) {
            // 返回一个被取消的请求，阻止请求发出
            const controller = new AbortController()
            controller.abort()
            config.signal = controller.signal
            return config
        }

        // HttpOnly Cookie会自动携带，无需手动添加Authorization头
        // 调试：打印请求URL
        if (import.meta.env.DEV) {
            const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url
            console.log('[Request]', config.method?.toUpperCase(), fullUrl)
        }
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

/**
 * 跳转到登录页
 */
const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search
    const loginPath = '/login'
    const registerPath = '/register'

    // 如果已经在登录页或注册页，不重复跳转
    if (window.location.pathname === loginPath || window.location.pathname === registerPath) {
        return
    }

    // 跳转到登录页，保存当前路径用于登录后跳转
    router.push({
        path: loginPath,
        query: { redirect: currentPath }
    }).catch(() => { })
}

/**
 * 处理用户封号状态
 * 调用登出接口，清除本地数据，跳转登录页
 */
const handleBannedUser = async () => {
    // 防止多个并发请求同时触发多次处理
    if (isHandlingBanned) {
        return
    }
    isHandlingBanned = true

    // 标记为已封号，阻止所有后续请求
    isBanned = true

    // 1. 调用登出接口（使用原生 axios 绕过拦截器）
    try {
        const logoutUrl = API_BASE_URL
            ? `${API_BASE_URL}/java/user/logout`
            : '/java/user/logout'
        await axios.post(logoutUrl, {}, {
            withCredentials: true,
            timeout: 5000,
            headers: {}
        } as any)
    } catch (error) {
        // 忽略登出失败，继续执行跳转
    }

    // 2. 清除本地数据
    try {
        tokenManager.clearTokens()
        clearCachedUserInfo()
        localStorage.removeItem('last_active_time')
    } catch (error) {
        // 忽略清除失败
    }

    // 3. 跳转到登录页，携带封禁标识
    window.location.href = '/login?reason=banned'
}

/**
 * 刷新token
 */
const refreshToken = async (): Promise<void> => {
    try {
        // 调用刷新token接口，refreshToken从Cookie自动读取
        // 注意：这里直接使用axios而不是request，避免触发拦截器的无限循环
        // 如果刷新接口返回401，说明refreshToken也过期了，需要跳转登录页
        // 开发环境走Vite代理，生产环境直接请求后端
        const refreshUrl = API_BASE_URL
            ? `${API_BASE_URL}/java/user/refresh`
            : '/java/user/refresh'            // 开发环境：走Vite代理（代理会移除 /java 前缀）
        const response = await axios.post<ApiResponse<{ accessToken: string; userId: string }>>(
            refreshUrl,
            {},
            {
                withCredentials: true, // 确保Cookie被携带
                headers: {} as any, // 类型兼容性处理
            }
        )

        // response.data 是 ApiResponse 类型
        const responseData = response.data as unknown as ApiResponse<{ accessToken: string; userId: string }>

        if (responseData.code === '200') {
            // 刷新成功，新的accessToken已经自动更新到Cookie中
            // 执行队列中的请求
            requests.forEach(({ resolve }) => {
                resolve()
            })
            requests = []
            return
        } else {
            throw new Error(responseData.msg || responseData.message || '刷新token失败')
        }
    } catch (error: any) {
        // 刷新失败，说明refreshToken也过期了
        requests.forEach(({ reject }) => {
            reject(error)
        })
        requests = []

        // 清除本地用户信息
        localStorage.removeItem('user_info')

        // 跳转到登录页
        redirectToLogin()
        throw error
    }
}

// 响应拦截器
request.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
        const { data } = response

        // 检查封号状态
        // code 可能是 'BANNED' 或 403999
        const codeStr = String(data.code)
        if (codeStr === 'BANNED' || codeStr === '403999') {
            handleBannedUser()
            // 返回一个永不 resolve 的 Promise，阻止后续逻辑
            return new Promise(() => { })
        }

        // 如果返回的 code 不是 200，视为错误
        if (data.code !== '200') {
            return Promise.reject(Object.assign(new Error(data.msg || data.message || '请求失败'), { code: data.code, data: data.data }))
        }

        // 直接返回 data.data，简化调用方式
        // 现在可以直接使用: const result = await api.get('/path')
        return data.data
    },
    async (error: AxiosError<ApiResponse>) => {
        // 如果请求被取消（因为用户已被封号），静默处理，不触发任何后续逻辑
        if (axios.isCancel(error) || error.code === 'ERR_CANCELED' || isBanned) {
            // 返回一个永不 resolve 的 Promise，阻止所有后续处理
            return new Promise(() => { })
        }

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _skipRefresh?: boolean }

        // 优先处理封号状态：403 + code BANNED 或 403999
        const responseCode = String(error.response?.data?.code || '')
        if (error.response?.status === 403 && (responseCode === 'BANNED' || responseCode === '403999')) {
            // 处理封号状态
            handleBannedUser()

            // 返回一个永不 resolve 的 Promise，阻止重试和后续逻辑
            return new Promise(() => { })
        }

        // 检查是否是公共路径，如果是则不需要刷新token
        const requestUrl = originalRequest.url || ''
        //const isPublicPath = publicPaths.some(path => requestUrl.includes(path))
        const isPublicPath = publicPaths.some(path => {
            const matches = requestUrl.includes(path)
            if (import.meta.env.DEV && matches) {
                console.log('[Public Path Match]', { requestUrl, path, matches })
            }
            return matches
        })

        // 如果是公共路径，直接返回错误，不尝试刷新token
        if (isPublicPath) {
            if (import.meta.env.DEV) {
                console.log('[Public Path Error]', {
                    url: requestUrl,
                    status: error.response?.status,
                    message: error.response?.data?.msg || error.response?.data?.message
                })
            }
            const message = error.response?.data?.msg || error.response?.data?.message || error.message || '请求失败'
            return Promise.reject(new Error(message))
        }

        // 如果是 401 错误且未重试过，尝试刷新 token
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._skipRefresh) {
            if (isRefreshing) {
                // 如果正在刷新，将请求加入队列
                return new Promise((resolve, reject) => {
                    requests.push({
                        resolve: () => {
                            // 刷新成功后，重试原请求
                            originalRequest._retry = true
                            resolve(request(originalRequest))
                        },
                        reject: (err) => {
                            reject(err)
                        }
                    })
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                // 刷新token
                await refreshToken()

                // 刷新成功后，重新发送原始请求（移除_retry标志，允许正常请求）
                originalRequest._retry = true
                return request(originalRequest)
            } catch (refreshError) {
                // 刷新失败，已经跳转到登录页
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        // 其他错误直接返回
        // 调试：打印错误信息
        if (import.meta.env.DEV && error.response) {
            console.error('[Response Error]', {
                status: error.response.status,
                statusText: error.response.statusText,
                url: error.config?.url,
                data: error.response.data
            })
        }
        const message = error.response?.data?.msg || error.response?.data?.message || error.message || '请求失败'
        return Promise.reject(new Error(message))
    }
)

export default request
// 导出为 api，方便使用
export const api = request

