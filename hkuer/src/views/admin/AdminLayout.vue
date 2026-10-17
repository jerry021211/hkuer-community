<script setup lang="ts">
import AdminSidebar from '@/components/AdminSidebar/index.vue'
</script>

<template>
  <div class="admin-layout">
    <AdminSidebar />
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f0f5ff;
}

.admin-main {
  flex: 1;
  margin-left: 260px;
  padding: 32px 40px;
  min-height: 100vh;
}

@media (max-width: 1024px) {
  .admin-main {
    margin-left: 80px;
    padding: 24px;
  }
}
</style>
