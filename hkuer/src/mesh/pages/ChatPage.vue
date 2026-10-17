<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { social, type Conversation, type ChatMessage } from '../social-api'
import { meshUser, authDialog } from '../session'
import MeshIcon from '../components/MeshIcon.vue'
const route = useRoute(),
    router = useRouter(),
    id = computed(() => String(route.params.id || '')),
    conversations = ref<Conversation[]>([]),
    messages = ref<ChatMessage[]>([]),
    draft = ref(''),
    busy = ref(false),
    error = ref(''),
    historyEnd = ref(false),
    scroll = ref<HTMLElement>(),
    pendingClient = ref(''),
    pendingText = ref('')
const selected = computed(() => conversations.value.find((c) => c.id === id.value))
function chatTime(value:string,relative=false){
    const date=new Date(value),now=new Date(),days=Math.floor((now.getTime()-date.getTime())/86400000)
    if(Number.isNaN(date.getTime()))return ''
    if(relative&&days>=7)return Math.floor(days/7)+'周前'
    if(relative&&days>0)return days+'天前'
    return date.toDateString()===now.toDateString()?date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString('zh-CN',{month:'long',day:'numeric'})
}
let timer: ReturnType<typeof setInterval> | undefined,
    sequence = 0
async function load() {
    if (!meshUser.value) return
    const request = ++sequence
    try {
        conversations.value = await social.conversations()
        if (id.value) {
            const rows = await social.messages(id.value)
            if (request !== sequence) return
            const latest = messages.value.at(-1)?.id
            messages.value = [...new Map([...messages.value, ...rows].map((m) => [m.id, m])).values()].sort(
                (a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id)
            )
            await social.read(id.value, rows.at(-1)?.id || '0')
            if (latest !== rows.at(-1)?.id) {
                await nextTick()
                scroll.value?.scrollTo({ top: scroll.value.scrollHeight, behavior: 'smooth' })
            }
        }
        error.value = ''
    } catch (e) {
        error.value = (e as Error).message
    }
}
watch(
    () => [id.value, meshUser.value?.userId],
    () => {
        messages.value = []
        historyEnd.value = false
        load()
    },
    { immediate: true }
)
onMounted(
    () =>
        (timer = setInterval(() => {
            if (document.visibilityState === 'visible' && !busy.value) load()
        }, 5000))
)
onUnmounted(() => clearInterval(timer))
async function earlier() {
    if (!id.value || !messages.value[0]) return
    try {
        const rows = await social.messages(id.value, messages.value[0].id)
        messages.value = [...rows, ...messages.value]
        historyEnd.value = rows.length < 50
    } catch (e) {
        error.value = (e as Error).message
    }
}
async function send() {
    if (!draft.value.trim() || busy.value || !id.value) return
    busy.value = true
    const text = draft.value
    if (pendingText.value !== text) {
        pendingClient.value = crypto.randomUUID()
        pendingText.value = text
    }
    try {
        await social.send(id.value, text, pendingClient.value)
        draft.value = ''
        pendingClient.value = ''
        pendingText.value = ''
        await load()
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        busy.value = false
    }
}
</script>
<template>
    <section class="chat-page" :class="{'chat-detail-page':!!id}">
        <div v-if="!meshUser" class="empty"><h3>登录后查看私信</h3><button class="primary" @click="authDialog='login'">登录</button></div>
        <template v-else>
            <aside v-if="!id" class="conversation-list"><h1>🗨️ 我的消息</h1>
                <RouterLink v-for="c in conversations" :key="c.id" :to="'/chat/'+c.id"><span class="avatar"><img v-if="c.contextImage || c.peerAvatar" :src="c.contextImage || c.peerAvatar" alt=""/><span v-else>{{c.peerName?.slice(0,1)}}</span></span><span class="conversation-text"><strong>{{c.contextTitle ? c.peerName+' · '+c.contextTitle : c.peerName}}</strong><small>{{c.lastMessage || '开始聊天'}}</small><small v-if="c.contextPrice!=null" class="context-price">HKD {{c.contextPrice}}</small></span><span class="conversation-meta"><small>{{chatTime(c.updatedAt,true)}}</small><b v-if="c.unread" class="unread">{{c.unread}}</b></span></RouterLink>
                <div v-if="!conversations.length" class="empty"><MeshIcon name="chat"/><p>暂无消息</p><small>在商品详情页点击“联系卖家”发起对话</small><RouterLink to="/marketplace" class="primary">去逛逛</RouterLink></div>
            </aside>
            <div v-else class="chat-thread">
                <header class="chat-title"><button aria-label="返回会话列表" @click="router.push('/chat')"><MeshIcon name="arrow"/></button><img v-if="selected?.contextImage || selected?.peerAvatar" :src="selected.contextImage || selected.peerAvatar" class="chat-context-image" alt=""/><div><RouterLink v-if="selected?.contextTitle" :to="{path:selected.contextKind==='rental'?'/rental':'/marketplace',query:{id:selected.contextPostId}}"><strong>{{selected.contextTitle}}</strong> ↗</RouterLink><strong v-else>{{selected?.peerName || '私信'}}</strong><RouterLink v-if="selected" :to="'/u/'+selected.peerId" class="chat-peer">{{selected.contextTitle?(selected.contextKind==='market'?'卖家: ':'发布者: '):''}}{{selected.peerName}}</RouterLink></div></header>
                <div ref="scroll" class="chat-messages"><button v-if="messages.length>=50 && !historyEnd" @click="earlier">加载更早消息</button><div v-for="m in messages" :key="m.id" class="message-row" :class="{mine:m.senderId===meshUser.userId}"><RouterLink v-if="m.senderId!==meshUser.userId" :to="'/u/'+m.senderId" class="avatar"><img v-if="selected?.peerAvatar" :src="selected.peerAvatar" alt=""/><span v-else>{{selected?.peerName?.slice(0,1)}}</span></RouterLink><div class="message-bubble"><p>{{m.content}}</p><small>{{m.senderId===meshUser.userId?(m.readByPeer?'已读 ':'未读 '):''}}{{chatTime(m.createdAt)}}</small></div></div><p v-if="!messages.length" class="empty">打个招呼吧</p></div>
                <form class="chat-compose" @submit.prevent="send"><textarea v-model="draft" rows="1" maxlength="2000" aria-label="消息内容" placeholder="输入消息..." @keydown.enter.exact="(e:KeyboardEvent)=>{if(!e.isComposing){e.preventDefault();send()}}"/><button aria-label="发送消息" :disabled="busy||!draft.trim()"><MeshIcon name="send"/></button></form>
            </div>
            <p v-if="error" class="error" role="alert">{{error}} <button @click="load">重试</button></p>
        </template>
    </section>
</template>
