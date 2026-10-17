import { ref } from 'vue'
import { api } from '@/utils/request'
import { logout } from '@/api/user'
import { getCurrentUser } from '@/utils/auth'
export interface MeshSession {
    userId: string
    nickname: string
    avatar?: string
    usertype: number
}
export const meshUser = ref<MeshSession | null>(null)
export const authDialog = ref<'login' | 'register' | null>(null)
export async function loadSession() {
    meshUser.value = await api.get<MeshSession | null>('/java/mesh/public/session')
    // A public endpoint permits guests; renew an expired session through the existing
    // authenticated endpoint only when this browser previously signed in.
    if (!meshUser.value && localStorage.getItem('user_info')) {
        if (await getCurrentUser(true)) {
            meshUser.value = await api.get<MeshSession | null>('/java/mesh/public/session')
        }
    }
    return meshUser.value
}
export function requireSession() {
    if (!meshUser.value) {
        authDialog.value = 'login'
        return false
    }
    return true
}
export async function endSession() {
    await logout()
    meshUser.value = null
}
