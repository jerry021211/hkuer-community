<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { 
  MessageOutlined, 
  LikeOutlined, 
  StarOutlined,
  SyncOutlined
} from '@ant-design/icons-vue'
import { getPostDetail, type PostRecord, translateText } from '@/api/post'
import { 
  getCommentList, 
  createArticleComment, 
  replyComment, 
  deleteComment,
  type CommentItem 
} from '@/api/comment'
import { getUserId } from '@/utils/auth'
import { doLike, undoLike } from '@/api/like'
import { doFavorite, undoFavorite } from '@/api/favorite'
import '@wangeditor/editor/dist/css/style.css'
// @ts-ignore - Vue 3 setup component auto-export
import CommentTree from './CommentTree.vue'
import { getUserType } from '@/api/user'

const route = useRoute()
const loading = ref(false)
const post = ref<PostRecord | null>(null)
const comments = ref<CommentItem[]>([])
const currentUserId = ref<string | null>(null)
const isAdmin = ref(false)
// 评论输入
const newCommentContent = ref('')
const replyingTo = ref<{ id: number; nickname: string } | null>(null)
const replyContent = ref<Record<number, string>>({})
const expandedReplies = ref<Record<number, boolean>>({})

const translateModalVisible = ref(false) // 控制弹窗显示
const translatedContent = ref('')        // 存储翻译结果
const translating = ref(false)           // 控制按钮loading状态

// 格式化时间
function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// 加载帖子详情
async function loadPost() {
  const idParam = route.params.id
  const id = Number(idParam)
  if (!id || Number.isNaN(id)) return
  loading.value = true
  try {
    post.value = await getPostDetail(id)
    await loadComments()
    currentUserId.value = await getUserId()
  } catch (e: any) {
    message.error(e?.message || 'Failed to load post')
  } finally {
    loading.value = false
  }
}

// 加载评论列表
async function loadComments() {
  if (!post.value) return
  try {
    comments.value = await getCommentList(post.value.id)
  } catch (e: any) {
    message.error(e?.message || 'Failed to load comments')
  }
}

// 提交一级评论（回复帖子）
async function submitComment() {
  if (!newCommentContent.value.trim() || !post.value) return
  try {
    await createArticleComment({
      postId: post.value.id,
      contentMd: newCommentContent.value
    })
    message.success('Comment posted')
    newCommentContent.value = ''
    await loadComments()
  } catch (e: any) {
    message.error(e?.message || 'Failed to post comment')
  }
}

// 开始回复
function startReply(comment: CommentItem) {
  const id = comment.callId || comment.id
  if (!id) return
  replyingTo.value = {
    id,
    nickname: comment.nickname || comment.fromNickname || ''
  }
  replyContent.value[id] = ''
}

// 取消回复
function cancelReply(commentId: number) {
  const id = replyingTo.value?.id
  if (id === commentId) {
    replyingTo.value = null
  }
  delete replyContent.value[commentId]
}

// 提交回复
async function submitReply(parentComment: CommentItem) {
  const parentId = parentComment.callId || parentComment.id
  if (!parentId) return
  
  const content = replyContent.value[parentId]
  if (!content || !content.trim()) return
  
  try {
    await replyComment({
      parentId,
      contentMd: content
    })
    message.success('Reply posted')
    cancelReply(parentId)
    await loadComments()
  } catch (e: any) {
    message.error(e?.message || 'Failed to post reply')
  }
}

// 删除评论
async function handleDeleteComment(comment: CommentItem) {
  const commentId = comment.callId || comment.id
  if (!commentId) return
  
  Modal.confirm({
    title: 'Confirm Delete',
    content: 'Are you sure you want to delete this comment? This action cannot be undone.',
    okText: 'Confirm',
    cancelText: 'Cancel',
    onOk: async () => {
      try {
        await deleteComment(commentId)
        message.success('Comment deleted')
        await loadComments()
      } catch (e: any) {
        message.error(e?.message || 'Failed to delete comment')
      }
    }
  })
}

// 切换回复展开/收起
function toggleReplies(commentId: number) {
  expandedReplies.value[commentId] = !expandedReplies.value[commentId]
}

// 点赞/取消点赞
async function toggleLike() {
  if (!post.value) return
  try {
    if (post.value.isLiked) {
      await undoLike(post.value.id)
      if (post.value.likedNum !== null) {
        post.value.likedNum = Math.max(0, (post.value.likedNum || 0) - 1)
      }
    } else {
      await doLike(post.value.id)
      if (post.value.likedNum !== null) {
        post.value.likedNum = (post.value.likedNum || 0) + 1
      }
    }
    post.value.isLiked = !post.value.isLiked
  } catch (e: any) {
    message.error(e?.message || 'Failed to toggle like')
  }
}

// 收藏/取消收藏
async function toggleFavorite() {
  if (!post.value) return
  try {
    if (post.value.isFavorited) {
      await undoFavorite(post.value.id)
      if (post.value.favoritedNum !== null) {
        post.value.favoritedNum = Math.max(0, (post.value.favoritedNum || 0) - 1)
      }
    } else {
      await doFavorite(post.value.id)
      if (post.value.favoritedNum !== null) {
        post.value.favoritedNum = (post.value.favoritedNum || 0) + 1
      }
    }
    post.value.isFavorited = !post.value.isFavorited
  } catch (e: any) {
    message.error(e?.message || 'Failed to toggle favorite')
  }
}

