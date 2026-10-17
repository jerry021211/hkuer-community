<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getAppealCount,
  getPendingAppealCount,
  getPendingAppeals,
  handleAppeal,
  type AppealInfo
} from '@/api/console'

// 统计数据
const totalAppealCount = ref(0)
const pendingAppealCount = ref(0)

// 分页参数（前端分页）
const currentPage = ref(1)
const pageSize = ref(10)

// 申诉列表
const appealList = ref<AppealInfo[]>([])
const loading = ref(false)

// 计算属性：总数和总页数
const total = computed(() => appealList.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

// 当前页数据
const paginatedAppeals = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return appealList.value.slice(start, start + pageSize.value)
})

// 处理模态框状态
const showModal = ref(false)
const modalAppeal = ref<AppealInfo | null>(null)
const handleStatus = ref<1 | 2>(1) // 1=同意申诉, 2=驳回申诉
const adminReply = ref('')
const actionLoading = ref(false)

// 获取统计数据
async function fetchCounts() {
  const [totalCount, pendingCount] = await Promise.all([
    getAppealCount(),
    getPendingAppealCount()
  ])
  totalAppealCount.value = totalCount
  pendingAppealCount.value = pendingCount
}

// 获取申诉列表
async function fetchAppeals() {
  loading.value = true
  try {
    const list = await getPendingAppeals()
    appealList.value = list
    // 重置到第一页，避免当前页超出范围
    currentPage.value = 1
  } catch (error: any) {
    console.error('获取申诉列表失败:', error)
    appealList.value = []
  } finally {
    loading.value = false
  }
}

