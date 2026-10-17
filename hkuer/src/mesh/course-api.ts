import { api } from '@/utils/request'
import type { Page } from './api'
export interface Course {
    voteNotes?: {rating:number|null;content:string;authorName:string}[]
    recommendCount: number
    dislikeCount: number
    id: string
    code: string
    name: string
    subtitle: string
    level: string
    subject: string
    credits: number
    description: string
    rating: number
    reviewCount: number
    participantCount: number
    participating: boolean
    bookmarked: boolean
    reviews: Review[]
    materials: Material[]
    groups: Group[]
}
export interface Review {
    id: string
    authorName: string
    semester: string
    overall: number
    content: string
    anonymous: boolean
    createdAt: string
    midterm: boolean | null
    finalExam: boolean | null
    openBook: boolean | null
    difficulty: number
    workload: number
    teaching: number
    examDifficulty: number
}
export interface Material {
    id: string
    title: string
    category: string
    url: string
    createdAt: string
}
export interface Group {
    skills: string[]
    id: string
    name: string
    description: string
    capacity: number
    memberCount: number
    joined: boolean
    own: boolean
}
export interface GroupDetail {id:string;name:string;description:string;capacity:number;skills:string[];wechat:string;contactNote:string;own:boolean;members:{userId:string;nickname:string;avatar?:string;owner:boolean}[]}
export const courses = {
    vote: (id: string, recommended: boolean, rating?: number, comment?:string) =>
        api.post(`/java/mesh/courses/${id}/vote`, { recommended, rating, comment }),
    list: (params: Record<string, unknown>) => api.get<Page<Course>>('/java/mesh/public/courses', { params }),
    subjects: (level='') => api.get<{ subject: string; total: number }[]>('/java/mesh/public/courses/subjects',{params:{level}}),
    detail: (id: string) => api.get<Course>(`/java/mesh/public/courses/${id}`),
    action: (id: string, kind: string, enabled: boolean) =>
        api.post(`/java/mesh/courses/${id}/interaction`, { kind, enabled }),
    review: (id: string, data: unknown) => api.post(`/java/mesh/courses/${id}/reviews`, data),
    group: (id: string, data: unknown) => api.post(`/java/mesh/courses/${id}/groups`, data),
    joinGroup: (id: string, enabled: boolean) =>
        api.post(`/java/mesh/groups/${id}/membership`, { kind: 'join', enabled }),
    groupDetail: (id:string) => api.get<GroupDetail>(`/java/mesh/groups/${id}`),
    updateGroup: (id:string,data:unknown) => api.post(`/java/mesh/groups/${id}/edit`,data),
    removeMember: (id:string,member:string) => api.post(`/java/mesh/groups/${id}/members/${member}/remove`),
    closeGroup: (id:string) => api.post(`/java/mesh/groups/${id}/close`),
    material: (id: string, data: unknown) => api.post(`/java/mesh/courses/${id}/materials`, data)
}
