import { api } from '@/utils/request'

// 一级评论（回复帖子）
export interface CreateArticleCommentRequest {
    postId: number | string
    contentMd: string
}

// 回复评论
export interface ReplyCommentRequest {
    parentId: number | string
    contentMd: string
}

// 评论项（层级结构）
export interface CommentItem {
    callId?: number  // 一级评论的 id
    id?: number  // 回复评论的 id
    postId: number
    userId?: string
    fromUserId?: string
    fromNickname: string
    toUserId?: string
    toNickname?: string
    nickname?: string
    contentMd: string
    createdAt: string
    replies?: CommentItem[]
    children?: CommentItem[]
}

// 创建一级评论（回复帖子）
export async function createArticleComment(payload: CreateArticleCommentRequest): Promise<void> {
    await api.post<void>('/java/comment/article', {
        postId: String(payload.postId),
        contentMd: payload.contentMd
    })
}

// 回复评论
export async function replyComment(payload: ReplyCommentRequest): Promise<void> {
    await api.post<void>('/java/comment/reply', {
        parentId: String(payload.parentId),
        contentMd: payload.contentMd
    })
}

// 获取评论列表
export async function getCommentList(postId: number | string): Promise<CommentItem[]> {
    return await api.get<CommentItem[]>(`/java/comment/list?postId=${postId}`)
}

// 删除评论
export async function deleteComment(commentId: number | string): Promise<void> {
    await api.post<void>(`/java/comment/delete?targetId=${commentId}`)
}

// 用户评论列表项（接口返回的数据结构）
export interface UserCommentItem {
    postId: number
    content: string
    createdAt: string
}

// 用户评论列表响应
export interface UserCommentPageResponse {
    list: UserCommentItem[]
    total: number
    pageNo: number
    pageSize: number
}

// 获取用户评论列表
export async function getUserComments(
    current: number = 1,
    size: number = 10,
    keyword?: string
): Promise<UserCommentPageResponse> {
    const params = new URLSearchParams({
        current: String(current),
        size: String(size)
    })
    if (keyword) {
        params.append('keyword', keyword)
    }
    return await api.get<UserCommentPageResponse>(`/java/comment/by-user?${params.toString()}`)
}
