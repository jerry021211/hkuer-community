<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { api } from '@/utils/request'
import { requireSession } from '../session'
const props = withDefaults(defineProps<{ id: string; type?: string }>(), { type: 'POST' }),
    open = ref(false),
    reason = ref(''),
    busy = ref(false)
async function submit() {
    if (!reason.value.trim() || busy.value) return
    busy.value = true
    try {
        await api.post('/java/report/submit', { targetId: props.id, targetType: props.type, reason: reason.value })
        open.value = false
        reason.value = ''
        message.success('举报已提交，管理员会尽快处理')
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        busy.value = false
    }
}
</script>
<template>
    <button class="report-link" @click="requireSession() && (open = true)">举报</button
    ><a-modal
        v-model:open="open"
        title="举报内容"
        :confirm-loading="busy"
        :ok-button-props="{ disabled: !reason.trim() }"
        @ok="submit"
        ><p>请说明举报原因</p>
        <a-textarea v-model:value="reason" :rows="4" :maxlength="500" placeholder="例如：垃圾广告、骚扰、违规内容…"
    /></a-modal>
</template>
