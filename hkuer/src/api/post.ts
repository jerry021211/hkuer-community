import { api } from '@/utils/request'
import axios from 'axios'
import { API_BASE_URL, type ApiResponse } from '@/utils/config'

export interface InsertPostRequest {
    title: string
    content: string
    boardName: string
}

export interface InsertPostResponse {
    code: string | number
    msg?: string
    data?: any
}

export async function insertPost(payload: InsertPostRequest): Promise<InsertPostResponse> {
    try {
        // 先尝试使用 api.post，如果成功（code 200）则返回
        const result = await api.post<any>('/java/post/insert', payload)
        // 如果成功，返回格式化的响应对象
        return {
            code: '200',
            msg: '请求成功',
            data: result
        }
    } catch (error: any) {
        if (error.code && error.data !== undefined) return {code:error.code,msg:error.message,data:error.data}
        throw error
    }
}

export interface PostRecord {
    id: number
    title: string
    content: string
    boardName: string
    status: number
    createdAt: string
    publishedAt: string
    isLiked: boolean
    likedNum: number | null
    isFavorited?: boolean
    favoritedNum?: number | null
    authorNickname?: string
    authorAvatar?: string
    viewCount?: number
}

export interface PageResponse {
    records: PostRecord[]
    total: number
    size: number
    current: number
    pages: number
}

export async function getPostById(postId: number): Promise<PostRecord | null> {
    const params = new URLSearchParams({ current: '1', size: '1', postId: String(postId) })
    const page = await api.get<PageResponse>(`/java/post/page?${params.toString()}`)
    return page.records?.[0] ?? null
}

// 获取帖子详情
export async function getPostDetail(postId: number): Promise<PostRecord> {
    return await api.get<PostRecord>(`/java/post/detail?postId=${postId}`)
}

// 删除帖子
export async function deletePost(postId: number): Promise<void> {
    await api.post<void>(`/java/post/delete?postId=${postId}`)
}

// 获取我的帖子
export async function getMyPosts(current: number = 1, size: number = 10, title?: string): Promise<PageResponse> {
    const params = new URLSearchParams({
        current: String(current),
        size: String(size)
    })
    if (title) {
        params.append('title', title)
    }
    return await api.get<PageResponse>(`/java/post/my-posts?${params.toString()}`)
}

// 点赞列表项（接口返回的数据结构）
export interface LikedPostItem {
    title: string
    content: string
    id?: number  // 如果后端返回了 id
    postId?: number  // 如果后端返回了 postId
    likeTime?: string  // 如果后端返回了点赞时间
}

// 点赞列表响应
export interface LikedPostPageResponse {
    records: LikedPostItem[]
    total: number
    size: number
    current: number
    pages: number
}

// 获取点赞列表
export async function getLikedPosts(current: number = 1, size: number = 10, keyword?: string): Promise<LikedPostPageResponse> {
    const params = new URLSearchParams({
        current: String(current),
        size: String(size)
    })
    if (keyword) {
        params.append('keyword', keyword)
    }
    return await api.get<LikedPostPageResponse>(`/java/post/liked-by-user?${params.toString()}`)
}

// 收藏列表项（接口返回的数据结构）
export interface FavoritedPostItem {
    postId: number
    title: string
    content: string
}

// 收藏列表响应
export interface FavoritedPostPageResponse {
    records: FavoritedPostItem[]
    total: number
    size: number
    current: number
    pages: number
}

// 获取收藏列表
export async function getFavoritedPosts(current: number = 1, size: number = 10, keyword?: string): Promise<FavoritedPostPageResponse> {
    const params = new URLSearchParams({
        current: String(current),
        size: String(size)
    })
    if (keyword) {
        params.append('keyword', keyword)
    }
    return await api.get<FavoritedPostPageResponse>(`/java/post/favorited-by-user?${params.toString()}`)
}

// 获取置顶帖子列表
export async function getTopPosts(): Promise<PostRecord[]> {
    return await api.get<PostRecord[]>('/java/post/top')
}

// 切换帖子置顶状态
export async function toggleTop(postId: number): Promise<string> {
    return await api.post<string>(`/java/post/toggle-top?postId=${postId}`)
}


export interface TranslateRequest {
    text: string
    targetLang?: string
}

/**
 * 文本翻译
 * @param payload { text: "你好", targetLang: "" }
 * @returns 翻译后的字符串
 */
export async function translateText(payload: TranslateRequest): Promise<string> {
    return await api.post<string>('/java/translation/text', payload)
}

// 帖子申诉请求参数
export interface PostAppealSubmitRequest {
    postId: number
    reason: string
}

/**
 * 提交帖子申诉
 * @param payload { postId: 1, reason: "申诉原因" }
 * @returns 返回提示信息，如 "申诉已提交，请等待人工审核"
 */
export async function submitAppeal(payload: PostAppealSubmitRequest): Promise<string> {
    return await api.post<string>('/java/post/appeal/submit', payload)
}

