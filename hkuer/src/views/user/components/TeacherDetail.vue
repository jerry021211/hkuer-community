<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { ArrowLeftOutlined, StarFilled, CheckOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons-vue'
import {
  getTeacherInfo,
  rateTeacher,
  getTeacherComments,
  addTeacherComment,
  deleteTeacherComment,
  type TeacherItem,
  type TeacherComment
} from '@/api/teacher'
import { getUserId } from '@/utils/auth'
import { getUserType } from '@/api/user'

const route = useRoute()
const router = useRouter()

// --- 状态 ---
const loading = ref(true)
const teacher = ref<TeacherItem | null>(null)
const currentUserId = ref<string | null>(null)
const isAdmin = ref(false)

// 评分交互
const userRating = ref(0)
const ratingSubmitting = ref(false)

// 评论
const comments = ref<TeacherComment[]>([])
const commentLoading = ref(false)
const newComment = ref('')
const commentSubmitting = ref(false)
const commentPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const teacherId = computed(() => route.params.id as string)

// --- 加载教师详情 ---
async function loadTeacher() {
  if (!teacherId.value) return
  loading.value = true
  try {
    teacher.value = await getTeacherInfo(teacherId.value)
    userRating.value = teacher.value?.userRating || 0
  } catch (e: any) {
    message.error(e?.message || 'Failed to load teacher info')
  } finally {
    loading.value = false
  }
}

// --- 提交评分 ---
async function handleRate(value: number) {
  userRating.value = value
}

async function submitRating() {
  if (!userRating.value || !teacherId.value) return
  ratingSubmitting.value = true
  try {
    await rateTeacher(teacherId.value, userRating.value)
    message.success('Rating submitted successfully!')
    // 刷新详情以更新平均分
    await loadTeacher()
  } catch (e: any) {
    message.error(e?.message || 'Failed to submit rating')
  } finally {
    ratingSubmitting.value = false
  }
}

// --- 加载评论 ---
async function loadComments() {
  if (!teacherId.value) return
  commentLoading.value = true
  try {
    const res = await getTeacherComments(teacherId.value, commentPagination.current, commentPagination.pageSize)
    comments.value = res.records
    commentPagination.total = res.total
  } catch (e: any) {
    // 评论接口可能还没实现，静默处理
    console.warn('Failed to load comments:', e?.message)
    comments.value = []
  } finally {
    commentLoading.value = false
  }
}

// --- 发表评论 ---
async function submitComment() {
  if (!newComment.value.trim() || !teacherId.value) return
  commentSubmitting.value = true
  try {
    await addTeacherComment(teacherId.value, newComment.value.trim())
    message.success('Comment posted!')
    newComment.value = ''
    commentPagination.current = 1
    await loadComments()
  } catch (e: any) {
    message.error(e?.message || 'Failed to post comment')
  } finally {
    commentSubmitting.value = false
  }
}

// --- 删除评论 ---
function handleDeleteComment(comment: TeacherComment) {
  Modal.confirm({
    title: 'Confirm Delete',
    content: 'Are you sure you want to delete this comment?',
    okText: 'Confirm',
    cancelText: 'Cancel',
    onOk: async () => {
      try {
        await deleteTeacherComment(comment.id)
        message.success('Comment deleted')
        await loadComments()
      } catch (e: any) {
        message.error(e?.message || 'Failed to delete comment')
      }
    }
  })
}

// --- 评论翻页（支持页码与每页条数变化）---
function onPageChange(page: number, pageSize?: number) {
  commentPagination.current = page
  if (pageSize != null) commentPagination.pageSize = pageSize
  loadComments()
}

// --- 判断是否可删除 ---
function canDelete(comment: TeacherComment): boolean {
  if (isAdmin.value) return true
  return comment.userId === currentUserId.value
}

// --- 格式化时间：YYYY-MM-DD HH:mm:ss ---
function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${M}-${d} ${h}:${m}:${s}`
}

// --- 返回 ---
function goBack() {
  router.back()
}

// --- 生命周期 ---
onMounted(async () => {
  currentUserId.value = await getUserId()
  try {
    const ut = await getUserType()
    isAdmin.value = ut === 1
  } catch { isAdmin.value = false }

  await loadTeacher()
  await loadComments()
})
</script>

<template>
  <div class="teacher-detail-container">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-wrap">
      <a-skeleton :active="true" :paragraph="{ rows: 10 }" />
    </div>

    <!-- 未找到 -->
    <div v-else-if="!teacher" class="error-wrap">
      <a-result status="404" title="Teacher not found" sub-title="The teacher you are looking for does not exist.">
        <template #extra>
          <a-button type="primary" @click="goBack">Go Back</a-button>
        </template>
      </a-result>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 返回按钮 -->
      <div class="back-bar">
        <a-button type="text" class="back-btn" @click="goBack">
          <template #icon><ArrowLeftOutlined /></template>
          Back to Rankings
        </a-button>
      </div>

      <!-- 教师信息卡片 -->
      <div class="hero-card">
        <div class="hero-left">
          <div class="hero-avatar">
            <span class="avatar-letter">{{ (teacher.name || 'T')[0].toUpperCase() }}</span>
          </div>
          <div class="hero-info">
            <h1 class="hero-name">{{ teacher.name }}</h1>
            <div class="hero-stats">
              <div class="stat-item">
                <StarFilled class="stat-icon" style="color: #fadb14" />
                <span class="stat-value">{{ teacher.averageRating }}</span>
                <span class="stat-label">Average Rating</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-value">{{ teacher.ratingCount }}</span>
                <span class="stat-label">Total Ratings</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧评分 -->
        <div class="hero-right">
          <div class="rate-box">
            <span class="rate-title">Your Rating</span>
            <a-rate
              :value="userRating"
              @update:value="handleRate"
              class="hero-rate"
            />
            <transition name="fade">
              <a-button
                v-if="userRating > 0"
                type="primary"
                shape="round"
                size="small"
                :loading="ratingSubmitting"
                class="rate-submit-btn"
                @click="submitRating"
              >
                <template #icon><CheckOutlined /></template>
                Submit
              </a-button>
            </transition>
          </div>
        </div>
      </div>

      <!-- 描述区域 -->
      <div class="desc-card">
        <h2 class="section-title">About</h2>
        <p class="desc-text">{{ teacher.description || 'No description available for this teacher.' }}</p>
      </div>

      <!-- 评论区域 -->
      <div class="comments-card">
        <h2 class="section-title">
          Comments
          <span class="comment-count">({{ commentPagination.total }})</span>
        </h2>

        <!-- 发表评论 -->
        <div class="comment-input-area">
          <a-textarea
            v-model:value="newComment"
            placeholder="Share your thoughts about this teacher..."
            :rows="4"
            :auto-size="{ minRows: 3, maxRows: 8 }"
            :maxlength="500"
            show-count
          />
          <div class="comment-submit-bar">
            <a-button
              type="primary"
              :loading="commentSubmitting"
              :disabled="!newComment.trim()"
              @click="submitComment"
            >
              Post Comment
            </a-button>
          </div>
        </div>

        <!-- 评论列表（知乎风格） -->
        <a-spin :spinning="commentLoading">
          <div class="comment-list">
            <div v-if="comments.length === 0 && !commentLoading" class="no-comments">
              <p>暂无评论，快来写下第一条评论吧</p>
            </div>

            <div
              v-for="comment in comments"
              :key="comment.id"
              class="comment-item"
            >
              <!-- 顶部：头像 + 昵称 同一行 -->
              <div class="comment-top">
                <a-avatar
                  :size="40"
                  :src="comment.avatar || undefined"
                  class="comment-avatar"
                  style="background:#f0f2f5;color:#999"
                >
                  <template v-if="!comment.avatar">👤</template>
                </a-avatar>
                <span class="comment-nickname">{{ comment.nickname || (comment.userId ? comment.userId.slice(0, 8) + '…' : '匿名用户') }}</span>
              </div>
              <!-- 中间：评论内容 -->
              <div class="comment-content">{{ comment.content }}</div>
              <!-- 底部：回答者 / 发布于 / 删除 -->
              <div class="comment-footer">
                <span class="footer-nickname">回答者:  {{ comment.nickname || (comment.userId ? comment.userId.slice(0, 8) + '…' : '匿名用户') }}</span>
                  <span class="footer-sep">发布于:  {{ formatTime(comment.createdAt) }}</span>
                <a-button
                  v-if="canDelete(comment)"
                  type="text"
                  danger
                  size="small"
                  class="comment-delete-btn"
                  @click="handleDeleteComment(comment)"
                >
                  <template #icon><DeleteOutlined /></template>
                  删除
                </a-button>
              </div>
            </div>
          </div>
        </a-spin>

        <!-- 分页：仅当有多页时显示 -->
        <div v-if="commentPagination.total > commentPagination.pageSize" class="comment-pagination">
          <a-pagination
            :current="commentPagination.current"
            :page-size="commentPagination.pageSize"
            :total="commentPagination.total"
            size="small"
            show-size-changer
            :page-size-options="['10', '20', '30']"
            @change="onPageChange"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.teacher-detail-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 40px;
  padding-bottom: 80px;
  overflow-y: auto;
  height: calc(100vh - 90px);
  overflow-x: hidden;
  background: #f5f7fa;
}

.loading-wrap,
.error-wrap {
  padding: 60px 40px;
}

/* 返回按钮 */
.back-bar {
  margin-bottom: 24px;
  text-align: left;
}
.back-btn {
  font-size: 15px;
  color: #595959;
  padding: 0;
  height: auto;
  &:hover {
    color: #1890ff;
  }
}

/* ========== 教师信息卡片 ========== */
.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 48px 56px;
  margin-bottom: 32px;
  box-shadow: 0 12px 48px rgba(102, 126, 234, 0.25);
  min-height: 200px;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 32px;
  flex: 1;
}

.hero-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(12px);
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  .avatar-letter {
    font-size: 42px;
    font-weight: 900;
    color: #fff;
  }
}

.hero-info {
  flex: 1;
  
  .hero-name {
    font-size: 38px;
    font-weight: 900;
    color: #fff;
    margin: 0 0 16px 0;
    letter-spacing: 0.3px;
    line-height: 1.2;
  }

  .hero-stats {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.95);

    .stat-icon {
      font-size: 20px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
    }

    .stat-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
    }
  }

  .stat-divider {
    width: 1px;
    height: 32px;
    background: rgba(255, 255, 255, 0.35);
  }
}

.hero-right {
  flex-shrink: 0;
  margin-left: 40px;
  
  .rate-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 28px 36px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    min-width: 200px;

    .rate-title {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }

    .hero-rate {
      font-size: 32px;
      :deep(.ant-rate-star:not(.ant-rate-star-full)) {
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .rate-submit-btn {
      background: #52c41a;
      border-color: #52c41a;
      font-weight: 600;
      height: 36px;
      padding: 0 20px;
    }
  }
}

/* ========== 描述区域 ========== */
.desc-card {
  background: #fff;
  border-radius: 16px;
  padding: 36px 44px;
  margin-bottom: 32px;
  border: 1px solid #e8ecf0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f2f5;

  .comment-count {
    font-size: 16px;
    font-weight: 500;
    color: #8c8c8c;
  }
}

.desc-text {
  font-size: 16px;
  line-height: 1.9;
  color: #434343;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ========== 评论区域 ========== */
.comments-card {
  background: #fff;
  border-radius: 16px;
  padding: 36px 44px;
  border: 1px solid #e8ecf0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* 评论输入框 */
.comment-input-area {
  margin-bottom: 32px;
  padding-bottom: 28px;
  border-bottom: 2px solid #f0f2f5;

  :deep(.ant-input) {
    border-radius: 12px;
    font-size: 15px;
    padding: 12px 16px;
    border-color: #d9d9d9;
    
    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
}

.comment-submit-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ========== 评论列表（知乎风格）========== */
.comment-list {
  min-height: 100px;
  background: #fff;
}

.no-comments {
  text-align: center;
  padding: 48px 0;
  color: #8c8c8c;
  font-size: 14px;

  p {
    margin: 0;
  }
}

.comment-item {
  padding: 20px 0;
  border-bottom: 1px solid #ebebeb;
  transition: background-color 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #fafafa;
  }
}

/* 顶部：头像 + 昵称 同一行 */
.comment-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.comment-avatar {
  flex-shrink: 0;

  :deep(.ant-avatar) {
    background: #1890ff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }
}

.comment-nickname {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

/* 中间：评论内容 */
.comment-content {
  font-size: 15px;
  line-height: 1.6;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  padding-left: 52px; /* 与头像对齐：40px 头像 + 12px 间距 */
  white-space: pre-wrap;
  word-break: break-word;
}

/* 底部：回答者 / 发布于 / 删除 */
.comment-footer {
  display: flex;

  flex-wrap: wrap;
  gap: 4px 16px;
  padding-left: 52px;
  font-size: 13px;
  color: #8c8c8c;
}

.footer-label,
.footer-sep {
  color: #8c8c8c;
}

.footer-nickname {
  color: #595959;
  font-weight: 500;
}

.footer-time {
  color: #8c8c8c;
}

.comment-delete-btn {
  margin-left: auto;
  padding: 0 4px;
  height: auto;
  font-size: 13px;
  color: #8c8c8c;

  &:hover {
    color: #ff4d4f;
  }
}

/* 分页 */
.comment-pagination {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #f0f2f5;
}

/* 动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
