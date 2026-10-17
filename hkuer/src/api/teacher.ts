import { api } from '@/utils/request'

// 教师/商品实体（对应后端 Teacher 类）
export interface TeacherItem {
    id: string
    name: string
    totalScore: number
    ratingCount: number
    averageRating: number
    description?: string
    userRating?: number
}

// 教师列表分页响应
export interface TeacherPageResponse {
    records: TeacherItem[]
    total: number
    size: number
    current: number
    pages: number
}

// 获取教师/商品列表
export async function getTeacherList(current: number = 1, size: number = 6, sortDesc: boolean = true): Promise<TeacherPageResponse> {
    const params = new URLSearchParams({
        page: String(current), // 注意：你的后端 Controller 接收的是 page 和 size
        size: String(size),
        isDesc: String(sortDesc)
    })

    // 这里假设你的网关/代理前缀也是 /java，如果不是请去掉 /java
    return await api.get<TeacherPageResponse>(`/java/rating/list?${params.toString()}`)
}

/**
 * 提交评分
 * 对应后端: @PostMapping("/add") @RequestParam String teacherId, @RequestParam Integer score
 */
export async function rateTeacher(teacherId: string, score: number): Promise<string> {
    // 因为后端用的是 @RequestParam，可以使用 Query String 的方式传参
    // 参考你的 deletePost 写法: `/java/post/delete?postId=${postId}`
    const params = new URLSearchParams({
        teacherId: teacherId,
        score: String(score)
    })

    return await api.post<string>(`/java/rating/add?${params.toString()}`)
}

/**
 * 获取单个教师详情
 * 对应后端: @GetMapping("/info")
 */
export async function getTeacherInfo(teacherId: string): Promise<TeacherItem> {
    const params = new URLSearchParams({ teacherId })
    return await api.get<TeacherItem>(`/java/rating/info?${params.toString()}`)
}

// ========== 教师评论相关 ==========
// 与后端分页返回字段一致：id, userId, nickname, avatar, content, createdAt

export interface TeacherComment {
    id: number
    userId: string
    nickname: string
    avatar: string
    content: string
    createdAt: string
}

export interface TeacherCommentPageResponse {
    records: TeacherComment[]
    total: number
    current: number
    size: number
    pages: number
}

/**
 * 分页查询教师评论
 * 对应后端: @GetMapping("/page") teacherId, page, size
 */
export async function getTeacherComments(teacherId: string, page: number = 1, size: number = 10): Promise<TeacherCommentPageResponse> {
    const params = new URLSearchParams({
        teacherId,
        page: String(page),
        size: String(size)
    })
    return await api.get<TeacherCommentPageResponse>(`/java/course-comment/page?${params.toString()}`)
}

/**
 * 发表教师评论
 * 对应后端: @PostMapping("/add") @RequestBody TeacherCommentInsertRequest { teacherId, content }
 */
export async function addTeacherComment(teacherId: string, content: string): Promise<string> {
    return await api.post<string>('/java/course-comment/add', { teacherId, content })
}

/**
 * 删除教师评论
 */
export async function deleteTeacherComment(commentId: number): Promise<string> {
    return await api.post<string>(`/java/rating/comment/delete?commentId=${commentId}`)
}