<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { SortAscendingOutlined, SortDescendingOutlined, CheckOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
// 引入规范化后的 API
import { getTeacherList, rateTeacher, type TeacherItem } from '@/api/teacher';

const router = useRouter();

// --- 状态管理 ---
const loading = ref(false);
const teacherList = ref<TeacherItem[]>([]);
const isDesc = ref(true);


// 专门用来存储用户"当前正在打分"的状态
// key: teacherId, value: 用户选中的分数
const interactiveRatings = reactive<Record<string, number>>({});

const pagination = reactive({
  current: 1,
  pageSize: 6, // 需求：一页放6个
  total: 0
});

// --- API 请求逻辑 ---
const fetchData = async () => {
  loading.value = true;
  try {
    // 使用封装好的 API，无需解包 res.data.code
    const res = await getTeacherList(pagination.current, pagination.pageSize, isDesc.value);
    
    teacherList.value = res.records;
    pagination.total = res.total;
    
    // 每次翻页清空临时的打分状态（隐藏所有未提交的确认按钮）
    Object.keys(interactiveRatings).forEach(key => delete interactiveRatings[key]);
    
  } catch (error) {
    console.error(error);
    // 拦截器通常会处理错误提示，这里可视情况添加
  } finally {
    loading.value = false;
  }
};

// --- 交互：处理评分变化 ---
const handleRateChange = (teacherId: string, value: number) => {
  // 记录用户当前选中的分数，这会让确认按钮显示出来
  interactiveRatings[teacherId] = value;
};

// --- 交互：提交评分 ---
const handleSubmitRating = async (teacherId: string) => {
  const score = interactiveRatings[teacherId];
  if (!score) return;

  try {
    await rateTeacher(teacherId, score);
    message.success('Rating submitted successfully!');
    
    // 提交成功后，移除该条目的临时打分状态（隐藏按钮）
    delete interactiveRatings[teacherId];
    // 刷新列表以更新右侧的平均分
    fetchData();
  } catch (e) {
    console.error(e);
  }
};

// --- 排序切换 ---
const handleSort = () => {
  // 直接反转状态
  isDesc.value = !isDesc.value;
  
  // 提示用户
  message.info(`Switched to ${isDesc.value ? 'Descending' : 'Ascending'}`);
  
  // 重置回第一页并重新请求
  pagination.current = 1;
  fetchData();
};

// --- 跳转教师详情 ---
const goToDetail = (teacherId: string) => {
  router.push(`/user/teacher/${teacherId}`);
};

// --- 生命周期 ---
onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="ranking-container">
    <div class="header">
      <h2 class="title">HKU Course Rankings</h2>
    </div>

    <div class="sort-bar">
      <div class="sort-options">

        <span 
          class="sort-item active" 
          @click="handleSort"
        >
          Score 
          <component :is="isDesc ? SortDescendingOutlined : SortAscendingOutlined" />
        </span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="teacher-list">
        <div v-for="item in teacherList" :key="item.id" class="teacher-card">
          
          <div class="card-left-info" @click="goToDetail(item.id)">
            <div class="teacher-name">{{ item.name || 'Unknown' }}</div>
            <div class="teacher-desc">
              <span class="comment-prefix">Description: </span>
              <span class="comment-text">{{ item.description || 'No description available...' }}</span>
            </div>
          </div>

          <div class="card-interaction">
            <span class="label">Rate:</span>
            <a-rate 
              :value="interactiveRatings[item.id] || item.userRating || 0"
              @update:value="handleRateChange(item.id, $event)"
              class="interactive-rate"
            />
            
            <transition name="fade">
              <a-button 
                v-if="interactiveRatings[item.id]" 
                type="primary" 
                shape="circle" 
                size="small"
                class="confirm-btn"
                @click="handleSubmitRating(item.id)"
              >
                <template #icon><CheckOutlined /></template>
              </a-button>
            </transition>
          </div>

          <div class="card-score-display">
            <div class="score-value">{{ item.averageRating }}</div>
            <a-rate 
              :value="item.averageRating" 
              disabled 
              allow-half 
              class="score-rate-readonly" 
            />
          </div>

        </div>
      </div>
    </a-spin>

    <div class="pagination-container">
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        show-quick-jumper
        :pageSizeOptions="['6', '12', '24']"
        @change="fetchData"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.ranking-container {
  max-width: 1500px;
  margin: 0 auto;
  padding: 10px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 1. 标题样式 */
.header {

  border-bottom: 2px solid #000;
  margin-bottom: 10px;
  .title {
    font-size: 36px;
    font-weight: bold;
    margin-bottom: 16px;
  }
}

/* 2. 排序栏样式 */
.sort-bar {
  display: flex;
  justify-content: flex-end;

  .sort-options {
    display: flex;
    gap: 20px;
  }

  .sort-item {
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px; /* 字体变大后，图标和文字的间距也可以稍微调大一点 */
    color: #333;
    transition: color 0.3s;
    font-size: 18px; 
    &.active {
      color: #1890ff;
    }
    &:hover {
      color: #40a9ff;
    }
  }
}

/* 3. 列表卡片样式 */
.teacher-list {
  display: flex;
  flex-direction: column;
  gap: 20px; /* 卡片之间的间距 */
}

.teacher-card {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #eaeef3;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:hover {
    background: #f0f5ff;
    border-color: #b8d4ff;
    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.12);

    .card-left-info .teacher-name {
      color: #1890ff;
    }
  }

  /* 1. 左侧信息（可点击跳转详情） */
  .card-left-info {
    flex: 1;
    margin-right: 24px;
    text-align: left;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    cursor: pointer;

    &:hover .teacher-name {
      color: #1890ff;
    }

    .teacher-name {
      font-size: 19px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
      transition: color 0.3s ease;
    }
    
    .teacher-desc {
      font-size: 13.5px;
      color: #8c8c8c;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      
      .comment-prefix {
        font-weight: 600;
        color: #595959;
      }
    }
  }

  /* 2. 中间评分交互 */
  .card-interaction {
    display: flex;
    flex: 0 0 auto;
    width: 300px;
    align-items: center;
    gap: 10px;
    min-width: 240px;
    justify-content: center;
    padding: 0 16px;

    .label {
      font-weight: 600;
      color: #bbb;
      font-size: 14px;
      letter-spacing: 0.5px;
    }
    
    .interactive-rate {
      font-size: 24px;
      :deep(.ant-rate-star:not(.ant-rate-star-full)) {
        color: #e0e0e0; 
      }
    }

    .confirm-btn {
      background-color: #52c41a;
      border-color: #52c41a;
      animation: popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
  }

  /* 3. 右侧平均分 */
  .card-score-display {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    min-width: 120px;
    padding-left: 20px;
    border-left: 1px solid #eef0f4;

    .score-value {
      font-size: 30px;
      font-weight: 900;
      color: #1890ff;
      line-height: 1;
      margin-bottom: 6px;
    }

    .score-rate-readonly {
      font-size: 18px;
      :deep(.ant-rate-star-full) {
        color: #fadb14;
      }
      :deep(.ant-rate-star-half .ant-rate-star-first) {
        color: #fadb14;
      }
    }
  }
}

/* 4. 分页样式 */
.pagination-container {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

/* 动画定义 */
@keyframes popIn {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
