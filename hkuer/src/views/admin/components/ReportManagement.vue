<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getReportCount,
  getPendingReportCount,
  getPendingReports,
  handleReport,
  type ReportInfo
} from '@/api/console'

// 统计数据
const totalReportCount = ref(0)
const pendingReportCount = ref(0)

// 分页参数
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(0)

// 举报列表
const reportList = ref<ReportInfo[]>([])
const loading = ref(false)

// 处理模态框状态
const showModal = ref(false)
const modalReport = ref<ReportInfo | null>(null)
const handleStatus = ref<1 | 2>(1) // 1=已处罚/有效, 2=已驳回/无效
const handleNote = ref('')
const actionLoading = ref(false)

// 详情模态框状态
const showDetailModal = ref(false)
const detailReport = ref<ReportInfo | null>(null)
const detailType = ref<'reason' | 'detail'>('reason') // reason=举报理由, detail=详细描述

// 获取统计数据
async function fetchCounts() {
  const [totalCount, pendingCount] = await Promise.all([
    getReportCount(),
    getPendingReportCount()
  ])
  totalReportCount.value = totalCount
  pendingReportCount.value = pendingCount
}

// 获取举报列表
async function fetchReports() {
  loading.value = true
  try {
    const result = await getPendingReports({
      page: currentPage.value,
      size: pageSize.value
    })
    reportList.value = result.records
    total.value = result.total
    totalPages.value = result.pages
  } catch (error: any) {
    console.error('获取举报列表失败:', error)
    reportList.value = []
    total.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

// 切换页码
function handlePageChange(page: number) {
  currentPage.value = page
  fetchReports()
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

// 获取举报目标类型标签
function getTargetTypeLabel(type: string): string {
  switch (type) {
    case 'POST': return '帖子'
    case 'COMMENT': return '评论'
    case 'ANSWER': return '回答'
    case 'COURSE_REVIEW': return '课程评价'
    case 'COURSE_MATERIAL': return '课程资料'
    case 'USER': return '用户'
    default: return type
  }
}

// 点击帖子跳转到帖子详情
function openPost(report: ReportInfo) {
  if (report.targetType === 'POST') {
    window.open(`/user/post/${report.targetId}`, '_blank')
  }
}

// 打开详情模态框
function openDetailModal(report: ReportInfo, type: 'reason' | 'detail') {
  detailReport.value = report
  detailType.value = type
  showDetailModal.value = true
}

// 关闭详情模态框
function closeDetailModal() {
  showDetailModal.value = false
  detailReport.value = null
}

// 打开处理模态框
function openModal(report: ReportInfo) {
  modalReport.value = report
  handleStatus.value = 1
  handleNote.value = ''
  showModal.value = true
}

// 关闭处理模态框
function closeModal() {
  showModal.value = false
  modalReport.value = null
  handleNote.value = ''
}

// 确认处理
async function confirmHandle() {
  if (!modalReport.value) return
  actionLoading.value = true
  try {
    const msg = await handleReport({
      reportId: String(modalReport.value.id),
      status: handleStatus.value,
      handleNote: handleNote.value
    })
    alert(msg || '处理成功')
    closeModal()
    // 刷新列表和计数
    await Promise.all([fetchReports(), fetchCounts()])
  } catch (error: any) {
    alert(error.message || '处理失败')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  fetchCounts()
  fetchReports()
})
</script>

<template>
  <div class="report-management">
    <header class="page-header">
      <h1 class="page-title">举报处理</h1>
      <p class="page-subtitle">审核和处理用户举报</p>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-total">◈</div>
        <div class="stat-info">
          <span class="stat-label">举报总数</span>
          <span class="stat-value">{{ totalReportCount }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-pending">◉</div>
        <div class="stat-info">
          <span class="stat-label">待处理</span>
          <span class="stat-value stat-value-pending">{{ pendingReportCount }}</span>
        </div>
      </div>
    </section>

    <!-- 举报列表 -->
    <section class="table-section">
      <div class="table-card">
        <div class="card-header">
          <h2 class="card-title">待处理举报</h2>
          <span class="user-count">共 {{ total }} 条记录</span>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else-if="reportList.length === 0" class="empty-state">
          <span class="empty-icon">◇</span>
          <p>暂无待处理的举报</p>
        </div>

        <table v-else class="data-table">
          <colgroup>
            <col style="width: 10%" />
            <col style="width: 10%" />
            <col style="width: 8%" />
            <col style="width: 12%" />
            <col style="width: 14%" />
            <col style="width: 16%" />
            <col style="width: 12%" />
            <col style="width: 10%" />
            <col style="width: 10%" />
          </colgroup>
          <thead>
            <tr>
              <th>举报人</th>
              <th>被举报人</th>
              <th>类型</th>
              <th>目标ID</th>
              <th>举报理由</th>
              <th>详细描述</th>
              <th>举报时间</th>
              <th>查看</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in reportList" :key="report.id">
              <td class="bold text-ellipsis" :title="`${report.reporterNickname} (${report.reporterUsername})`">
                {{ report.reporterNickname }}
              </td>
              <td class="text-ellipsis" :title="`${report.targetNickname} (${report.targetUsername})`">
                {{ report.targetNickname }}
              </td>
              <td>
                <span :class="['type-badge', `type-${report.targetType.toLowerCase()}`]">
                  {{ getTargetTypeLabel(report.targetType) }}
                </span>
              </td>
              <td class="mono text-ellipsis" :title="report.targetId">{{ report.targetId }}</td>
              <td>
                <span
                  class="text-ellipsis clickable-text"
                  :title="report.reason"
                  @click="openDetailModal(report, 'reason')"
                >
                  {{ report.reason }}
                </span>
              </td>
              <td>
                <span
                  v-if="report.reasonDetail"
                  class="muted-text text-ellipsis clickable-text"
                  :title="report.reasonDetail"
                  @click="openDetailModal(report, 'detail')"
                >
                  {{ report.reasonDetail }}
                </span>
                <span v-else class="muted-text">-</span>
              </td>
              <td class="muted-text small-date">{{ formatTime(report.createTime) }}</td>
              <td>
                <button
                  v-if="report.targetType === 'POST'"
                  class="btn btn-link btn-sm"
                  @click="openPost(report)"
                >
                  查看帖子
                </button>
                <span v-else class="muted-text">-</span>
              </td>
              <td class="actions-cell">
                <button class="btn btn-primary btn-sm" @click="openModal(report)">处理</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页器 -->
        <div v-if="!loading && reportList.length > 0" class="pagination-wrapper">
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

    <!-- 处理模态框 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">处理举报</h3>
            <button class="modal-close" @click="closeModal">&times;</button>
          </div>
          <div class="modal-body">
            <!-- 举报信息摘要 -->
            <div class="report-summary">
              <div class="summary-row">
                <span class="summary-label">举报人</span>
                <span class="summary-value">{{ modalReport?.reporterNickname }} ({{ modalReport?.reporterUsername }})</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">被举报人</span>
                <span class="summary-value">{{ modalReport?.targetNickname }} ({{ modalReport?.targetUsername }})</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">举报理由</span>
                <span class="summary-value">{{ modalReport?.reason }}</span>
              </div>
              <div v-if="modalReport?.reasonDetail" class="summary-row">
                <span class="summary-label">详细描述</span>
                <span class="summary-value">{{ modalReport?.reasonDetail }}</span>
              </div>
            </div>

            <!-- 处理结果选择 -->
            <div class="handle-field">
              <label class="handle-label">处理结果</label>
              <div class="handle-options">
                <label :class="['handle-option', { active: handleStatus === 1 }]">
                  <input type="radio" v-model="handleStatus" :value="1" />
                  <span class="option-dot"></span>
                  <span class="option-text">有效举报（已处罚）</span>
                </label>
                <label :class="['handle-option', { active: handleStatus === 2 }]">
                  <input type="radio" v-model="handleStatus" :value="2" />
                  <span class="option-dot"></span>
                  <span class="option-text">无效举报（已驳回）</span>
                </label>
              </div>
            </div>

            <!-- 处理备注 -->
            <div class="handle-field">
              <label class="handle-label">处理备注</label>
              <textarea
                v-model="handleNote"
                class="handle-textarea"
                placeholder="请填写处理备注..."
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

    <!-- 详情模态框 -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
        <div class="modal-content detail-modal">
          <div class="modal-header">
            <h3 class="modal-title">{{ detailType === 'reason' ? '举报理由' : '详细描述' }}</h3>
            <button class="modal-close" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-content">
              <div v-if="detailReport" class="detail-info">
                <div class="detail-row">
                  <span class="detail-label">举报人</span>
                  <span class="detail-value">{{ detailReport.reporterNickname }} ({{ detailReport.reporterUsername }})</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">被举报人</span>
                  <span class="detail-value">{{ detailReport.targetNickname }} ({{ detailReport.targetUsername }})</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">举报时间</span>
                  <span class="detail-value">{{ formatTime(detailReport.createTime) }}</span>
                </div>
              </div>
              <div class="detail-text">
                <div class="detail-text-label">{{ detailType === 'reason' ? '举报理由' : '详细描述' }}</div>
                <div class="detail-text-content">
                  {{ detailType === 'reason' ? detailReport?.reason : detailReport?.reasonDetail }}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeDetailModal">关闭</button>
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

/* 举报目标类型标签 */
.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.type-post {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.type-comment {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.type-user {
  background: #faf5ff;
  color: #9333ea;
  border: 1px solid #e9d5ff;
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

/* 举报信息摘要 */
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

/* 详情模态框 */
.detail-modal {
  width: 600px;
  max-width: 90vw;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-info {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.detail-label {
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
  min-width: 70px;
}

.detail-value {
  color: #334155;
  word-break: break-all;
}

.detail-text {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 20px;
}

.detail-text-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-text-content {
  font-size: 14px;
  color: #334155;
  line-height: 1.8;
  word-break: break-word;
  white-space: pre-wrap;
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
