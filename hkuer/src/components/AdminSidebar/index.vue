<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

interface NavItem {
  icon: string
  label: string
  path: string
}

const menuItems: NavItem[] = [
  { icon: '◐', label: 'Dashboard', path: '/admin' },
  // { icon: '◫', label: 'Analytics', path: '/admin/analytics' },
  { icon: '◧', label: '封禁管理', path: '/admin/ban' },
  { icon: '▤', label: '权限管理', path: '/admin/usertype' },
  { icon: '◪', label: '举报处理', path: '/admin/reports' },
  { icon: '△', label: '申诉处理', path: '/admin/appeals' },
  { icon: '▦', label: '社区内容', path: '/admin/content' },
  { icon: '⚙', label: 'Settings', path: '/admin/settings' },
]

function isActive(path: string): boolean {
  if (path === '/admin') {
    return route.path === '/admin' || route.path === '/admin/'
  }
  return route.path.startsWith(path)
}

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <aside class="admin-sidebar">
    <div class="logo">
      <span class="logo-icon">◈</span>
      <span class="logo-text">ADMIN</span>
    </div>

    <nav class="nav">
      <button
        v-for="item in menuItems"
        :key="item.path"
        :class="['nav-item', { active: isActive(item.path) }]"
        @click="goTo(item.path)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="avatar">A</div>
        <div class="user-details">
          <div class="user-name">Admin User</div>
          <div class="user-role">Super Admin</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1677ff 0%, #4096ff 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  box-shadow: 4px 0 20px rgba(22, 119, 255, 0.15);
}

.logo {
  padding: 32px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 4px;
}

.nav {
  flex: 1;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  text-align: left;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  color: #1677ff;
  background: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #fff;
  color: #1677ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
}

.user-role {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

@media (max-width: 1024px) {
  .admin-sidebar {
    width: 80px;
  }

  .logo-text,
  .nav-label,
  .user-details {
    display: none;
  }

  .logo {
    justify-content: center;
    padding: 24px 16px;
  }

  .nav-item {
    justify-content: center;
    padding: 14px;
  }

  .user-info {
    justify-content: center;
  }
}
</style>
