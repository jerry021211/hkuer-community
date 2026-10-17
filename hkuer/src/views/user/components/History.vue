<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { getMyPosts, deletePost, type PostRecord } from '@/api/post'

const router = useRouter()
const route = useRoute()

// —— 查询参数与分页 —— //
const query = reactive({ title: '' })
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})
const loading = ref(false)
const tableData = ref<PostRecord[]>([])

// 删除帖子
const deleteConfirmVisible = ref(false)
const deletingPostId = ref<number | null>(null)

function handleDeleteClick(postId: number) {
  deletingPostId.value = postId
  deleteConfirmVisible.value = true
}

async function confirmDelete() {
  if (!deletingPostId.value) return
  try {
    await deletePost(deletingPostId.value)
    message.success('Deleted successfully')
    deleteConfirmVisible.value = false
    deletingPostId.value = null
    
    // 重新加载列表
    await loadList()
    
    // 如果当前页没有数据且不是第一页，则跳转到上一页
    if (tableData.value.length === 0 && pagination.current > 1) {
      pagination.current = pagination.current - 1
      updateRoutePage(pagination.current)
      await loadList()
    }
  } catch (e: any) {
    message.error(e?.message || 'Failed to delete')
  }
}

function cancelDelete() {
  deleteConfirmVisible.value = false
  deletingPostId.value = null
}

// —— 格式化时间 —— //
function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

// —— 表头：Title / Publish Time / Operation —— //
const columns = ref<TableColumnsType<PostRecord>>([
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Publish Time', dataIndex: 'publishedAt', key: 'publishedAt', width: 220 },
  { title: 'Operation', key: 'operation', width: 140, align: 'center' },
])

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


async function loadList() {
  loading.value = true
  try {
    const response = await getMyPosts(
      pagination.current,
      pagination.pageSize,
      query.title || undefined
    )
    tableData.value = response.records
    pagination.total = response.total
  } catch (e: any) {
    message.error(e?.message || 'Failed to load post list')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
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
    <h2 class="title">My History</h2>

    <!-- 搜索区 -->
    <div class="search-row" >
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
        <template v-if="column.key === 'title'">
          <a class="link" @click="router.push(`/user/post/${record.id}`)">{{ record.title }}</a>
        </template>
        <template v-else-if="column.key === 'publishedAt'">
          {{ formatTime(record.publishedAt || record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'operation'">
          <a-button type="link" danger @click="handleDeleteClick(record.id)">
            <template #icon><DeleteOutlined /></template>
            Delete
          </a-button>
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
    
    <!-- 删除确认弹窗 -->
    <a-modal
      v-model:open="deleteConfirmVisible"
      title="Confirm Delete"
      @ok="confirmDelete"
      @cancel="cancelDelete"
    >
      <p>Are you sure you want to delete this post? This action cannot be undone.</p>
    </a-modal>
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
}
.label {
  font-size: 18px;
  color: #666;
  white-space: nowrap;
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
