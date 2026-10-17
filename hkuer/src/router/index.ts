import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import userHomeRoutes from './userface'
import adminRoutes from './admin'
import { meshRoutes } from './mesh'
import { getCurrentUser } from '@/utils/auth'
import { getUserType } from '@/api/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    meshRoutes,
    {
      ...userHomeRoutes,
      meta: { requiresAuth: true }
    },
    adminRoutes,
  ],
})

// 白名单路径（不需要登录验证的路径）
const whiteList = ['/login', '/register']

/**
 * 路由守卫：验证登录状态，支持自动登录
 */
router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next) => {
  // 如果是白名单路径，直接放行
  if (to.meta.requiresAuth === false || whiteList.includes(to.path)) {
    next()
    return
  }

  // 需要登录验证的路径
  try {
    // 调用getCurrentUser验证登录状态
    // 如果token过期但refreshToken有效，会自动刷新token（自动登录）
    const userInfo = await getCurrentUser()

    if (userInfo) {
      // 已登录，检查是否需要管理员权限
      if (to.meta.requiresAdmin) {
        try {
          const userType = await getUserType()
          // userType === 1 表示管理员
          if (userType === 1) {
            next()
          } else {
            // 非管理员，重定向到首页
            console.warn('Access denied: Admin privileges required')
            next({ path: '/user/home' })
          }
        } catch (error) {
          console.error('Failed to verify admin status:', error)
          next({ path: '/user/home' })
        }
      } else {
        // 不需要管理员权限，继续访问
        next()
      }
    } else {
      // 未登录或token都过期了，跳转到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    }
  } catch (error) {
    // 验证失败，跳转到登录页
    console.error('路由守卫验证失败:', error)
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
})

export default router