// 切换页码
function handlePageChange(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
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

// 点击帖子跳转到帖子详情
function openPost(appeal: AppealInfo) {
  if (appeal.postId) {
    window.open(`/user/post/${appeal.postId}`, '_blank')
  }
}

// 打开处理模态框
function openModal(appeal: AppealInfo) {
  modalAppeal.value = appeal
  handleStatus.value = 1
  adminReply.value = ''
  showModal.value = true
}

// 关闭处理模态框
function closeModal() {
  showModal.value = false
  modalAppeal.value = null
  adminReply.value = ''
}

// 确认处理
async function confirmHandle() {
  if (!modalAppeal.value) return
  // 驳回时必须填写回复，通过时可以选填
  if (handleStatus.value === 2 && !adminReply.value.trim()) {
    alert('驳回时请填写管理员回复/原因')
    return
  }
  actionLoading.value = true
  try {
    const msg = await handleAppeal({
      appealId: String(modalAppeal.value.id),
      pass: handleStatus.value === 1,
      reply: adminReply.value
    })
    alert(msg || '处理成功')
    closeModal()
    // 刷新列表和计数
    await Promise.all([fetchAppeals(), fetchCounts()])
  } catch (error: any) {
    alert(error.message || '处理失败')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  fetchCounts()
  fetchAppeals()
})
</script>

<template>
  <div class="report-management">
    <header class="page-header">
      <h1 class="page-title">申诉处理</h1>
      <p class="page-subtitle">审核和处理用户关于帖子/行为的申诉</p>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-total">◈</div>
        <div class="stat-info">
          <span class="stat-label">申诉总数</span>
          <span class="stat-value">{{ totalAppealCount }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-pending">◉</div>
        <div class="stat-info">
          <span class="stat-label">待处理申诉</span>
          <span class="stat-value stat-value-pending">{{ pendingAppealCount }}</span>
        </div>
      </div>
    </section>

    <!-- 申诉列表 -->
    <section class="table-section">
      <div class="table-card">
        <div class="card-header">
          <h2 class="card-title">待处理申诉</h2>
          <span class="user-count">共 {{ total }} 条记录</span>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else-if="appealList.length === 0" class="empty-state">
          <span class="empty-icon">◇</span>
          <p>暂无待处理的申诉</p>
        </div>

        <table v-else class="data-table">
          <colgroup>
            <col style="width: 18%" />
            <col style="width: 16%" />
            <col style="width: 30%" />
            <col style="width: 18%" />
            <col style="width: 10%" />
            <col style="width: 8%" />
          </colgroup>
          <thead>
            <tr>
              <th>用户ID</th>
              <th>帖子ID</th>
              <th>申诉理由</th>
              <th>申诉时间</th>
              <th>查看</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appeal in paginatedAppeals" :key="appeal.id">
              <td class="mono text-ellipsis" :title="appeal.userId">{{ appeal.userId }}</td>
              <td class="mono text-ellipsis" :title="String(appeal.postId)">{{ appeal.postId }}</td>
              <td>
                <span
                  class="text-ellipsis clickable-text"
                  :title="appeal.reason"
                >
                  {{ appeal.reason }}
                </span>
              </td>
              <td class="muted-text small-date">{{ formatTime(appeal.createTime) }}</td>
              <td>
                <button
                  class="btn btn-link btn-sm"
                  @click="openPost(appeal)"
                >
                  查看帖子
                </button>
              </td>
              <td class="actions-cell">
                <button class="btn btn-primary btn-sm" @click="openModal(appeal)">处理</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页器 -->
        <div v-if="!loading && appealList.length > 0" class="pagination-wrapper">
          <div class="pagination-info">
            显示第 {{ (currentPage - 1) * pageSize + 1 }} -
            {{ Math.min(currentPage * pageSize, total) }}
            条，共 {{ total }} 条
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
                v-for="page in getPageNumbers()
                "
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

    <!-- 处理模态框 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">处理申诉</h3>
            <button class="modal-close" @click="closeModal">&times;</button>
          </div>
          <div class="modal-body">
            <!-- 申诉信息摘要 -->
            <div class="report-summary">
              <div class="summary-row">
                <span class="summary-label">用户ID</span>
                <span class="summary-value">{{ modalAppeal?.userId }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">帖子ID</span>
                <span class="summary-value">{{ modalAppeal?.postId }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">申诉理由</span>
                <span class="summary-value">{{ modalAppeal?.reason }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">申诉时间</span>
                <span class="summary-value">{{ formatTime(modalAppeal?.createTime || null) }}</span>
              </div>
            </div>

            <!-- 处理结果选择 -->
            <div class="handle-field">
              <label class="handle-label">处理结果</label>
              <div class="handle-options">
                <label :class="['handle-option', { active: handleStatus === 1 }]">
                  <input type="radio" v-model="handleStatus" :value="1" />
                  <span class="option-dot"></span>
                  <span class="option-text">同意申诉（恢复/取消处罚）</span>
                </label>
                <label :class="['handle-option', { active: handleStatus === 2 }]">
                  <input type="radio" v-model="handleStatus" :value="2" />
                  <span class="option-dot"></span>
                  <span class="option-text">驳回申诉（维持原处理）</span>
                </label>
              </div>
            </div>

            <!-- 管理员回复 -->
            <div class="handle-field">
              <label class="handle-label">管理员回复</label>
              <textarea
                v-model="adminReply"
                class="handle-textarea"
                placeholder="请填写处理说明或回复内容..."
                rows="3"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModal" :disabled="actionLoading">取消</button>
            <button
              class="btn btn-primary"
              @click="confirmHandle"
              :disabled="actionLoading"
            >
              {{ actionLoading ? '处理中...' : '确认处理' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.report-management {
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

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 28px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-icon-total {
  background: #eff6ff;
  color: #2563eb;
}

.stat-icon-pending {
  background: #fffbeb;
  color: #d97706;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: #1e3a5f;
  letter-spacing: -1px;
  line-height: 1;
}

.stat-value-pending {
  color: #d97706;
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

.btn-link {
  background: transparent;
  color: #1677ff;
  padding: 6px 0;
  font-weight: 500;
}

.btn-link:hover:not(:disabled) {
  color: #0958d9;
  text-decoration: underline;
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

.clickable-text {
  cursor: pointer;
  transition: color 0.2s ease;
  display: inline-block;
  max-width: 100%;
}

.clickable-text:hover {
  color: #1677ff;
  text-decoration: underline;
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
  width: 520px;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 28px 24px;
}

/* 信息摘要复用举报样式 */
.report-summary {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.summary-label {
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
  min-width: 60px;
}

.summary-value {
  color: #334155;
  word-break: break-all;
}

/* 处理表单 */
.handle-field {
  margin-bottom: 18px;
}

.handle-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.handle-options {
  display: flex;
  gap: 12px;
}

.handle-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  font-size: 13px;
  color: #555;
}

.handle-option input[type="radio"] {
  display: none;
}

.option-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #d0d0d0;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.handle-option.active {
  border-color: #1677ff;
  background: #f0f5ff;
  color: #1677ff;
}

.handle-option.active .option-dot {
  border-color: #1677ff;
  background: #1677ff;
  box-shadow: inset 0 0 0 3px #fff;
}

.option-text {
  font-weight: 500;
}

.handle-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.handle-textarea:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.08);
}

.handle-textarea::placeholder {
  color: #bbb;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .data-table {
    display: block;
    overflow-x: auto;
  }

  .handle-options {
    flex-direction: column;
  }
}
</style>


