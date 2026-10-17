<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { Modal, Button, message } from 'ant-design-vue'
import QRCode from 'qrcode'
import {
  createOrder,
  queryOrder,
  type CreateOrderRequest,
  type CreateOrderResponse
} from '@/api/payment'

/** 轮询间隔（毫秒） */
const POLL_INTERVAL = 3000
/** 最大轮询次数（约 5 分钟） */
const POLL_MAX_COUNT = 100

const props = withDefaults(
  defineProps<{
    /** 支付方式：alipay | wxpay | qqpay 等 */
    payType: string
    /** 支付业务类型，价格由后端确定 */
    businessType: 'AD_POST_PUBLISH' | 'POST_TOP'
    /** 业务对象 ID，目前对应帖子 ID */
    businessId: string | number
    /** 按钮文字 */
    buttonText?: string
    /** 按钮类型 */
    buttonType?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  }>(),
  {
    buttonText: '发起支付',
    buttonType: 'primary'
  }
)

const emit = defineEmits<{
  /** 支付成功时触发，用于刷新余额等数据 */
  success: []
}>()

// --- 状态 ---
const loading = ref(false)
const modalVisible = ref(false)
const qrcodeDataUrl = ref('')
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const pollCount = ref(0)
const currentOrderId = ref('')
const dueAmount = ref<number | null>(null)

/** 清除轮询定时器，防止内存泄漏 */
function clearPoll() {
  if (pollTimer.value !== null) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
  pollCount.value = 0
}

/** 发起下单请求并处理返回：qrcode 弹窗轮询 / payurl 跳转 */
async function handlePay() {
  const businessId = Number(props.businessId)
  if (!Number.isSafeInteger(businessId) || businessId <= 0) {
    message.error('支付业务信息无效，请刷新页面后重试')
    return
  }

  const request: CreateOrderRequest = {
    payType: props.payType,
    businessType: props.businessType,
    businessId
  }

  loading.value = true
  try {
    const res: CreateOrderResponse = await createOrder(request)
    if (!res.orderId) {
      message.warning('未返回支付订单号，请稍后重试')
      return
    }
    currentOrderId.value = res.orderId
    dueAmount.value = typeof res.amount === 'number' ? res.amount : Number(res.amount)

    // 分支 A：有 qrcode，展示二维码并开始轮询
    if (res.qrcode) {
      qrcodeDataUrl.value = await QRCode.toDataURL(res.qrcode, {
        width: 220,
        margin: 1
      })
      modalVisible.value = true
      startPoll(res.orderId)
      return
    }

    // 分支 B：仅有 payurl，跳转收银台
    if (res.payurl) {
      window.location.href = res.payurl
      return
    }

    message.warning('未返回支付链接或二维码，请稍后重试')
  } catch (e) {
    message.error('下单失败，请稍后重试')
    console.error(e)
  } finally {
    loading.value = false
  }
}

/** 开始轮询查单 */
function startPoll(orderId: string) {
  clearPoll()
  pollCount.value = 0

  const tick = async () => {
    pollCount.value += 1
    if (pollCount.value > POLL_MAX_COUNT) {
      clearPoll()
      modalVisible.value = false
      message.warning('支付查询超时，请稍后重试')
      return
    }

    try {
      const res = await queryOrder(orderId)
      if (res.status === 1 && res.fulfilled) {
        clearPoll()
        modalVisible.value = false
        message.success('支付成功')
        emit('success')
        return
      }
      if (res.status === 4) {
        clearPoll()
        modalVisible.value = false
        message.error('实付金额与应付金额不一致，业务未生效，请联系客服处理退款')
      }
    } catch (e) {
      console.error('查单失败', e)
    }
  }

  tick() // 立即查一次
  pollTimer.value = setInterval(tick, POLL_INTERVAL)
}

/** 关闭二维码弹窗时停止轮询 */
function onModalClose() {
  modalVisible.value = false
  clearPoll()
  qrcodeDataUrl.value = ''
}

// 组件销毁时务必清除定时器
onBeforeUnmount(() => {
  clearPoll()
})
</script>

<template>
  <div class="payment-wrap">
    <Button
      :type="buttonType"
      :loading="loading"
      @click="handlePay"
    >
      {{ buttonText }}
    </Button>

    <Modal
      v-model:open="modalVisible"
      title="扫码支付"
      :footer="null"
      :maskClosable="false"
      :closable="true"
      @cancel="onModalClose"
    >
      <div class="qrcode-box">
        <img
          v-if="qrcodeDataUrl"
          :src="qrcodeDataUrl"
          alt="支付二维码"
          class="qrcode-img"
        />
        <p class="qrcode-tip">请使用{{ payType === 'alipay' ? '支付宝' : payType === 'wxpay' ? '微信' : '对应 App' }}扫码支付</p>
        <p v-if="dueAmount !== null && Number.isFinite(dueAmount)" class="amount-tip">
          应付金额 ¥{{ dueAmount.toFixed(2) }}，请在支付页面输入完全相同的金额
        </p>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.payment-wrap {
  display: inline-block;
}
.qrcode-box {
  text-align: center;
  padding: 12px 0;
}
.qrcode-img {
  display: block;
  margin: 0 auto 12px;
  width: 220px;
  height: 220px;
}
.qrcode-tip {
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
  margin: 0 0 8px;
}
.amount-tip {
  color: #cf1322;
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}
</style>
