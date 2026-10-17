import { api } from '@/utils/request'

export async function doFavorite(targetId: number): Promise<void> {
    await api.post<void>('/java/favorite/do', undefined, { params: { targetId } } as any)
}

export async function undoFavorite(targetId: number): Promise<void> {
    await api.post<void>('/java/favorite/undo', undefined, { params: { targetId } } as any)
}

