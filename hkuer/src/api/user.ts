import { api } from '@/utils/request'
import { encryptPassword } from '@/utils/encrypt'
import type { LoginResponse } from '@/utils/config'
import { setCachedUserInfo, clearCachedUserInfo } from '@/utils/auth'

// 获取公钥
export async function getPublicKey(): Promise<string> {
    const publicKey = await api.get<string>('/java/user/public-key')
    if (!publicKey) {
        throw new Error('获取公钥失败')
    }
    return publicKey
}

// 登录
export async function login(username: string, password: string): Promise<LoginResponse> {
    try {
        // 1. 获取公钥
        const publicKey = await getPublicKey()

        // 2. 加密密码
        const encryptedPassword = encryptPassword(password, publicKey)

        // 3. 调用登录接口
        // 登录成功后，后端会自动将token存入HttpOnly Cookie
        const loginData = await api.post<LoginResponse>('/java/user/login', {
            username,
            password: encryptedPassword
        })

        // 将用户信息存入localStorage（不存储token，token在Cookie中）
        setCachedUserInfo({
            userId: loginData.userId,
            nickName: loginData.nickname
        })

        return loginData
    } catch (error: any) {
        throw new Error(error.message || '登录失败')
    }
}

// 发送验证码
export async function sendVerificationCode(email: string): Promise<string> {
    const response = await api.post<string>('/java/user/sendverificationcode', {
        email
    })
    return response || '验证码已发送，请查收邮件'
}

// 注册
export async function register(
    username: string,
    password: string,
    nickname: string,
    email: string,
    verificationCode: string,
    avatar?: string
): Promise<void> {
    // 1. 获取公钥
    const publicKey = await getPublicKey()

    // 2. 加密密码
    const encryptedPassword = encryptPassword(password, publicKey)

    // 3. 调用注册接口
    await api.post('/java/user/insert', {
        username,
        password: encryptedPassword,
        nickname,
        email,
        verificationCode,
        avatar
    })
    // 拦截器已经处理了错误，成功时不会抛出异常
}

// 退出登录
export async function logout(): Promise<void> {
    try {
        // 调用后端logout接口，后端会清除Cookie
        await api.post('/java/user/logout')
    } catch (error) {
        console.error('退出登录失败:', error)
    } finally {
        // 清除本地用户信息缓存
        clearCachedUserInfo()
    }
}

// 获取当前用户的 userType
export async function getUserType(): Promise<number> {
    const res = await api.get<{ userType: number }>('/java/user/get_usertype')
    return res.userType
}

// 用户信息接口
export interface UserProfile {
    userId: string
    nickname: string
    avatar: string
}

// 获取用户信息（包含头像）
export async function getProfile(): Promise<UserProfile> {
    return await api.get<UserProfile>('/java/user/profile')
}

// 更新用户资料（昵称和头像）
export interface UpdateProfileRequest {
    nickname: string
    avatar: string
}

export async function updateProfile(data: UpdateProfileRequest): Promise<string> {
    return await api.post<string>('/java/user/profile/update', data)
}

// 上传头像图片到 OSS
export async function uploadAvatar(file: File | Blob, fileName: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file, fileName)
    formData.append('module', 'avatar')
    return await api.post<string>('/java/file/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
    } as any)
}



