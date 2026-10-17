<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { HomeOutlined } from '@ant-design/icons-vue'
import { getOnlineCount, getUserCount, getPostCount, getCommentCount } from '@/api/console'

const router = useRouter()

const onlineCount = ref<number>(0)
const totalUsers = ref<number>(0)
const activePosts = ref<number>(0)
const comments = ref<number>(0)

const stats = computed(() => [
  { label: 'Total Users', value: totalUsers.value.toLocaleString(), change: '', trend: 'up' },
  { label: 'Active Posts', value: activePosts.value.toLocaleString(), change: '', trend: 'up' },
  { label: 'Comments', value: comments.value.toLocaleString(), change: '', trend: 'up' },
  { label: 'Online Users', value: String(onlineCount.value), change: '', trend: 'up' },
])

const chartData = ref([65, 78, 52, 91, 43, 87, 62, 75, 88, 45, 70, 82])
const chartLabels = ref(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])

const tableData = ref([
  { id: '001', user: 'Zhang Wei', action: 'Created new post', time: '2 min ago', status: 'Active' },
  { id: '002', user: 'Li Ming', action: 'Updated profile', time: '15 min ago', status: 'Active' },
  { id: '003', user: 'Wang Fang', action: 'Commented on post', time: '32 min ago', status: 'Pending' },
  { id: '004', user: 'Chen Jie', action: 'Registered account', time: '1 hour ago', status: 'Active' },
  { id: '005', user: 'Liu Yan', action: 'Deleted comment', time: '2 hours ago', status: 'Inactive' },
  { id: '006', user: 'Zhao Qiang', action: 'Uploaded image', time: '3 hours ago', status: 'Active' },
])

const currentTime = ref('')
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

let timeInterval: ReturnType<typeof setInterval>
let onlineCountInterval: ReturnType<typeof setInterval>

async function fetchOnlineCount() {
  onlineCount.value = await getOnlineCount()
}
async function fetchUserCount() {
  totalUsers.value = await getUserCount()
}
async function fetchPostCount() {
  activePosts.value = await getPostCount()
}
async function fetchCommentCount() {
  comments.value = await getCommentCount()
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  fetchOnlineCount()
  fetchUserCount()
  fetchPostCount()
  fetchCommentCount()
  onlineCountInterval = setInterval(fetchOnlineCount, 30000)
})

onUnmounted(() => {
  clearInterval(timeInterval)
  clearInterval(onlineCountInterval)
})

const chartMax = Math.max(...chartData.value)

function goHome() {
  router.push('/user/home')
}
</script>

