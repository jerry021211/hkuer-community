<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAllUserList, updateUserType, type UserInfo } from '@/api/console'

// 搜索参数
const searchEmail = ref('')
const searchNickname = ref('')

// 分页参数
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(0)

// 用户列表
const userList = ref<UserInfo[]>([])
const loading = ref(false)

// 模态框状态
const showModal = ref(false)
const modalUser = ref<UserInfo | null>(null)
const modalAction = ref<'add' | 'remove'>('add') // add=设为管理员, remove=解除管理员
const actionLoading = ref(false)

// 获取用户列表
async function fetchUsers() {
  loading.value = true
  try {
    const params: { page?: number; size?: number; email?: string; nickname?: string } = {
      page: currentPage.value,
      size: pageSize.value
    }
    if (searchEmail.value.trim()) params.email = searchEmail.value.trim()
    if (searchNickname.value.trim()) params.nickname = searchNickname.value.trim()
    const result = await getAllUserList(params)
    userList.value = result.records
    total.value = result.total
    totalPages.value = result.pages
  } catch (error: any) {
    console.error('获取用户列表失败:', error)
    userList.value = []
    total.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  currentPage.value = 1
  fetchUsers()
}

// 重置搜索
function handleReset() {
  searchEmail.value = ''
  searchNickname.value = ''
  currentPage.value = 1
  fetchUsers()
}

// 切换页码
function handlePageChange(page: number) {
  currentPage.value = page
  fetchUsers()
}

// 获取角色标签
function getRoleLabel(usertype: number): string {
  return usertype === 1 ? '管理员' : '普通用户'
}

// 获取角色 CSS 类名
function getRoleClass(usertype: number): string {
  return usertype === 1 ? 'role-admin' : 'role-user'
}

// 格式化时间
function formatTime(time: string | null): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 打开模态框
function openModal(user: UserInfo, action: 'add' | 'remove') {
  modalUser.value = user
  modalAction.value = action
  showModal.value = true
}

// 关闭模态框
function closeModal() {
  showModal.value = false
  modalUser.value = null
}

// 获取模态框标题
function getModalTitle(): string {
  return modalAction.value === 'add' ? '设为管理员' : '解除管理员'
}

// 获取模态框描述
function getModalDescription(): string {
  const name = modalUser.value?.nickname || modalUser.value?.username || ''
  return modalAction.value === 'add'
    ? `确定要将用户「${name}」设为管理员吗？`
    : `确定要解除用户「${name}」的管理员权限吗？`
}

// 获取分页数字数组
function getPageNumbers(): number[] {
  const pages: number[] = []
  const maxVisible = 7
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
}

// 确认操作
async function confirmAction() {
  if (!modalUser.value) return
  actionLoading.value = true
  try {
    const userId = modalUser.value.userId
    const usertype = modalAction.value === 'add' ? 1 : 0
    const msg = await updateUserType(userId, usertype)
    alert(msg || '操作成功')
    closeModal()
    await fetchUsers()
  } catch (error: any) {
    alert(error.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="ban-management">
    <header class="page-header">
      <h1 class="page-title">权限管理</h1>
      <p class="page-subtitle">管理用户的管理员权限</p>
    </header>

    <section class="search-section">
      <div class="search-form">
        <div class="search-field">
          <label class="search-label">邮箱</label>
          <input
            v-model="searchEmail"
            type="text"
            class="search-input"
            placeholder="输入邮箱搜索..."
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="search-field">
          <label class="search-label">昵称</label>
          <input
            v-model="searchNickname"
            type="text"
            class="search-input"
            placeholder="输入昵称搜索..."
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="search-actions">
          <button class="btn btn-primary" @click="handleSearch">搜索</button>
          <button class="btn btn-secondary" @click="handleReset">重置</button>
        </div>
      </div>
    </section>

    <section class="table-section">
      <div class="table-card">
        <div class="card-header">
          <h2 class="card-title">用户列表</h2>
          <span class="user-count">共 {{ total }} 条记录</span>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else-if="userList.length === 0" class="empty-state">
          <span class="empty-icon">◇</span>
          <p>暂无用户数据</p>
        </div>

        <table v-else class="data-table">
          <colgroup>
            <col style="width: 15%" />
            <col style="width: 15%" />
            <col style="width: 22%" />
            <col style="width: 12%" />
            <col style="width: 18%" />
            <col style="width: 18%" />
          </colgroup>
          <thead>
            <tr>
              <th>用户名</th>
              <th>昵称</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userList" :key="user.userId">
              <td class="mono text-ellipsis" :title="user.username">{{ user.username }}</td>
              <td class="bold text-ellipsis" :title="user.nickname">{{ user.nickname }}</td>
              <td class="muted-text text-ellipsis" :title="user.email ?? undefined">{{ user.email || '-' }}</td>
              <td>
                <span :class="['status-badge', getRoleClass(user.usertype)]">
                  {{ getRoleLabel(user.usertype) }}
                </span>
              </td>
              <td class="muted-text small-date">{{ formatTime(user.createdAt) }}</td>
              <td class="actions-cell">
                <template v-if="user.usertype === 1">
                  <button class="btn btn-warn btn-sm" @click="openModal(user, 'remove')">解除管理员</button>
                </template>
                <template v-else>
                  <button class="btn btn-primary btn-sm" @click="openModal(user, 'add')">设为管理员</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页器 -->
        <div v-if="!loading && userList.length > 0" class="pagination-wrapper">
          <div class="pagination-info">
            显示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} 条，共 {{ total }} 条
          </div>
          <div class="pagination">
            <button
              class="pagination-btn"
              :disabled="currentPage === 1"
              @click="handlePageChange(currentPage - 1)"
            >
              上一页
            </button>
            <div class="pagination-pages">
              <button
                v-for="page in getPageNumbers()"
                :key="page"
                :class="['pagination-page', { active: page === currentPage }]"
                @click="handlePageChange(page)"
              >
                {{ page }}
              </button>
            </div>
            <button
              class="pagination-btn"
              :disabled="currentPage >= totalPages"
              @click="handlePageChange(currentPage + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">{{ getModalTitle() }}</h3>
            <button class="modal-close" @click="closeModal">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc">{{ getModalDescription() }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModal" :disabled="actionLoading">取消</button>
            <button
              :class="['btn', modalAction === 'add' ? 'btn-primary' : 'btn-warn']"
              @click="confirmAction"
              :disabled="actionLoading"
            >
              {{ actionLoading ? '处理中...' : '确认' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ban-management {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1e3a5f;
}

/* 页面标题 */
.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 14px;
  color: #888;
  font-weight: 400;
}

/* 搜索区域 */
.search-section {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px 28px;
  margin-bottom: 24px;
}

.search-form {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 200px;
}

.search-label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
  background: #fafafa;
}

.search-input:focus {
  border-color: #1677ff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.08);
}

.search-input::placeholder {
  color: #bbb;
}

.search-actions {
  display: flex;
  gap: 10px;
  padding-bottom: 1px;
}

/* 按钮 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #1677ff;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #0958d9;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-warn {
  background: #faad14;
  color: #fff;
}

.btn-warn:hover:not(:disabled) {
  background: #d48806;
}

.btn-danger {
  background: #ff4d4f;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: #cf1322;
}

.btn-success {
  background: #52c41a;
  color: #fff;
}

.btn-success:hover:not(:disabled) {
  background: #389e0d;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  margin-right: 6px;
}
.btn-sm:last-child {
  margin-right: 0;
}

/* 表格区域 */
.table-section {
  margin-bottom: 40px;
}

.table-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 28px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
}

.user-count {
  font-size: 13px;
  color: #888;
  font-weight: 500;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.data-table th {
  text-align: left;
  padding: 14px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background-color: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
  vertical-align: middle;
}

.data-table td {
  text-align: left;
  padding: 14px 12px;
  font-size: 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  color: #334155;
}

.data-table tr:hover {
  background: #f8fafc;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mono {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #64748b;
}

.bold {
  font-weight: 600;
  color: #1e293b;
}

.muted-text {
  color: #94a3b8;
  font-size: 13px;
}

.small-date {
  font-size: 12px;
  color: #94a3b8;
}

.actions-cell {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

/* 角色标签 */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.role-admin {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.role-user {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #888;
  font-size: 14px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e8e8e8;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #bbb;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
}

/* 分页器 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e8e8e8;
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #1677ff;
  color: #1677ff;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: 4px;
}

.pagination-page {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-page:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.pagination-page.active {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px 28px;
}

.modal-desc {
  font-size: 14px;
  color: #555;
  margin-bottom: 4px;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 28px 24px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .search-form {
    flex-direction: column;
    align-items: stretch;
  }

  .search-field {
    min-width: unset;
  }

  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
