<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Result, Descriptions, Button } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()

// 从 URL query 参数获取订单信息
const orderId = computed(() => (route.query.orderId as string) || '未知订单号')
const amount = computed(() => {
  const amt = route.query.amount as string
  return amt ? parseFloat(amt).toFixed(2) : '0.00'
})
const payTime = computed(() => {
  const time = route.query.payTime as string
  if (time) {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// 倒计时相关
const countdown = ref(5)
let timer: ReturnType<typeof setInterval> | null = null

// 开始倒计时
const startCountdown = () => {
  countdown.value = 5
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearTimer()
      router.push('/user/home')
    }
  }, 1000)
}

// 清除定时器
const clearTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 返回首页
const handleGoHome = () => {
  clearTimer()
  router.push('/user/home')
}

// 查看订单（这里可以根据实际需求跳转到订单详情页）
const handleViewOrder = () => {
  clearTimer()
  // 可以根据实际需求跳转到订单列表或订单详情页
  router.push('/user/home')
}

onMounted(() => {
  startCountdown()
})

onBeforeUnmount(() => {
  clearTimer()
})
</script>

<template>
  <div class="pay-success-container">
    <div class="pay-success-content">
      <Result
        status="success"
        title="支付成功"
        :sub-title="`感谢您的购买，订单处理中... (${countdown}秒后自动返回)`"
      >
        <template #extra>
          <Descriptions
            :column="1"
            bordered
            class="order-info"
          >
            <DescriptionsItem label="订单号">
              {{ orderId }}
            </DescriptionsItem>
            <DescriptionsItem label="支付金额">
              <span class="amount-highlight">¥{{ amount }}</span>
            </DescriptionsItem>
            <DescriptionsItem label="支付时间">
              {{ payTime }}
            </DescriptionsItem>
          </Descriptions>

          <div class="action-buttons">
            <Button
              type="primary"
              size="large"
              @click="handleGoHome"
            >
              返回首页
            </Button>
            <Button
              type="default"
              size="large"
              @click="handleViewOrder"
            >
              查看订单
            </Button>
          </div>
        </template>
      </Result>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pay-success-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

  .pay-success-content {
    width: 100%;
    max-width: 600px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    padding: 40px 24px;
    box-sizing: border-box;

    :deep(.ant-result) {
      padding: 0;

      .ant-result-title {
        font-size: 24px;
        font-weight: 600;
        color: #262626;
        margin-bottom: 8px;
      }

      .ant-result-subtitle {
        font-size: 14px;
        color: #8c8c8c;
        margin-bottom: 32px;
      }

      .ant-result-icon {
        margin-bottom: 24px;

        .anticon-check-circle {
          color: #52c41a;
          font-size: 72px;
        }
      }
    }

    .order-info {
      margin: 24px 0 32px;
      border-radius: 8px;
      overflow: hidden;

      :deep(.ant-descriptions-item-label) {
        font-weight: 500;
        color: #595959;
        background-color: #fafafa;
        width: 120px;
      }

      :deep(.ant-descriptions-item-content) {
        color: #262626;
      }
    }

    .amount-highlight {
      color: #ff4d4f;
      font-size: 18px;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 24px;

      :deep(.ant-btn) {
        min-width: 120px;
        height: 40px;
        border-radius: 6px;
        font-size: 15px;
        font-weight: 500;
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pay-success-container {
    padding: 16px;
    background: #fff;

    .pay-success-content {
      padding: 32px 20px;
      border-radius: 8px;
      box-shadow: none;

      :deep(.ant-result) {
        .ant-result-title {
          font-size: 20px;
        }

        .ant-result-subtitle {
          font-size: 13px;
          margin-bottom: 24px;
        }

        .ant-result-icon {
          margin-bottom: 20px;

          .anticon-check-circle {
            font-size: 64px;
          }
        }
      }

      .order-info {
        margin: 20px 0 24px;

        :deep(.ant-descriptions-item-label) {
          width: 100px;
          font-size: 13px;
        }

        :deep(.ant-descriptions-item-content) {
          font-size: 13px;
        }
      }

      .amount-highlight {
        font-size: 16px;
      }

      .action-buttons {
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;

        :deep(.ant-btn) {
          width: 100%;
          min-width: unset;
          height: 44px;
          font-size: 15px;
        }
      }
    }
  }
}

// 小屏幕手机适配
@media (max-width: 480px) {
  .pay-success-container {
    padding: 12px;

    .pay-success-content {
      padding: 24px 16px;

      :deep(.ant-result) {
        .ant-result-title {
          font-size: 18px;
        }

        .ant-result-subtitle {
          font-size: 12px;
        }

        .ant-result-icon {
          .anticon-check-circle {
            font-size: 56px;
          }
        }
      }

      .order-info {
        :deep(.ant-descriptions-item-label),
        :deep(.ant-descriptions-item-content) {
          font-size: 12px;
        }
      }
    }
  }
}
</style>