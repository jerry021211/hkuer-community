<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { getUserComments, type UserCommentItem } from '@/api/comment'

const router = useRouter()
const route = useRoute()

// —— 类型定义：评论（扩展后端返回的数据） —— //
interface CommentItem extends UserCommentItem {
  id: number  // 用于表格 row-key
  commentTime: string  // 格式化后的时间
}
  
// —— 查询参数与分页 —— //
const query = reactive({ title: '' })
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})
const loading = ref(false)
const tableData = ref<CommentItem[]>([])

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

// —— 加载列表 —— //
async function loadList() {
  loading.value = true
  try {
    const response = await getUserComments(
      pagination.current,
      pagination.pageSize,
      query.title || undefined
    )
    
    // 将后端返回的数据转换为组件需要的格式
    const items: CommentItem[] = response.list.map((item, index) => {
      // 使用 postId 和时间戳生成唯一标识
      const id = item.postId || (Date.now() + index)
      
      return {
        ...item,
        id,
        commentTime: formatTime(item.createdAt)
      }
    })
    
    tableData.value = items
    pagination.total = response.total
  } catch (e: any) {
    message.error(e?.message || 'Failed to load comments')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// —— 从路由读取页码 —— //
function initPageFromRoute() {
  const pageParam = route.params.page
  if (pageParam && typeof pageParam === 'string') {
    const page = parseInt(pageParam, 10)
    if (!isNaN(page) && page > 0) {
      pagination.current = page
    }
  }
}

// —— 更新路由页码 —— //
function updateRoutePage(page: number) {
  const currentPath = route.path
  const basePath = currentPath.replace(/\/\d+$/, '') // 移除末尾的页码
  
  if (page === 1) {
    // 第一页不显示页码参数，跳转到基础路径
    if (currentPath !== basePath) {
      router.replace(basePath)
    }
  } else {
    // 其他页显示页码参数
    const newPath = `${basePath}/${page}`
    if (currentPath !== newPath) {
      router.replace(newPath)
    }
  }
}

// —— 表头：Comment Content / Comment Time —— //
const columns = ref<TableColumnsType<CommentItem>>([
  { title: 'Comment Content', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: 'Comment Time', dataIndex: 'commentTime', key: 'commentTime', width: 220 },
])
  
// —— 事件 —— //
function onSearch() {
  pagination.current = 1
  updateRoutePage(1)
  loadList()
}

function onPageChange(page: number) {
  pagination.current = page
  updateRoutePage(page)
  loadList()
}

// 监听路由变化
watch(() => route.params.page, (newPage) => {
  if (newPage && typeof newPage === 'string') {
    const page = parseInt(newPage, 10)
    if (!isNaN(page) && page > 0 && page !== pagination.current) {
      pagination.current = page
      loadList()
    }
  } else if (!newPage && pagination.current !== 1) {
    pagination.current = 1
    loadList()
  }
})

onMounted(() => {
  initPageFromRoute()
  loadList()
})
  </script>

<template>
    <div class="page">
      <h2 class="title">My Comment</h2>
  
      <!-- 搜索区 -->
      <div class="search-row">
        <div class="label">Title</div>
        <a-input
          v-model:value="query.title"
          :allow-clear="true"
          placeholder="Input title"
          class="search-input"
          @pressEnter="onSearch"
        />
        <a-button type="primary" @click="onSearch" style="margin-left: 1rem;">
          <template #icon><SearchOutlined /></template>
          Search
        </a-button>
      </div>
  
      <!-- 表格 -->
      <a-table
        :data-source="tableData"
        :columns="columns"
        :loading="loading"
        :pagination="false"
        row-key="id"
        bordered
        class="table"
      >
      <!-- 统一列渲染 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'content'">
          <a 
            v-if="record.postId" 
            class="link" 
            @click="router.push(`/user/post/${record.postId}`)"
          >{{ record.content }}</a>
          <span v-else>{{ record.content }}</span>
        </template>
      </template>
      </a-table>
  
      <!-- 分页 -->
      <div class="pager">
        <a-pagination
          v-model:current="pagination.current"
          v-model:pageSize="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="false"
          @change="onPageChange"
        />
      </div>
  </div>
</template>
  
  <style scoped>
  .page {
    background: transparent;
    padding: 16px;
    border: 1px solid #ddd;
    min-width: 1350px;
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 16px;
    height: 100vh;
    margin-left: -1rem;
    overflow-y: auto;
    height: calc(100vh - 90px);
    overflow-x: hidden;
  }
  .title {
    font-size: 30px;
    font-weight: bold;
    margin-bottom: 16px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 8px;
  }
  .search-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    white-space: nowrap;
  }
  .label {
    font-size: 18px;
    color: #666;
  }
  .search-input {
    width: 300px;
  }
  .table :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
  }
  .link {
    color: #1677ff;
    cursor: pointer;
  }
  .link:hover {
    text-decoration: underline;
  }
  .pager {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
  </style>
  