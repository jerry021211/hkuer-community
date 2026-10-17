<script setup lang="ts">
  import { onMounted } from 'vue'
  import { RouterView, useRouter } from 'vue-router'
  import { getCurrentUser } from '@/utils/auth'
  import { useAutoLogout, checkStartupTimeout } from '@/hook/useAutoLogout'
  import { logout } from '@/api/user'
  
  const router = useRouter()
  
  const isSessionValid = checkStartupTimeout();
  
  if (!isSessionValid) {
  console.log('App启动检测：离线时间过长');
  
  // ✅ 核心修复：如果判定离线超时，必须调用 logout 清除后端 Cookie
  // 这里不需要 await，fire-and-forget 即可，主要是为了发请求给后端
  logout().then(() => {
    console.log('后端 Cookie 已清理');
  });

  // 同时也清理掉本地的时间记录（双重保险）
  localStorage.removeItem('last_active_time');
} else {
  // 只有检查通过，才启动监控
  useAutoLogout();
}
  
  /**
   * 应用启动时验证登录状态
   */
  onMounted(async () => {
    const currentPath = window.location.pathname
    if (router.resolve(currentPath).meta.requiresAuth === false) {
      return
    }
  
    // 3. 再次处理离线超时的跳转 (双重保险)
    if (!isSessionValid) {
      router.push({
        path: '/login',
        query: { redirect: currentPath }
      }).catch(() => {})
      return; // ⛔️ 阻止后续逻辑
    }
  
    // --- 下面是原有的后端验证逻辑 ---
    try {
      const userInfo = await getCurrentUser()
      if (!userInfo) {
        if (currentPath !== '/login') {
          router.push({
            path: '/login',
            query: { redirect: currentPath }
          }).catch(() => {})
        }
      }
    } catch (error) {
      console.error('应用启动验证登录状态失败:', error)
      if (currentPath !== '/login') {
        router.push({
          path: '/login',
          query: { redirect: currentPath }
        }).catch(() => {})
      }
    }
  })
  </script>
  
  <template>
    <a-config-provider>
      <div class="app">
        <RouterView />
      </div>
    </a-config-provider>
  </template>
  
  <style scoped>
  .app {
    width: 100%;
    margin: 0 auto;
    height: 100vh;
    text-align: center;
  }
  </style>
