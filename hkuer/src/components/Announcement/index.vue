<script setup lang="ts">
import { defineProps, computed, ref, onMounted } from 'vue'
import { 
  SoundOutlined, 
  RightOutlined, 
  FireOutlined, 
  SafetyCertificateOutlined,
  NotificationOutlined,
  SyncOutlined
} from '@ant-design/icons-vue'

// --- 数据接口定义 ---
interface NoticeItem {
  id: number
  title: string
  type: 'News' | 'Activity' | 'Maintenance' | 'Security'
  date?: string
  link?: string
  isHot?: boolean
}

const props = defineProps<{
  notices?: NoticeItem[]
}>()

// --- 默认公告数据 ---
const defaultNotices: NoticeItem[] = [
  { id: 1, type: 'News', title: 'HKUer 2.0 版本正式发布！UI全面升级', date: '02-11', isHot: true },
  { id: 2, type: 'Maintenance', title: '2月14日凌晨系统停机维护通知', date: '02-10' },
  { id: 3, type: 'Activity', title: '“期末加油” 摄影大赛开始投稿啦', date: '02-09' },
  { id: 4, type: 'Security', title: '请大家警惕冒充学校官方的诈骗邮件', date: '02-08' }
]

const displayList = computed(() => props.notices || defaultNotices)

// --- 每日一句逻辑 ---
const quote = ref({ text: '', author: '' })
const quotesLib = [
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'Knowledge is power.', author: 'Francis Bacon' },
  { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { text: '仰天大笑出门去，我辈岂是蓬蒿人。', author: '李白' },
  { text: 'Universitas, via veritas vita.', author: 'HKU Motto' } // 港大校训
]

const refreshQuote = () => {
  const random = Math.floor(Math.random() * quotesLib.length)
  quote.value = quotesLib[random]
}

onMounted(() => {
  refreshQuote()
})

// --- 工具函数 ---
const getTagColor = (type: string) => {
  switch (type) {
    case 'Maintenance': return 'error'
    case 'Activity': return 'warning'
    case 'Security': return 'success'
    case 'News': return 'processing'
    default: return 'default'
  }
}
</script>

<template>
  <a-card class="anno-card" :bordered="false">
    <template #title>
      <div class="card-header">
        <span class="title-text">
          <SoundOutlined class="head-icon" /> 公告 / Announcement
        </span>
        <a class="more-link" href="/announcements">More <RightOutlined /></a>
      </div>
    </template>

    <div class="notice-list">
      <div v-for="item in displayList" :key="item.id" class="notice-item">
        <a-tag :color="getTagColor(item.type)" class="type-tag">{{ item.type }}</a-tag>
        <a :href="item.link || '#'" class="notice-title">
          {{ item.title }}
          <FireOutlined v-if="item.isHot" style="color: #ff4d4f; font-size: 12px;" />
        </a>
        <span class="notice-date">{{ item.date }}</span>
      </div>
    </div>

    <div class="daily-quote-box">
      <div class="quote-content">
        <span class="quote-icon">❝</span>
        <p class="quote-text">{{ quote.text }}</p>
        <div class="quote-footer">
          <span class="quote-author">—— {{ quote.author }}</span>
          <SyncOutlined class="refresh-btn" @click="refreshQuote" />
        </div>
      </div>
    </div>

  </a-card>
</template>

<style scoped lang="scss">
/* --- 保持原有的卡片和列表样式 --- */
.anno-card {
  margin-top: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  
  &:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
  }

  :deep(.ant-card-head) {
    min-height: 48px;
    padding: 0 16px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  :deep(.ant-card-body) {
    padding: 12px 16px 16px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .title-text { font-weight: 600; color: #333; gap: 8px; display: flex; align-items: center; }
  .head-icon { color: #1890ff; }
  .more-link { font-size: 12px; color: #999; font-weight: normal; &:hover { color: #1890ff; } }
}

.notice-list {
  display: flex; flex-direction: column; gap: 12px;
}

.notice-item {
  display: flex; align-items: center; font-size: 13px;
  .type-tag { margin-right: 8px; border-radius: 2px; font-size: 12px; transform: scale(0.9); }
  .notice-title { flex: 1; color: #444; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-right: 8px; &:hover { color: #1890ff; } }
  .notice-date { color: #ccc; font-size: 12px; flex-shrink: 0; }
}

/* --- ✨ 新增：每日一句样式 --- */
.daily-quote-box {
  margin-top: 18px;
  padding: 12px 16px;
  background: linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%); /* 极简灰白渐变，很有质感 */
  border-radius: 8px;
  position: relative;
  border: 1px solid #f0f0f0;
  
  .quote-icon {
    position: absolute;
    top: -6px;
    left: 10px;
    font-size: 24px;
    color: #e8e8e8;
    font-family: serif;
  }

  .quote-text {
    font-family: "Georgia", serif; /* 衬线体，更有书卷气 */
    font-size: 13px;
    color: #555;
    font-style: italic;
    margin: 4px 0 8px;
    line-height: 1.5;
    position: relative;
    z-index: 1;
  }

  .quote-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px dashed #e0e0e0; /* 虚线分隔 */
    padding-top: 6px;
    
    .quote-author {
      font-size: 12px;
      color: #999;
      font-weight: 600;
    }

    .refresh-btn {
      color: #bbb;
      cursor: pointer;
      font-size: 12px;
      transition: color 0.3s, transform 0.5s;
      
      &:hover {
        color: #1890ff;
        transform: rotate(180deg);
      }
    }
  }
}
</style>