<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ReportAction from './ReportAction.vue'
import { message } from 'ant-design-vue'
import { contentApi, dateText, plainText, type MeshPost } from '../api'
import { requireSession, authDialog } from '../session'
import MeshIcon from './MeshIcon.vue'
import ContentComments from './ContentComments.vue'
const props = defineProps<{ post: MeshPost; detail?: boolean }>()
const emit = defineEmits<{ open: [id: string]; changed: [] }>()
const busy = ref(false),
    router = useRouter()
const commentsOpen=ref(false), expanded=ref(false)
async function remove() {
    try {
        await contentApi.remove(props.post.id)
        message.success('已删除')
        if (props.detail)
            router.push(props.post.kind === 'qa' ? '/home' : props.post.kind === 'job' ? '/jobs' : '/life')
        else emit('changed')
    } catch (e) {
        message.error((e as Error).message)
    }
}
async function action(kind: 'same' | 'like' | 'favorite' | 'watch') {
    if (!requireSession() || busy.value) return
    busy.value = true
    try {
        const p = props.post
        if (kind === 'like') await contentApi.like(p.id, !p.liked)
        else if (kind === 'favorite') await contentApi.favorite(p.id, !p.favorited)
        else await contentApi.interaction(p.id, kind, kind === 'same' ? !p.same : !p.watching)
        emit('changed')
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        busy.value = false
    }
}
async function share() {
    try {
        await navigator.clipboard.writeText(location.origin + '/question/' + props.post.id)
        message.success('链接已复制')
    } catch {
        message.info(location.origin + '/question/' + props.post.id)
    }
}
</script>
<template>
    <article class="mesh-post" :class="{ 'post-detail': detail }">
        <div class="post-avatar avatar">
            <img v-if="post.authorAvatar" :src="post.authorAvatar" alt="" /><span v-else>{{
                post.authorName?.slice(0, 1) || '匿'
            }}</span>
        </div>
        <div class="post-body">
            <div class="post-byline">
                <RouterLink v-if="post.authorId" :to="'/u/' + post.authorId">{{ post.authorName }}</RouterLink
                ><span v-else>{{ post.authorName }}</span
                ><span class="muted">· {{ dateText(post.createdAt) }}</span
                ><template v-if="detail"
                    ><RouterLink v-if="post.own && post.status!==2" :to="'/edit/'+post.id" class="report-link">编辑</RouterLink
                    ><a-popconfirm v-if="post.own" title="删除这条内容？" @confirm="remove"
                        ><button class="report-link">删除</button></a-popconfirm
                    ><ReportAction v-else :id="post.id"
                /></template>
            </div>
            <div class="post-tags">
                <RouterLink v-for="tag in post.tags" :key="tag" :to="'/tag/' + encodeURIComponent(tag)">{{
                    tag
                }}</RouterLink>
            </div>
            <button v-if="!detail" class="post-title" @click="emit('open', post.id)">{{ post.title }}</button>
            <h2 v-else>{{ post.title }}</h2>
            <button v-if="post.locked" class="locked" @click="authDialog = 'login'">登录后查看完整内容与回答</button>
            <div v-else-if="detail" class="rich-content" v-html="post.content"></div>
            <p v-else-if="post.content" class="post-excerpt" @click="emit('open', post.id)">
                {{ expanded?plainText(post.content):plainText(post.content).slice(0, 160) }}
            </p>
            <button v-if="!detail&&plainText(post.content).length>160" class="post-expand" @click="expanded=!expanded">{{expanded?'收起':'展开'}}</button>
            <div v-if="!detail && post.images?.length" class="post-images">
                <img
                    v-for="url in post.images.slice(0, 3)"
                    :key="url"
                    :src="url"
                    alt="帖子图片"
                    @click="emit('open', post.id)"
                />
            </div>
            <div class="post-actions">
                <button v-if="post.kind === 'qa'" :disabled="busy" :class="{ on: post.same }" @click="action('same')">
                    <MeshIcon name="pin" />{{ post.sameCount || '同问' }}</button
                ><button aria-label="点赞" :disabled="busy" :class="{ on: post.liked }" @click="action('like')">
                    <MeshIcon name="heart" />{{ post.likeCount || '赞' }}</button
                ><button @click="post.kind==='qa'&&!detail?commentsOpen=!commentsOpen:emit('open', post.id)">
                    <MeshIcon name="chat" />{{ post.commentCount || '评论' }}</button
                ><button :disabled="busy" :class="{ on: post.favorited }" @click="action('favorite')">
                    <MeshIcon name="bookmark" />收藏</button
                ><button @click="share"><MeshIcon name="share" />转发</button
                ><button v-if="detail && post.kind === 'qa'" :class="{ on: post.watching }" @click="action('watch')">
                    {{ post.watching ? '已蹲帖' : '蹲帖' }}
                </button>
            </div>
            <ContentComments v-if="commentsOpen" :id="post.id" inline @changed="emit('changed')"/>
        </div>
    </article>
</template>