<template>
  <div class="dashboard-content">
    <header class="header">
      <div class="header-left">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">{{ currentTime }}</p>
      </div>
      <div class="header-right">
        <button class="home-btn" @click="goHome">
          <HomeOutlined />
          <span>Home</span>
        </button>
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input type="text" placeholder="Search..." class="search-input" />
        </div>
        <button class="icon-btn">⚑</button>
        <button class="icon-btn">⚙</button>
      </div>
    </header>

    <section class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-header">
          <span class="stat-label">{{ stat.label }}</span>
          <span :class="['stat-change', stat.trend]">{{ stat.change }}</span>
        </div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-bar">
          <div class="stat-bar-fill" :style="{ width: '75%' }"></div>
        </div>
      </div>
    </section>

    <section class="charts-section">
      <div class="chart-card large">
        <div class="card-header">
          <h2 class="card-title">Monthly Overview</h2>
          <div class="card-actions">
            <button class="action-btn active">Year</button>
            <button class="action-btn">Month</button>
            <button class="action-btn">Week</button>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-y-axis">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>
          <div class="chart-bars">
            <div v-for="(value, index) in chartData" :key="index" class="bar-group">
              <div class="bar" :style="{ height: `${(value / chartMax) * 100}%` }">
                <span class="bar-value">{{ value }}</span>
              </div>
              <span class="bar-label">{{ chartLabels[index] }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="card-header">
          <h2 class="card-title">Distribution</h2>
        </div>
        <div class="donut-chart">
          <svg viewBox="0 0 100 100" class="donut">
            <circle cx="50" cy="50" r="40" class="donut-ring" />
            <circle cx="50" cy="50" r="40" class="donut-segment seg-1"
              stroke-dasharray="100 151.4" stroke-dashoffset="0" />
            <circle cx="50" cy="50" r="40" class="donut-segment seg-2"
              stroke-dasharray="60 151.4" stroke-dashoffset="-100" />
            <circle cx="50" cy="50" r="40" class="donut-segment seg-3"
              stroke-dasharray="40 151.4" stroke-dashoffset="-160" />
          </svg>
          <div class="donut-center">
            <span class="donut-value">3,284</span>
            <span class="donut-label">Total</span>
          </div>
        </div>
        <div class="legend">
          <div class="legend-item">
            <span class="legend-dot"></span>
            <span>Posts (40%)</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #69b1ff"></span>
            <span>Comments (35%)</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #91caff"></span>
            <span>Users (25%)</span>
          </div>
        </div>
      </div>
    </section>

    <section class="table-section">
      <div class="table-card">
        <div class="card-header">
          <h2 class="card-title">Recent Activity</h2>
          <button class="view-all-btn">View All →</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Action</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableData" :key="row.id">
              <td class="mono">{{ row.id }}</td>
              <td class="bold">{{ row.user }}</td>
              <td>{{ row.action }}</td>
              <td class="muted">{{ row.time }}</td>
              <td>
                <span :class="['status-badge', row.status.toLowerCase()]">
                  {{ row.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard-content {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1e3a5f;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 16px;
  gap: 10px;
}

.search-icon {
  font-size: 18px;
  color: #888;
}

.search-input {
  border: none;
  outline: none;
  font-size: 14px;
  width: 200px;
  background: transparent;
}

.search-input::placeholder {
  color: #aaa;
}

.icon-btn {
  width: 44px;
  height: 44px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: #1677ff;
  color: #fff;
  border-color: #1677ff;
}

.home-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #1e3a5f;
}

.home-btn:hover {
  background: #1677ff;
  color: #fff;
  border-color: #1677ff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-change {
  font-size: 12px;
  font-weight: 600;
}

.stat-change.up {
  color: #52c41a;
}

.stat-change.down {
  color: #ff7875;
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 16px;
  color: #1e3a5f;
}

.stat-bar {
  height: 4px;
  background: #e6f4ff;
  border-radius: 2px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1677ff, #69b1ff);
  border-radius: 2px;
}

.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 40px;
}

.chart-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 28px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.action-btn.active {
  background: #1677ff;
  color: #fff;
  border-color: #1677ff;
}

.chart-container {
  display: flex;
  height: 280px;
  gap: 16px;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
  padding: 0 8px 24px 0;
  text-align: right;
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 24px;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar {
  width: 100%;
  max-width: 40px;
  background: linear-gradient(180deg, #1677ff 0%, #69b1ff 100%);
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
}

.bar:hover {
  background: linear-gradient(180deg, #0958d9 0%, #4096ff 100%);
}

.bar-value {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.bar:hover .bar-value {
  opacity: 1;
}

.bar-label {
  margin-top: 12px;
  font-size: 11px;
  color: #888;
}

.donut-chart {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto 24px;
}

.donut {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-ring {
  fill: none;
  stroke: #e6f4ff;
  stroke-width: 12;
}

.donut-segment {
  fill: none;
  stroke-width: 12;
  stroke-linecap: round;
}

.seg-1 {
  stroke: #1677ff;
}

.seg-2 {
  stroke: #69b1ff;
}

.seg-3 {
  stroke: #91caff;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.donut-value {
  display: block;
  font-size: 28px;
  font-weight: 800;
}

.donut-label {
  display: block;
  font-size: 12px;
  color: #888;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #666;
}

.legend-dot {
  width: 12px;
  height: 12px;
  background: #1677ff;
  border-radius: 3px;
}

.table-section {
  margin-bottom: 40px;
}

.table-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 28px;
}

.view-all-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #1677ff;
  transition: opacity 0.2s ease;
}

.view-all-btn:hover {
  opacity: 0.7;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 16px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  border-bottom: 1px solid #e8e8e8;
}

.data-table td {
  padding: 18px 12px;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover {
  background: #f0f5ff;
}

.mono {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #888;
}

.bold {
  font-weight: 600;
}

.muted {
  color: #888;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-badge.active {
  background: #1677ff;
  color: #fff;
}

.status-badge.pending {
  background: #e6f4ff;
  color: #1677ff;
}

.status-badge.inactive {
  background: transparent;
  color: #8c8c8c;
  border: 1px solid #d9d9d9;
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-section {
    grid-template-columns: 1fr;
  }
}
</style>
