<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { social, type Notice } from '../social-api'
import { meshUser, authDialog } from '../session'
import { dateText } from '../api'
import MeshIcon from '../components/MeshIcon.vue'
const router = useRouter(),
    items = ref<Notice[]>([]),
    page = ref(1),
    total = ref(0),
    tab = ref('interaction'),
    error = ref(''),
    visible = computed(() =>
        items.value.filter((n) => (tab.value === 'system' ? n.kind === 'system' : n.kind !== 'system'))
    )
async function load() {
    if (!meshUser.value) return
    try {
        const data = await social.notifications(page.value, tab.value)
        items.value = data.records
        total.value = data.total
        error.value = ''
    } catch (e) {
        error.value = (e as Error).message
    }
}
watch([meshUser, page], load, { immediate: true })
watch(tab, () => {
    page.value = 1
    load()
})
async function open(n: Notice) {
    try { await social.readNotice(n.id)
    n.isRead = true
    if (n.targetPath?.startsWith('/') && !n.targetPath.startsWith('//')) router.push(n.targetPath)
    } catch(e) { error.value=(e as Error).message }
}
async function readAll() {
    try { await social.readNotice(); await load() } catch(e) { error.value=(e as Error).message }
}
</script>
<template>
    <section class="notifications-page panel">
        <div class="row-between">
            <h1><button aria-label="返回个人中心" @click="router.push('/profile/info')"><MeshIcon name="arrow"/></button>消息通知</h1>
            <button v-if="meshUser && items.some(n=>!n.isRead)" class="text-button" @click="readAll">全部已读</button>
        </div>
        <div class="segmented">
            <button :class="{ active: tab === 'interaction' }" @click="tab = 'interaction'">互动消息</button
            ><button :class="{ active: tab === 'system' }" @click="tab = 'system'">系统通知</button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-if="!meshUser" class="empty">
            <button class="primary" @click="authDialog = 'login'">登录查看通知</button>
        </div>
        <div v-else-if="!visible.length" class="empty"><MeshIcon name="bell"/><p>{{tab==='system'?'暂无系统通知':'暂无互动消息'}}</p></div>
        <button
            v-for="n in visible"
            :key="n.id"
            class="notice-item"
            :class="{ unreadNotice: !n.isRead }"
            @click="open(n)"
        >
            <span
                ><strong>{{ n.title }}</strong>
                <p>{{ n.content }}</p>
                <small class="muted">{{ dateText(n.createdAt) }}</small></span
            ><i v-if="!n.isRead" /></button
        ><a-pagination
            v-if="total > 20"
            v-model:current="page"
            :total="total"
            :page-size="20"
            :show-size-changer="false"
        />
    </section>
</template>
