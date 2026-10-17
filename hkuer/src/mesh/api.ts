import { api } from '@/utils/request'
export interface MeshPost {
    id: string
    title: string
    content: string
    kind: string
    category?: string
    status: number
    authorId?: string
    authorName: string
    authorAvatar?: string
    anonymous?: boolean
    own?: boolean
    locked?: boolean
    createdAt: string
    images: string[]
    tags: string[]
    region?: string
    rating?: number
    company?: string
    role?: string
    courseId?: string
    conditionLabel?: string
    approximate?: boolean
    gender?: string
    likeCount: number
    favoriteCount: number
    answerCount: number
    commentCount: number
    sameCount: number
    viewCount: number
    liked: boolean
    favorited: boolean
    same: boolean
    watching: boolean
    disliked?: boolean
    matchScore?: number
    matchReasons?: string[]
    price?: number
    negotiable?: boolean
    brand?: string
    tradeLocation?: string
    saleStatus?: string
    rentalType?: string
    rent?: number
    budgetMin?: number
    budgetMax?: number
    moveIn?: string
    leaseTerm?: string
    roomTypes?: string[]
    habits?: string[]
    listingStatus?: string
}
export interface MeshAnswer {
    id: string
    questionId: string
    authorId?: string
    authorName: string
    authorAvatar?: string
    content: string
    createdAt: string
    liked: boolean
    likeCount: number
    own: boolean
    accepted: boolean
    anonymous: boolean
}
export interface Page<T> {
    records: T[]
    total: number
    current: number
    size: number
    pages: number
}
export interface HomeInfo {
    announcements: { id: string; title: string; content: string; createdAt: string; pinned?: boolean; category?: string }[]
    questionCount: number
    answerCount: number
}
export const contentApi = {
    list: (params: Record<string, unknown>) => api.get<Page<MeshPost>>('/java/mesh/public/content', { params }),
    detail: (id: string) => api.get<MeshPost>(`/java/mesh/public/content/${id}`),
    home: () => api.get<HomeInfo>('/java/mesh/public/home'),
    create: (data: unknown) => api.post<string>('/java/mesh/content', data),
    editable: (id: string) => api.get<MeshPost>(`/java/mesh/content/${id}/edit`),
    update: (id: string, data: unknown) => api.post<string>(`/java/mesh/content/${id}/edit`, data),
    answers: (id: string) => api.get<MeshAnswer[]>(`/java/mesh/public/questions/${id}/answers`),
    answer: (id: string, content: string, anonymous: boolean) =>
        api.post(`/java/mesh/questions/${id}/answers`, { content, anonymous }),
    updateAnswer: (id:string,content:string,anonymous:boolean) => api.post(`/java/mesh/answers/${id}/edit`,{content,anonymous}),
    interaction: (id: string, kind: string, enabled: boolean) =>
        api.post(`/java/mesh/questions/${id}/interaction`, { kind, enabled }),
    answerAction: (id: string, kind: string, enabled = true) =>
        api.post(`/java/mesh/answers/${id}/interaction`, { kind, enabled }),
    like: (id: string, enabled: boolean) => api.post(`/java/like/${enabled ? 'do' : 'undo'}?targetId=${id}`),
    favorite: (id: string, enabled: boolean) => api.post(`/java/favorite/${enabled ? 'do' : 'undo'}?targetId=${id}`),
    remove: (id: string) => api.post(`/java/post/delete?postId=${id}`),
    upload: (file: File) => {
        const data = new FormData()
        data.append('file', file)
        data.append('module', 'post')
        return api.post<string>('/java/file/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
}
export const plainText = (html: string) => {
    const document = new DOMParser().parseFromString(html || '', 'text/html')
    return document.body.textContent || ''
}
export const dateText = (value: string) =>
    value
        ? new Date(value).toLocaleString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
          })
        : ''
