<script lang="ts" setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessageOutlined, HeartFilled, StarFilled, EyeOutlined, DeleteOutlined, PushpinOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { doLike, undoLike } from '@/api/like'
import { doFavorite, undoFavorite } from '@/api/favorite'
import { deletePost, getTopPosts, type PostRecord } from '@/api/post'
import { api } from '@/utils/request'
import { getUserType } from '@/api/user'
import Payment from '@/components/Payment/index.vue'

const router = useRouter()
const route = useRoute()

const timeText = ref<string>('')
const dateText = ref<string>('')

let timer: number | undefined
const updateNow = () => {
  const now = new Date()
  timeText.value = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  dateText.value = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
onMounted(() => { updateNow(); timer = window.setInterval(updateNow, 1000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

// ==== 香港实时天气（HKO） ====
type WeatherDisplay = { city: string; tempC: number | null; condition: string; icon: string }
const weather = ref<WeatherDisplay>({
  city: 'Hong Kong',
  tempC: null,
  condition: 'Loading…',
  icon: '⏳'
})

let weatherTimer: number | undefined

const HKO_ICON_MAP: Record<number, { emoji: string; text: string }> = {
  // 常见天气代码（简化映射）
  50: { emoji: '☀️', text: 'Fine' },
  51: { emoji: '🌤️', text: 'Mainly Fine' },
  52: { emoji: '🌤️', text: 'Sunny Periods' },
  53: { emoji: '🌥️', text: 'Sunny Intervals' },
  54: { emoji: '🌫️', text: 'Hazy' },
  60: { emoji: '☁️', text: 'Cloudy' },
  61: { emoji: '🌥️', text: 'Overcast' },
  62: { emoji: '🌧️', text: 'Light Rain' },
  63: { emoji: '🌧️', text: 'Rain' },
  64: { emoji: '🌦️', text: 'Showers' },
  65: { emoji: '⛈️', text: 'Thunderstorms' },
  67: { emoji: '🌩️', text: 'Isolated Thunderstorms' },
}

function mapHkoIcon(iconCode: number | null | undefined): { emoji: string; text: string } {
  if (iconCode != null && HKO_ICON_MAP[iconCode]) return HKO_ICON_MAP[iconCode]
  return { emoji: '🌡️', text: 'Weather' }
}

async function fetchHkoWeather(): Promise<void> {
  try {
    const res = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en', { cache: 'no-store' })

    if (!res.ok) throw new Error(`HKO HTTP ${res.status}`)
    const data = await res.json() as any
    console.log("nires", data)
    // icon 可能是数字或数组，做兼容处理
    const iconRaw = (Array.isArray(data?.icon) ? data.icon[0] : data?.icon) as number | undefined
    const mapped = mapHkoIcon(iconRaw)

    // 取香港天文台站的温度（若无则取第一个）
    const temps: Array<{ place: string; value: number }> = data?.temperature?.data || []
    const hkoRecord = temps.find(t => t.place?.toLowerCase().includes('observatory')) || temps[0]
    const tempC = typeof hkoRecord?.value === 'number' ? hkoRecord.value : null

    weather.value = {
      city: 'Hong Kong',
      tempC,
      condition: mapped.text,
      icon: mapped.emoji,
    }
  } catch (err) {
    // 网络或解析失败时保底显示
    weather.value = {
      city: 'Hong Kong',
      tempC: null,
      condition: 'Unavailable',
      icon: '⚠️',
    }
  }
}

const isAdmin = ref(false)

async function fetchUserType() {
  try {
    const userType = await getUserType()
    isAdmin.value = userType === 1
  } catch {
    isAdmin.value = false
  }
}

// 监听路由变化
watch(() => route.params.page, (newPage) => {
  if (newPage && typeof newPage === 'string') {
    const page = parseInt(newPage, 10)
    if (!isNaN(page) && page > 0 && page !== pagination.current) {
      pagination.current = page
      fetchPosts()
    }
  } else if (!newPage && pagination.current !== 1) {
    pagination.current = 1
    fetchPosts()
  }
})

onMounted(() => {
  fetchHkoWeather()
  fetchUserType()
  // 每10分钟更新一次
  weatherTimer = window.setInterval(fetchHkoWeather, 10 * 60 * 1000)
  // 从路由读取页码并加载帖子列表
  initPageFromRoute()
  fetchTopPosts()
  fetchPosts()
})
onBeforeUnmount(() => { if (weatherTimer) clearInterval(weatherTimer) })

// 分页响应数据类型
interface PageResponse {
  records: PostRecord[]
  total: number
  size: number
  current: number
  pages: number
}

// 组件显示的帖子类型
type Post = { id: number; title: string; tag: string; content: string; authorNickname?: string; authorAvatar?: string; time: string; likes: number; stars: number; comments: number; views: number; isLiked?: boolean; isFavorited?: boolean }

const posts = ref<Post[]>([])
const topPosts = ref<Post[]>([])
const loading = ref(false)
const topLoading = ref(false)
const pagination = reactive({
  current: 1,
  pageSize: 7,
  total: 0
})

// 格式化时间
function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

// 格式化浏览量：超过1000显示为k格式
function formatViews(views: number): string {
  if (views < 1000) {
    return String(views)
  }
  const k = views / 1000
  return `${k.toFixed(1)}k`
}

// 从 HTML 中提取纯文本（去除标签）
function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

// 获取置顶帖子列表
async function fetchTopPosts() {
  topLoading.value = true
  try {
    const response = await getTopPosts()
    
    // 映射接口数据到组件显示格式
    if (response && Array.isArray(response)) {
      topPosts.value = response.map(record => ({
        id: record.id,
        title: record.title,
        tag: record.boardName,
        content: record.content,
        authorNickname: record.authorNickname,
        authorAvatar: record.authorAvatar,
        time: formatTime(record.publishedAt || record.createdAt),
        likes: record.likedNum || 0,
        isLiked: record.isLiked,
        isFavorited: record.isFavorited,
        stars: record.favoritedNum || 0,
        comments: 0, // 接口未返回评论数，暂时为0
        views: record.viewCount || 0
      }))
    }
  } catch (error) {
    console.error('获取置顶帖子列表失败:', error)
  } finally {
    topLoading.value = false
  }
}

// 获取帖子列表
async function fetchPosts() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      boardName: 'Learning Exchange',
      current: String(pagination.current),
      size: String(pagination.pageSize)
    })
    const response = await api.get<PageResponse>(`/java/post/page?${params.toString()}`)
    
    // 映射接口数据到组件显示格式
    posts.value = response.records.map(record => ({
      id: record.id,
      title: record.title,
      tag: record.boardName,
      content: record.content,
      authorNickname: record.authorNickname,
      authorAvatar: record.authorAvatar,
      time: formatTime(record.publishedAt || record.createdAt),
      likes: record.likedNum || 0,
      isLiked: record.isLiked,
      isFavorited: record.isFavorited,
      stars: record.favoritedNum || 0,
      comments: 0, // 接口未返回评论数，暂时为0
      views: record.viewCount || 0
    }))
    
    pagination.total = response.total
  } catch (error) {
    console.error('获取帖子列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 点赞/取消点赞
async function toggleLike(postId: number, liked?: boolean, isTopPost = false) {
  try {
    const likeCount = liked
      ? await undoLike(postId)
      : await doLike(postId)
    const lists = isTopPost
      ? [topPosts.value, posts.value]
      : [posts.value, topPosts.value]
    for (const list of lists) {
      const post = list.find(item => item.id === postId)
      if (post) {
        post.isLiked = !liked
        post.likes = likeCount
      }
    }
  } catch (e) {
    console.error('切换点赞失败:', e)
  }
}

// 收藏/取消收藏
async function toggleFavorite(postId: number, favorited?: boolean, isTopPost = false) {
  try {
    if (favorited) {
      await undoFavorite(postId)
    } else {
      await doFavorite(postId)
    }
    await fetchPosts()
    if (isTopPost) {
      await fetchTopPosts()
    }
  } catch (e) {
    console.error('切换收藏失败:', e)
  }
}

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
    message.success('删除成功')
    deleteConfirmVisible.value = false
    deletingPostId.value = null
    await fetchTopPosts()
    await fetchPosts()
  } catch (e: any) {
    message.error(e?.message || '删除失败')
  }
}

function cancelDelete() {
  deleteConfirmVisible.value = false
  deletingPostId.value = null
}

// 置顶相关
const topPayModalVisible = ref(false)
const togglingPostId = ref<number | null>(null)

// 处理置顶按钮点击
function handleTopClick(postId: number) {
  togglingPostId.value = postId
  topPayModalVisible.value = true
}

// 支付回调已经在后端完成置顶，这里只刷新页面状态
const onTopPaySuccess = async () => {
  topPayModalVisible.value = false
  togglingPostId.value = null
  message.success('Pinned successfully')
  try {
    await fetchTopPosts()
    await fetchPosts()
  } catch (error) {
    console.error('Failed to refresh posts after payment:', error)
  }
}

// 取消付费置顶
const handleCancelTopPay = () => {
  topPayModalVisible.value = false
  togglingPostId.value = null
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

// 分页变化处理
function onPageChange(page: number, pageSize?: number) {
  pagination.current = page
  if (pageSize) {
    pagination.pageSize = pageSize
  }
  updateRoutePage(page)
  fetchPosts()
}

const top10 = ref<string[]>(Array.from({ length: 10 }).map((_, i) => `HKUer 上线了 ${i + 1}`))

</script>

<template>
  <div class="content-wrap">
    <a-row :gutter="[16,16]">
      <a-col :xs="24" :lg="16">
        <!-- 置顶帖子板块 -->
        <a-card class="card" title="Top Posts" v-if="topPosts.length > 0">
          <a-spin :spinning="topLoading">
            <a-list
              item-layout="horizontal"
              :data-source="topPosts"
              :split="false"
            >
              <template #renderItem="{ item }">
                <a-list-item class="post-item top-post-item" @click="$router.push(`/user/post/${item.id}`)" style="cursor:pointer;">
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar :size="36" :src="item.authorAvatar" style="background:#f0f2f5;color:#999">
                        <template v-if="!item.authorAvatar">👤</template>
                      </a-avatar>
                    </template>
                    <template #title>
                      <div class="post-title">
                        <a-typography-text strong>{{ item.title }}</a-typography-text>
                        <a-tag color="geekblue" class="post-tag">{{ item.tag }}</a-tag>
                      </div>
                    </template>
                    <template #description>
                      <div class="post-preview" :title="stripHtml(item.content)">
                        {{ stripHtml(item.content) }}
                      </div>
                      <div class="post-desc">
                        <span class="meta">{{ item.authorNickname || '匿名' }}</span>
                        <span class="dot">•</span>
                        <span class="meta">{{ item.time }}</span>
                      </div>
                    </template>
                  </a-list-item-meta>

                <template #actions>
                  <span title="Views"><EyeOutlined /> {{ formatViews(item.views) }}</span>
                  <span title="Likes" @click.stop="toggleLike(item.id, item.isLiked, true)" :class="{ liked: item.isLiked }"><HeartFilled /> {{ item.likes }}</span>
                  <span title="Stars" @click.stop="toggleFavorite(item.id, item.isFavorited, true)" :class="{ favorited: item.isFavorited }"><StarFilled /> {{ item.stars }}</span>
                  <span title="Comments"><MessageOutlined /> {{ item.comments }}</span>
                  <span v-if="isAdmin" title="Delete" @click.stop="handleDeleteClick(item.id)" style="cursor: pointer; color: #ff4d4f;"><DeleteOutlined /></span>
                </template>
                </a-list-item>
              </template>
            </a-list>
          </a-spin>
        </a-card>

        <a-card class="card" title="Latest Posts">
          <a-spin :spinning="loading">
            <a-list
              item-layout="horizontal"
              :data-source="posts"
              :split="false"
            >
              <template #renderItem="{ item }">
                <a-list-item class="post-item" @click="$router.push(`/user/post/${item.id}`)" style="cursor:pointer;">
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar :size="36" :src="item.authorAvatar" style="background:#f0f2f5;color:#999">
                        <template v-if="!item.authorAvatar">👤</template>
                      </a-avatar>
                    </template>
                    <template #title>
                      <div class="post-title">
                        <a-typography-text strong>{{ item.title }}</a-typography-text>
                        <a-tag color="geekblue" class="post-tag">{{ item.tag }}</a-tag>
                      </div>
                    </template>
                    <template #description>
                      <div class="post-preview" :title="stripHtml(item.content)">
                        {{ stripHtml(item.content) }}
                      </div>
                      <div class="post-desc">
                        <span class="meta">{{ item.authorNickname || '匿名' }}</span>
                        <span class="dot">•</span>
                        <span class="meta">{{ item.time }}</span>
                      </div>
                    </template>
                  </a-list-item-meta>

                <template #actions>
                  <span title="Views"><EyeOutlined /> {{ formatViews(item.views) }}</span>
                  <span title="Likes" @click.stop="toggleLike(item.id, item.isLiked, false)" :class="{ liked: item.isLiked }"><HeartFilled /> {{ item.likes }}</span>
                  <span title="Stars" @click.stop="toggleFavorite(item.id, item.isFavorited, false)" :class="{ favorited: item.isFavorited }"><StarFilled /> {{ item.stars }}</span>
                    <span title="Comments"><MessageOutlined /> {{ item.comments }}</span>
                    <span v-if="isAdmin" title="Pin" @click.stop="handleTopClick(item.id)" style="cursor: pointer; color: #1890ff;"><PushpinOutlined /></span>
                    <span v-if="isAdmin" title="Delete" @click.stop="handleDeleteClick(item.id)" style="cursor: pointer; color: #ff4d4f;"><DeleteOutlined /></span>
                  </template>
                </a-list-item>
              </template>
            </a-list>
            <div class="pagination-wrapper">
              <a-pagination
                v-model:current="pagination.current"
                v-model:pageSize="pagination.pageSize"
                :total="pagination.total"
                :show-size-changer="false"
                :show-quick-jumper="true"
                :page-size-options="['10', '20', '50']"
                @change="onPageChange"
              />
            </div>
          </a-spin>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="8">
        <a-card class="card clock-weather" style="height: 243px; margin-bottom: 16px;">
          <div class="clock" style="margin-top: 3rem;">
            <div class="time">{{ timeText }}</div>
            <div class="date">{{ dateText }}</div>
          </div>
          <div class="weather" style="margin-top: 3rem;">
            <div class="icon">{{ weather.icon }}</div>
            <div class="temp">{{ weather.tempC === null ? '--' : weather.tempC }}°C</div>
            <div class="city">{{ weather.city }}</div>
            <div class="cond">{{ weather.condition }}</div>
          </div>
        </a-card>

        <a-card class="card side-card" :title="`Top10 Posts`" extra="<a>Learn More</a>">
          <ol class="plain-list">
            <li v-for="(t, i) in top10" :key="i">{{ i + 1 }}. {{ t }}</li>
          </ol>
        </a-card>
      </a-col>
    </a-row>
    
    <!-- 删除确认弹窗 -->
    <a-modal
      v-model:open="deleteConfirmVisible"
      title="确认删除"
      @ok="confirmDelete"
      @cancel="cancelDelete"
    >
      <p>确定要删除这条帖子吗？删除后无法恢复。</p>
    </a-modal>

    <!-- 置顶付费弹窗 -->
    <a-modal
      v-model:open="topPayModalVisible"
      title="Pin Post"
      :footer="null"
      @cancel="handleCancelTopPay"
    >
      <div class="pay-modal-content">
        <p style="font-size: 16px; margin-bottom: 12px;">
          <strong>Pinning posts requires payment</strong>
        </p>
        <p style="color: #666; margin-bottom: 16px;">
          According to platform rules, pinning posts requires payment. Please pay <strong style="color: #ff4d4f; font-size: 18px;">¥0.02</strong> to pin this post.
        </p>
        <Payment
          pay-type="alipay"
          business-type="POST_TOP"
          :business-id="togglingPostId ?? 0"
          button-text="Confirm Payment to Pin"
          @success="onTopPaySuccess"
        />
        <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-top: 16px;">
          <p style="margin: 0; font-size: 14px; color: #999;">
            <strong>Note:</strong> After completing the payment by scanning the QR code or redirecting, the post will be automatically pinned. If you encounter any issues, please contact customer service.
          </p>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.content-wrap {
  overflow-y: auto;
  height: calc(100vh - 70px);
  overflow-x: hidden;
  min-width: 1350px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 16px;
}

.card {
  border-radius: 10px;
  overflow: hidden;

  :deep(.ant-card-head) {
    padding: 0 16px;
    min-height: 44px;
  }
  :deep(.ant-card-body) {
    padding: 16px;
  }
}
.no-padding :deep(.ant-card-body) { padding: 0; }

/* 置顶帖子样式 */
.top-post-item {
  background: #fff7e6;
  border-left: 3px solid #faad14;
}

/* 右侧 时钟 + 天气 */
.clock-weather {
  :deep(.ant-card-body) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .clock .time {
    font-size: 36px;
    font-weight: 800;
    line-height: 1;
  }
  .clock .date {
    margin-top: 8px;
    font-size: 26px;
    color: #666;
  }

  .weather {
    .icon { font-size: 50px; line-height: 1; }
    .temp { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .city { font-size: 16px; color: #999; margin-top: 2px; }
    .cond { font-size: 16px; color: #666; }
  }
}

/* Latest Posts 列表 */
.post-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;

  :deep(.ant-list-item-meta) { margin-bottom: 0; }

  .post-title {
    display: flex;
    align-items: center;
    gap: 8px;

    .post-tag { margin-inline-start: 0; }
  }

  .post-desc {
    color: #999;
    .dot { padding: 0 6px; }
  }

:deep(.ant-list-item-action) {
  margin-inline-start: 12px;
  li { color: #666; }
  .liked { color: #ff4d4f; }
  .favorited { color: #faad14; }
}
}

/* 右侧两块 */
.side-card .plain-list {
  margin: 0;
  padding-left: 18px;
  li { line-height: 26px; }
}

.placeholder {
  margin-top: 12px;
  height: 120px;
  border: 1px dashed #ddd;
  border-radius: 6px;
  background: repeating-linear-gradient(
    45deg,
    rgba(0,0,0,0.02),
    rgba(0,0,0,0.02) 10px,
    transparent 10px,
    transparent 20px
  );
}

/* 分页样式 */
.pagination-wrapper {
  margin-top: 16px;
  text-align: right;
}

.post-preview {
  /* 1. 限制固定宽度 (按你的要求) */
  max-width: 600px;  /* 内容达到这个宽度后会自动换行 */
  
  /* 2. 多行省略的核心代码 */
  display: -webkit-box;           /* 必须结合的属性 */
  -webkit-box-orient: vertical;   /* 设置盒子内容垂直排列 */
  -webkit-line-clamp: 2;          /* 限制最多显示 2 行 */
  overflow: hidden;               /* 超出部分隐藏 */
  
  /* 3. 优化断行体验 */
  word-break: break-word;         /* 确保长单词（如URL）也能正确换行 */
  line-height: 1.5;               /* 设置行高，防止文字挤在一起 */
  text-align: left;
  /* 4. 其它装饰 */
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
  cursor: default;
}

/* 移动端适配：手机上宽度改小一点 */
@media (max-width: 768px) {
  .post-preview {
    max-width: 100%; /* 手机上通常让它占满屏幕宽度，或者设一个具体数值如 250px */
  }
}

/* 响应式 */
@media (max-width: 992px) {
  .clock-weather {
    :deep(.ant-card-body) { flex-direction: column; align-items: flex-start; }
    .weather { border-left: none; border-top: 1px solid #f0f0f0; padding-top: 8px; }
  }
  .pagination-wrapper {
    text-align: center;
  }
}

.pay-modal-content {
  padding: 8px 0;
}
</style>
