import { api } from '@/utils/request'
import type { Page, MeshPost, MeshAnswer } from './api'
export interface Conversation {
    id: string
    peerId: string
    peerName: string
    peerAvatar?: string
    contextPostId: string
    contextTitle?: string
    contextImage?: string
    contextKind?: string
    contextPrice?: number
    lastMessage?: string
    unread: number
    updatedAt: string
}
export interface ChatMessage {
    readByPeer?: boolean
    id: string
    senderId: string
    content: string
    createdAt: string
}
export interface Notice {
    id: string
    kind: string
    title: string
    content: string
    targetPath: string
    isRead: boolean
    createdAt: string
}
export interface Profile {
    postCounts?: Record<string,number>
    stats?: { posts: number; answers: number; accepted: number; reviews: number; likes: number }
    bookmarkedCourses?: MeshPost[]
    activeBadge?: string
    badges?: { code: string; name: string; description: string; symbol: string }[]
    userId: string
    nickname: string
    avatar?: string
    bio: string
    email?: string
    skills: string[]
    github: string
    linkedin: string
    website: string
    verifiedHku: boolean
    createdAt: string
    own: boolean
    posts: MeshPost[]
    answers: MeshAnswer[]
    favorites?: MeshPost[]
    watched?: MeshPost[]
    groups?: { id: string; name: string; courseId: string }[]
    smoking?: string
    sleepSchedule?: string
    cleanliness?: string
    occupation?: string
}
export const social = {
    badges: (id: string) =>
        api.get<{ code: string; name: string; description: string; symbol: string }[]>(
            `/java/mesh/public/users/${id}/badges`
        ),
    wear: (code: string) => api.post('/java/mesh/profile/badge', { code }),
    profile: (id: string) => api.get<Profile>(`/java/mesh/public/users/${encodeURIComponent(id)}`),
    profileContent: (id: string, section: string, filter: string, current: number) =>
        api.get<Page<Pick<MeshPost, 'id' | 'title' | 'kind' | 'createdAt'>>>(`/java/mesh/public/users/${encodeURIComponent(id)}/content`, { params: { section, filter, current, size: 20 } }),
    updateProfile: (profile: unknown) => api.post('/java/mesh/profile', profile),
    conversations: () => api.get<Conversation[]>('/java/mesh/conversations'),
    start: (peerId: string, contextPostId = '0') =>
        api.post<string>('/java/mesh/conversations', { peerId, contextPostId }),
    messages: (id: string, before = '0') =>
        api.get<ChatMessage[]>(`/java/mesh/conversations/${id}/messages`, { params: { before } }),
    send: (id: string, content: string, clientId: string) =>
        api.post(`/java/mesh/conversations/${id}/messages`, { content, clientId }),
    read: (id: string, lastId = '0') => api.post(`/java/mesh/conversations/${id}/read`, { lastId }),
    notifications: (current = 1, kind = 'interaction') =>
        api.get<Page<Notice>>('/java/mesh/notifications', { params: { current, size: 20, kind } }),
    readNotice: (id = '0') => api.post(`/java/mesh/notifications/${id}/read`)
}