// 处理翻译点击事件
async function handleTranslate() {
  if (!post.value?.content) return
  
  translating.value = true
  try {
    // 调用接口，不传 targetLang 让后端自动识别
    const result = await translateText({ 
      text: post.value.content 
    })
    
    translatedContent.value = result
    translateModalVisible.value = true
  } catch (e: any) {
    message.error(e?.message || 'Translation failed')
  } finally {
    translating.value = false
  }
}

async function fetchUserType() {
  try {
    const userType = await getUserType()
    isAdmin.value = userType === 1
  } catch {
    isAdmin.value = false
  }
}

onMounted(() => {
  loadPost()
  fetchUserType()
})
</script>

<template>
  <div class="post-detail-container">
    <div v-if="loading" class="loading-container">
      <a-skeleton :active="true" :paragraph="{ rows: 8 }" />
    </div>
    
    <div v-else-if="post" class="post-content">
      <!-- 帖子内容 -->
      <a-card class="post-card">
        <template #title>
          <div class="post-title">{{ post.title }}</div>
        </template>
        
        <div class="post-meta">
          <a-tag color="blue">{{ post.boardName }}</a-tag>
          <span class="post-author" v-if="post.authorNickname">
            By {{ post.authorNickname }}
          </span>
          <span class="post-time">{{ formatTime(post.publishedAt || post.createdAt) }}</span>
        </div>
        
        <div class="post-body">
          <div class="content-text" v-html="post.content"></div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="post-actions">
          <a-button 
            :type="post.isLiked ? 'primary' : 'default'"
            @click="toggleLike"
          >
            <template #icon><LikeOutlined /></template>
            Like ({{ post.likedNum || 0 }})
          </a-button>
          <a-button 
            :type="post.isFavorited ? 'primary' : 'default'"
            @click="toggleFavorite"
          >
            <template #icon><StarOutlined /></template>
            Favorite ({{ post.favoritedNum || 0 }})
          </a-button>
          <a-button>
            <template #icon><MessageOutlined /></template>
            Comments ({{ comments.length }})
          </a-button>
          <a-button 
            :loading="translating" 
            @click="handleTranslate"
          >
            <template #icon><SyncOutlined /></template>
            Translation
          </a-button>
        </div>
      </a-card>
      
      <!-- 评论区域 -->
      <a-card class="comments-card">
        <template #title>
          <div class="comments-title">
            <MessageOutlined />
            <span>Comments ({{ comments.length }})</span>
          </div>
        </template>
        
        <!-- 发表评论 -->
        <div class="new-comment">
          <a-textarea
            v-model:value="newCommentContent"
            placeholder="Write a comment..."
            :rows="4"
            :auto-size="{ minRows: 4, maxRows: 8 }"
          />
          <div class="comment-submit">
            <a-button type="primary" @click="submitComment" :disabled="!newCommentContent.trim()">
              Post Comment
            </a-button>
          </div>
        </div>
        
        <!-- 评论列表 -->
        <div class="comments-list">
          <div v-if="comments.length === 0" class="no-comments">
            No comments yet. Be the first to comment!
          </div>
          
          <!-- 递归渲染评论 -->
          <CommentTree
            v-for="comment in comments"
            :key="comment.callId || comment.id"
            :comment="comment"
            :level="0"
            :current-user-id="currentUserId"
            :is-admin="isAdmin"
            :replying-to="replyingTo"
            :reply-content="replyContent"
            :expanded-replies="expandedReplies"
            @start-reply="startReply"
            @cancel-reply="cancelReply"
            @submit-reply="submitReply"
            @delete-comment="handleDeleteComment"
            @toggle-replies="toggleReplies"
          />
        </div>
      </a-card>
    </div>
    
    <div v-else class="error-container">
      <a-result status="404" title="Post not found" />
    </div>

    <a-modal
      v-model:open="translateModalVisible"
      title="Translation Result"
      :footer="null"
      width="600px"
    >
      <div class="translation-result">
        <div class="translation-label">AI Auto-detected Language Translation:</div>
        <div class="translation-content">{{ translatedContent }}</div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.post-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  padding-bottom: 80px;
  background: #f5f5f5;
  overflow-y: auto;
  height: calc(100vh - 90px);
  overflow-x: hidden;
}

.loading-container {
  padding: 24px;
}

.post-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.post-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post-title {
  font-size: 28px;
  font-weight: 700;
  color: #262626;
  line-height: 1.4;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.post-author {
  color: #595959;
  font-size: 14px;
}

.post-time {
  color: #8c8c8c;
  font-size: 13px;
  margin-left: auto;
}

.post-body {
  margin: 24px 0;
}

.content-text {
  line-height: 1.8;
  font-size: 16px;
  color: #262626;
  word-break: break-word;
  text-align: left;
}

.content-text :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 12px 0;
  display: inline-block; 
  vertical-align: middle; /* 可选：让文字和图片垂直居中对齐，更好看 */
}

.content-text :deep(p) {
  margin: 8px 0;
}

.content-text :deep(a) {
  color: #1677ff;
  text-decoration: underline;
}

.post-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.comments-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comments-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
}

.new-comment {
  margin-bottom: 32px;
}

.comment-submit {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.comments-list {
  margin-top: 24px;
}

.no-comments {
  text-align: center;
  padding: 40px;
  color: #8c8c8c;
  font-size: 14px;
}

.error-container {
  padding: 40px;
}
.translation-result {
  padding: 10px 0;
}

.translation-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.translation-content {
  font-size: 16px;
  line-height: 1.8;
  color: #262626;
  white-space: pre-wrap;
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}
</style>
