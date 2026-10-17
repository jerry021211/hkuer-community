import { api } from '@/utils/request'

// ========== 码支付/易支付 下单与查单 ==========

/** 创建订单请求参数 */
export interface CreateOrderRequest {
    /** 支付方式：alipay-支付宝, wxpay-微信支付, qqpay-QQ钱包等 */
    payType: string
    /** 支付业务类型，金额与商品信息由后端确定 */
    businessType: 'AD_POST_PUBLISH' | 'POST_TOP'
    /** 业务对象 ID，目前对应帖子 ID */
    businessId: number
}

/** 创建订单响应：有 qrcode 时展示二维码轮询；仅有 payurl 时跳转收银台 */
export interface CreateOrderResponse {
    /** 二维码内容（扫码支付时返回） */
    qrcode?: string
    /** 收银台跳转链接（跳转支付时返回） */
    payurl?: string
    /** 商户订单号 */
    orderId?: string
    /** 后端确定的应付金额 */
    amount?: number
    businessType?: CreateOrderRequest['businessType']
    businessId?: number
    urlscheme?: string
}

/** 查单响应 */
export interface QueryOrderResponse {
    /** 订单状态：0-未支付, 1-已支付, 2-已关闭, 3-已退款, 4-支付金额异常 */
    status: number
    orderId?: string
    /** 支付后的业务操作是否已经在后端完成 */
    fulfilled: boolean
}

/**
 * 创建支付订单（码支付/易支付）
 * 返回 qrcode 则展示二维码并轮询；仅返回 payurl 则跳转
 */
export async function createOrder(params: CreateOrderRequest): Promise<CreateOrderResponse> {
    return await api.post<CreateOrderResponse>('/java/api/pay/createOrder', params)
}

/**
 * 查询订单支付状态
 * @param orderId 商户订单号
 */
export async function queryOrder(orderId: string): Promise<QueryOrderResponse> {
    return await api.get<QueryOrderResponse>(
        `/java/api/pay/queryOrder?orderId=${encodeURIComponent(orderId)}`
    )
}

// ========== 原有支付广告帖子接口 ==========

/**
 * 支付广告帖子费用
 * @param amount 支付金额（单位：元）
 * @param postId 帖子ID（可选，如果已有帖子ID）
 * @returns 支付结果
 */
export async function payForAdPost(amount: number = 0.02, postId?: number): Promise<{ success: boolean; orderId?: string }> {
    // TODO: 替换为实际的支付接口
    // 示例接口调用：
    // return await api.post<{ success: boolean; orderId: string }>('/java/payment/pay-for-ad', {
    //     amount,
    //     postId
    // })

    // 临时模拟实现
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                orderId: `ORDER_${Date.now()}`
            })
        }, 1000)
    })
}

/**
 * 检查支付状态
 * @param orderId 订单ID
 * @returns 支付状态
 */
export async function checkPaymentStatus(orderId: string): Promise<{ paid: boolean }> {
    // TODO: 替换为实际的支付状态查询接口
    // return await api.get<{ paid: boolean }>(`/java/payment/status?orderId=${orderId}`)

    // 临时模拟实现
    return { paid: true }
}

