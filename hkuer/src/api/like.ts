import { api } from '@/utils/request'

export async function isLiked(targetId: number): Promise<boolean> {
    const result = await api.get<boolean>(`/java/like/is-liked?targetId=${targetId}`)
    return !!result
}

export async function doLike(targetId: number): Promise<number> {
    return await api.post<number>('/java/like/do', undefined, { params: { targetId } } as any)
}

export async function undoLike(targetId: number): Promise<number> {
    return await api.post<number>('/java/like/undo', undefined, { params: { targetId } } as any)
}


