<script setup lang="ts">
import { computed } from 'vue'
import { DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import type { CommentItem } from '@/api/comment'

const props = defineProps<{
  comment: CommentItem
  level?: number
  parentNickname?: string
  currentUserId?: string | null
  isAdmin?: boolean | null
  replyingTo?: { id: number; nickname: string } | null
  replyContent: Record<number, string>
  expandedReplies: Record<number, boolean>
}>()

const emit = defineEmits<{
  'start-reply': [comment: CommentItem]
  'cancel-reply': [commentId: number]
  'submit-reply': [comment: CommentItem]
  'delete-comment': [comment: CommentItem]
  'toggle-replies': [commentId: number]
}>()

const commentId = computed(() => props.comment.callId || props.comment.id || 0)
const replies = computed(() => props.comment.replies || props.comment.children || [])
const isExpanded = computed(() => props.expandedReplies[commentId.value])
const displayReplies = computed(() => isExpanded.value ? replies.value : replies.value.slice(0, 1))
const hasMoreReplies = computed(() => replies.value.length > 1)
const nickname = computed(() => props.comment.nickname || props.comment.fromNickname || '')
const isReplying = computed(() => props.replyingTo?.id === commentId.value)
const displayContent = computed(() => {
  const content = props.comment.contentMd || ''
  if (content === '该评论已被删除') {
    return 'This comment has been deleted'
  }
  return content
})

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

function canDelete(comment: CommentItem): boolean {
  // 1. 【新增】优先判断管理员权限
  // 如果 props.isAdmin 为 true，直接允许删除，函数结束
  if (props.isAdmin) return true
  // 2. 【原有逻辑】如果是普通用户，再检查是否登录以及是否是作者
  if (!props.currentUserId) return false
  const commentUserId = comment.userId || comment.fromUserId
  return commentUserId === props.currentUserId
}

function updateReplyContent(value: string) {
  props.replyContent[commentId.value] = value
}
</script>

<template>
  <div :class="['comment-item', (level || 0) > 0 ? 'reply-comment' : '']">
    <!-- 评论头部 -->
    <div class="comment-header">
      <span class="comment-author">{{ nickname }}</span>
      <span v-if="parentNickname" class="reply-to"> → {{ parentNickname }}</span>
      <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
      <a-button 
        v-if="canDelete(comment)"
        type="link" 
        danger 
        size="small" 
        class="delete-btn"
        @click="emit('delete-comment', comment)"
      >
        <template #icon><DeleteOutlined /></template>
        Delete
      </a-button>
    </div>
    
    <!-- 评论内容 -->
    <div class="comment-content">{{ displayContent }}</div>
    
    <!-- 操作按钮 -->
    <div class="comment-actions">
      <a-button 
        type="link" 
        size="small" 
        @click="emit('start-reply', comment)"
      >
        Reply
      </a-button>
    </div>
    
    <!-- 回复输入框 -->
    <div v-if="isReplying" class="reply-input">
      <a-textarea
        :value="replyContent[commentId] || ''"
        @update:value="updateReplyContent"
        :placeholder="`Reply to ${replyingTo?.nickname}...`"
        :rows="3"
        :auto-size="{ minRows: 3, maxRows: 6 }"
      />
      <div class="reply-actions">
        <a-button size="small" @click="emit('cancel-reply', commentId)">
          Cancel
        </a-button>
        <a-button type="primary" size="small" @click="emit('submit-reply', comment)">
          Submit
        </a-button>
      </div>
    </div>
    
    <!-- 回复列表 -->
    <div v-if="replies.length > 0" class="replies-container">
      <CommentTree
        v-for="reply in displayReplies"
        :key="reply.id || reply.callId"
        :comment="reply"
        :level="(level || 0) + 1"
        :parent-nickname="nickname"
        :current-user-id="currentUserId"
        :is-admin="isAdmin"
        :replying-to="replyingTo"
        :reply-content="replyContent"
        :expanded-replies="expandedReplies"
        @start-reply="emit('start-reply', $event)"
        @cancel-reply="emit('cancel-reply', $event)"
        @submit-reply="emit('submit-reply', $event)"
        @delete-comment="emit('delete-comment', $event)"
        @toggle-replies="emit('toggle-replies', $event)"
      />
      
      <!-- 展开/收起按钮 -->
      <div v-if="hasMoreReplies" class="expand-replies">
        <a-button 
          type="link" 
          size="small"
          @click="emit('toggle-replies', commentId)"
        >
          <template #icon>
            <UpOutlined v-if="isExpanded" />
            <DownOutlined v-else />
          </template>
          {{ isExpanded ? `Hide ${replies.length - 1} replies` : `Show ${replies.length - 1} more replies` }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-item {
  padding: 16px;
  margin-bottom: 12px;
  background: #fafafa;
  border-radius: 6px;
  border-left: 3px solid #1890ff;
}

.reply-comment {
  margin-left: 32px;
  background: #f5f5f5;
  border-left-color: #52c41a;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.comment-author {
  font-weight: 600;
  color: #1890ff;
  font-size: 14px;
}

.reply-to {
  color: #8c8c8c;
  font-size: 13px;
}

.comment-time {
  color: #8c8c8c;
  font-size: 12px;
  margin-left: auto;
}

.delete-btn {
  padding: 0;
  height: auto;
  font-size: 12px;
}

.comment-content {
  color: #262626;
  line-height: 1.5;
  margin-bottom: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-actions {
  margin-top: 4px;
}

.reply-input {
  margin-top: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.replies-container {
  margin-top: 10px;
  padding-left: 16px;
  border-left: 2px solid #e8e8e8;
}

.expand-replies {
  margin-top: 8px;
  text-align: center;
}
</style>

