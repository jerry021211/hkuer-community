<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '@/utils/request'
import { createArticleComment, replyComment, deleteComment, type CommentItem } from '@/api/comment'
import { requireSession, meshUser } from '../session'
import { dateText, plainText } from '../api'
import { message } from 'ant-design-vue'
const emit=defineEmits<{changed:[]}>()
const props = defineProps<{ id: string; compact?: boolean; inline?: boolean }>(),
    items = ref<CommentItem[]>([]),
    draft = ref(''),
    replyTo = ref<CommentItem>(),
    busy = ref(false),
    error = ref('')
let sequence=0
async function load() {
    const stamp=++sequence
    try {
        const result = await api.get<CommentItem[]>(`/java/mesh/public/content/${props.id}/comments`)
        if(stamp===sequence){items.value = result; error.value = ''}
    } catch (e) {
        if(stamp===sequence)error.value = (e as Error).message
    }
}
watch(() => [props.id,meshUser.value?.userId], () => {items.value=[];draft.value='';replyTo.value=undefined;load()}, { immediate: true })
async function submit() {
    if (!requireSession() || busy.value) return
    busy.value = true
    try {
        if (replyTo.value)
            await replyComment({ parentId: replyTo.value.callId || replyTo.value.id!, contentMd: draft.value })
        else await createArticleComment({ postId: props.id, contentMd: draft.value })
        draft.value = ''
        replyTo.value = undefined
        await load()
        emit('changed')
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        busy.value = false
    }
}
async function remove(item: CommentItem) {
    try {
        await deleteComment(item.callId || item.id!)
        await load()
        emit('changed')
    } catch (e) {
        message.error((e as Error).message)
    }
}
function flatten(items: CommentItem[]): CommentItem[] {
    return items.flatMap((item) => [item, ...flatten(item.children || [])])
}
</script>
<template>
    <section class="answers" :class="{'compact-comments':compact||inline,'inline-comments':inline}">
        <h3>评论 <span v-if="items.length">({{items.length}})</span></h3>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="!items.length" class="muted comments-empty">{{compact?'☁ 暂无评论':'还没有评论，来说两句吧'}}</p>
        <article v-for="item in items" :key="item.callId" class="answer">
            <div class="post-byline">
                <strong>{{ item.nickname }}</strong
                ><small class="muted">{{ dateText(item.createdAt) }}</small>
            </div>
            <p class="review-content">{{ plainText(item.contentMd) }}</p>
            <div class="post-actions">
                <button @click="requireSession() && (replyTo = item)">回复</button
                ><a-popconfirm v-if="meshUser?.userId === item.userId" title="删除评论？" @confirm="remove(item)"
                    ><button>删除</button></a-popconfirm
                >
            </div>
            <div v-for="reply in flatten(item.replies || [])" :key="reply.id" class="comment-reply">
                <strong>{{ reply.fromNickname }}</strong
                ><span class="muted"> 回复 {{ reply.toNickname }}</span>
                <p>{{ plainText(reply.contentMd) }}</p>
                <button @click="requireSession() && (replyTo = reply)">回复</button>
            </div>
        </article>
        <form class="answer-form" @submit.prevent="submit">
            <span v-if="compact" class="avatar">{{meshUser?.nickname?.slice(0,1)||'?'}}</span>
            <p v-if="replyTo" class="muted">
                回复 {{ replyTo.nickname || replyTo.fromNickname }}
                <button type="button" @click="replyTo = undefined">取消</button>
            </p>
            <textarea
                v-model="draft"
                :rows="compact||inline?1:3"
                maxlength="5000"
                :placeholder="inline?'写下你的评论…':compact?'说点什么…':'写下你的评论…'"
                aria-label="评论内容"
                @focus="requireSession"
            /><button class="primary" :disabled="busy || !draft.trim()">{{busy?'发送中…':inline?'回复':compact?'发送':'发表评论'}}</button>
        </form>
    </section>
</template>
