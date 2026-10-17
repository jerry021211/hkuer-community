import { API_BASE_URL } from '@/utils/config'
import type { ApiResponse } from '@/utils/config'
import { api } from '@/utils/request'

/**
 * 获取在线人数
 * 此接口不需要 token，已加入白名单
 */
export async function getOnlineCount(): Promise<number> {
  try {
    const url = `${API_BASE_URL}/java/online/count`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit', // 不携带 cookies，确保不发送 token
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const result: ApiResponse<{ onlineCount: number }> = await response.json()
    if (result.code === '200' && result.data) {
      return result.data.onlineCount
    }
    return 0
  } catch (error) {
    console.error('Failed to fetch online count:', error)
    return 0
  }
}

/**
 * 获取用户总数
 * 需要 token 鉴权
 */
export async function getUserCount(): Promise<number> {
  try {
    const count = await api.get<number>('/java/console/user/count')
    return count || 0
  } catch (error) {
    console.error('Failed to fetch user count:', error)
    return 0
  }
}

/**
 * 获取帖子总数
 * 需要 token 鉴权
 */
export async function getPostCount(): Promise<number> {
  try {
    const count = await api.get<number>('/java/console/post/count')
    return count || 0
  } catch (error) {
    console.error('Failed to fetch post count:', error)
    return 0
  }
}

/**
 * 获取评论总数
 * 需要 token 鉴权
 */
export async function getCommentCount(): Promise<number> {
  try {
    const count = await api.get<number>('/java/console/comment/count')
    return count || 0
  } catch (error) {
    console.error('Failed to fetch comment count:', error)
    return 0
  }
}

// ============ 用户管理接口 ============

export interface UserInfo {
  userId: string
  username: string
  nickname: string
  email: string | null
  usertype: number
  status: number
  statusDesc: string
  muteEndTime: string | null
  banEndTime: string | null
  createdAt: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
  pages: number
}

/**
 * 获取用户列表（支持分页、邮箱和昵称搜索）
 */
export async function getUserList(params?: {
  page?: number
  size?: number
  email?: string
  nickname?: string
}): Promise<PageResult<UserInfo>> {
  const query = new URLSearchParams()
  if (params?.page) query.append('page', String(params.page))
  if (params?.size) query.append('size', String(params.size))
  if (params?.email) query.append('email', params.email)
  if (params?.nickname) query.append('nickname', params.nickname)
  const queryStr = query.toString()
  const url = `/java/console/user/list${queryStr ? '?' + queryStr : ''}`
  return await api.get<PageResult<UserInfo>>(url)
}

/**
 * 获取全部用户列表（含管理员，支持分页、邮箱和昵称搜索）
 */
export async function getAllUserList(params?: {
  page?: number
  size?: number
  email?: string
  nickname?: string
}): Promise<PageResult<UserInfo>> {
  const query = new URLSearchParams()
  if (params?.page) query.append('page', String(params.page))
  if (params?.size) query.append('size', String(params.size))
  if (params?.email) query.append('email', params.email)
  if (params?.nickname) query.append('nickname', params.nickname)
  const queryStr = query.toString()
  const url = `/java/console/user/all-list${queryStr ? '?' + queryStr : ''}`
  return await api.get<PageResult<UserInfo>>(url)
}

/**
 * 更新用户权限（usertype: 1=管理员, 0=普通用户）
 */
export async function updateUserType(userId: string, usertype: number): Promise<string> {
  return await api.post<string>(`/java/console/user/update-usertype?userId=${encodeURIComponent(userId)}&usertype=${usertype}`)
}

/**
 * 禁言用户
 */
export async function muteUser(userId: string, days: number): Promise<string> {
  return await api.post<string>(`/java/console/user/mute?userId=${encodeURIComponent(userId)}&days=${days}`)
}

/**
 * 封号用户
 */
export async function banUser(userId: string, days: number): Promise<string> {
  return await api.post<string>(`/java/console/user/ban?userId=${encodeURIComponent(userId)}&days=${days}`)
}

/**
 * 解除禁言
 */
export async function unmuteUser(userId: string): Promise<string> {
  return await api.post<string>(`/java/console/user/unmute?userId=${encodeURIComponent(userId)}`)
}

/**
 * 解除封号
 */
export async function unbanUser(userId: string): Promise<string> {
  return await api.post<string>(`/java/console/user/unban?userId=${encodeURIComponent(userId)}`)
}

// ============ 举报管理接口 ============

export interface ReportInfo {
  id: number
  reporterId: string
  reporterUsername: string
  reporterNickname: string
  createTime: string
  targetId: string
  targetType: string
  targetUserId: string
  targetUsername: string
  targetNickname: string
  reason: string
  reasonDetail: string
  images: string | null
  status: number
  handlerId: string
  handleTime: string | null
  handleNote: string | null
}

/**
 * 获取举报总数量
 */
export async function getReportCount(): Promise<number> {
  try {
    const count = await api.get<number>('/java/console/report/count')
    return count || 0
  } catch (error) {
    console.error('Failed to fetch report count:', error)
    return 0
  }
}

/**
 * 获取待处理举报数量
 */
export async function getPendingReportCount(): Promise<number> {
  try {
    const count = await api.get<number>('/java/console/report/pending-count')
    return count || 0
  } catch (error) {
    console.error('Failed to fetch pending report count:', error)
    return 0
  }
}

/**
 * 获取待处理举报列表（分页）
 */
export async function getPendingReports(params?: {
  page?: number
  size?: number
}): Promise<PageResult<ReportInfo>> {
  const query = new URLSearchParams()
  if (params?.page) query.append('page', String(params.page))
  if (params?.size) query.append('size', String(params.size))
  const queryStr = query.toString()
  const url = `/java/console/report/pending-list${queryStr ? '?' + queryStr : ''}`
  return await api.get<PageResult<ReportInfo>>(url)
}

/**
 * 处理举报
 */
export async function handleReport(data: {
  reportId: string
  status: number
  handleNote: string
}): Promise<string> {
  return await api.post<string>('/java/console/report/handle', data)
}

// ============ 申诉管理接口 ============

export interface AppealInfo {
  id: number
  postId: number
  userId: string
  reason: string
  status: number
  adminReply: string | null
  handleTime: string | null
  createTime: string
}

/**
 * 获取申诉总数量
 */
export async function getAppealCount(): Promise<number> {
  try {
    const count = await api.get<number>('/java/console/appeal/count')
    return count || 0
  } catch (error) {
    console.error('Failed to fetch appeal count:', error)
    return 0
  }
}

/**
 * 获取待处理申诉数量
 */
export async function getPendingAppealCount(): Promise<number> {
  try {
    const count = await api.get<number>('/java/console/appeal/pending-count')
    return count || 0
  } catch (error) {
    console.error('Failed to fetch pending appeal count:', error)
    return 0
  }
}

/**
 * 获取待处理申诉列表（不分页，前端分页）
 */
export async function getPendingAppeals(): Promise<AppealInfo[]> {
  try {
    const list = await api.get<AppealInfo[]>('/java/console/appeal/pending-list')
    return list || []
  } catch (error) {
    console.error('Failed to fetch pending appeals:', error)
    return []
  }
}

/**
 * 处理申诉（审核）
 * 后端入参：{ appealId: Long, pass: Boolean, reply: String }
 */
export async function handleAppeal(data: {
  appealId: string
  pass: boolean
  reply: string
}): Promise<string> {
  return await api.post<string>('/java/console/appeal/audit', data)
}