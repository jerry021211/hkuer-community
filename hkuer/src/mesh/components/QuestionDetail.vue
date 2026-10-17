<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { contentApi, dateText, type MeshPost, type MeshAnswer } from '../api'
import { requireSession, meshUser } from '../session'
import MeshIcon from './MeshIcon.vue'
import ContentManagement from './ContentManagement.vue'
import ReportAction from './ReportAction.vue'
import ContentComments from './ContentComments.vue'
import MeshDialog from './MeshDialog.vue'
import DiscoveryDetail from './DiscoveryDetail.vue'
const editing=ref<MeshAnswer>(), editDraft=ref(''), editAnonymous=ref(false), editBusy=ref(false), editError=ref('')
function edit(answer:MeshAnswer){editing.value=answer;editDraft.value=answer.content;editAnonymous.value=!!answer.anonymous;editError.value=''}
async function saveAnswer(){
    if(!editing.value||editBusy.value)return
    editBusy.value=true;editError.value=''
    try{await contentApi.updateAnswer(editing.value.id,editDraft.value,editAnonymous.value);editing.value=undefined;await load();message.success('回答已更新')}
    catch(e){editError.value=(e as Error).message}finally{editBusy.value=false}
}
const props = defineProps<{ id: string; modal?: boolean }>()
const post = ref<MeshPost>(),
    answers = ref<MeshAnswer[]>([]),
    draft = ref(''),
    anonymous = ref(false),
    busy = ref(false),
    error = ref('')
let sequence=0
async function load() {
    const stamp=++sequence
    try {
        error.value = ''
        const [p, a] = await Promise.all([contentApi.detail(props.id), contentApi.answers(props.id)])
        if(stamp===sequence){post.value = p; answers.value = a}
    } catch (e) {
        if(stamp===sequence)error.value = (e as Error).message
    }
}
watch(() => [props.id, meshUser.value?.userId], () => {post.value=undefined;answers.value=[];draft.value='';editing.value=undefined;load()}, { immediate: true })
const actionBusy=ref(false)
async function questionAction(kind:'like'|'same'|'favorite'|'dislike'|'watch'){
    if(!post.value||actionBusy.value||!requireSession())return
    actionBusy.value=true
    try{
        const p=post.value
        if(kind==='like')await contentApi.like(p.id,!p.liked)
        else if(kind==='favorite')await contentApi.favorite(p.id,!p.favorited)
        else await contentApi.interaction(p.id,kind,!(kind==='same'?p.same:kind==='watch'?p.watching:p.disliked))
        await load()
    }catch(e){message.error((e as Error).message)}finally{actionBusy.value=false}
}
async function submit() {
    if (!requireSession() || busy.value) return
    busy.value = true
    try {
        await contentApi.answer(props.id, draft.value, anonymous.value)
        draft.value = ''
        await load()
        message.success('回答已发布')
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        busy.value = false
    }
}
async function act(answer: MeshAnswer, kind: string) {
    if (!requireSession()) return
    try {
        await contentApi.answerAction(answer.id, kind, kind === 'like' ? !answer.liked : !answer.accepted)
        await load()
    } catch (e) {
        message.error((e as Error).message)
    }
}
</script>
<template>
    <div class="question-detail mesh-app" :class="{'question-detail-modal':modal}">
        <p v-if="error" class="error" role="alert">{{ error }} <button @click="load">重试</button></p>
        <a-skeleton v-else-if="!post" active />
        <DiscoveryDetail v-else-if="post.kind==='job'||post.kind==='life'" :id="post.id"/>
        <template v-else>
            <div class="question-heading">
                <div class="question-tags"><RouterLink v-for="tag in post.tags" :key="tag" :to="'/tag/'+encodeURIComponent(tag)">{{tag}}</RouterLink></div>
                <h1>{{post.title}}</h1>
                <div v-if="post.content&&!post.locked" class="rich-content question-body" v-html="post.content"/>
                <p v-if="!modal" class="question-date muted">{{dateText(post.createdAt)}} · {{post.viewCount||0}} 次浏览</p>
                <div class="question-byline"><RouterLink v-if="post.authorId" :to="'/u/'+post.authorId"><span class="avatar"><img v-if="post.authorAvatar" :src="post.authorAvatar" alt=""/><span v-else>{{post.authorName?.slice(0,1)}}</span></span>{{post.authorName}}</RouterLink><span v-else>{{post.authorName}}</span><small v-if="modal" class="muted">· {{dateText(post.createdAt)}}</small><small v-if="modal" class="question-answer-count muted">{{answers.length}} 条回答</small></div>
                <div class="question-actions"><button :disabled="actionBusy" :class="{on:post.liked}" aria-label="点赞问题" @click="questionAction('like')"><MeshIcon name="heart"/>{{post.likeCount||0}}</button><button :disabled="actionBusy" :class="{on:post.same}" aria-label="同问" @click="questionAction('same')"><MeshIcon name="pin"/><span v-if="modal">同问</span>{{post.sameCount||0}}</button><button :disabled="actionBusy" :class="{on:post.disliked}" aria-label="不赞同" @click="questionAction('dislike')"><MeshIcon name="dislike"/></button><button :disabled="actionBusy" :class="{on:post.favorited}" aria-label="收藏问题" @click="questionAction('favorite')"><MeshIcon name="bookmark"/></button></div>
                <button class="question-watch" :class="{on:post.watching}" :disabled="actionBusy" @click="questionAction('watch')">{{post.watching?'已蹲帖':'蹲帖'}}</button><ContentManagement v-if="post.own" :id="post.id" @changed="load"/>
            </div>
            <ContentComments v-if="post.kind !== 'qa'" :id="post.id" />
            <form v-if="post.kind === 'qa'" class="answer-form question-answer-form" @submit.prevent="submit">
                <h3 v-if="modal"><MeshIcon name="edit"/>写下你的回答</h3>
                <textarea id="answer-draft" v-model="draft" maxlength="10000" rows="4" :placeholder="modal?'分享你的见解…':'请输入你的回答…'" aria-label="回答内容" @focus="requireSession"/>
                <div class="row-between"><label class="check" v-if="draft"><input v-model="anonymous" type="checkbox"/>匿名回答</label><button class="primary" :disabled="busy||!draft.trim()">{{busy?'发布中…':'提交回答'}}</button></div>
            </form>
            <section v-if="post.kind === 'qa'" class="answers">
                <h3>回答 <small>({{ answers.length }})</small></h3>
                <p v-if="!answers.length" class="muted question-no-answers">
                    <MeshIcon v-if="modal" name="chat"/>{{ post.locked ? '登录后参与讨论' : '暂无回答，快来抢沙发吧！' }}
                </p>
                <article v-for="answer in answers" :key="answer.id" class="answer">
                    <div class="post-byline">
                        <span class="avatar small">{{ answer.authorName?.slice(0, 1) }}</span
                        ><strong>{{ answer.authorName }}</strong
                        ><span class="muted">{{ dateText(answer.createdAt) }}</span
                        ><span v-if="answer.accepted" class="accepted">已采纳</span>
                    </div>
                    <div class="rich-content" v-html="answer.content"></div>
                    <div class="post-actions">
                        <button :class="{ on: answer.liked }" @click="act(answer, 'like')">
                            ♡ {{ answer.likeCount || '赞' }}</button
                        ><button v-if="post.own" @click="act(answer, 'accept')">
                            {{ answer.accepted ? '取消采纳' : '采纳回答' }}</button
                        ><button v-if="answer.own" @click="edit(answer)">编辑</button><a-popconfirm v-if="answer.own" title="删除这条回答？" @confirm="act(answer, 'delete')"
                            ><button>删除</button></a-popconfirm
                        ><ReportAction v-else :id="answer.id" type="ANSWER" />
                    </div>
                </article>
            </section>
        </template>
        <MeshDialog :open="!!editing" title="编辑回答" @update:open="!$event && (editing=undefined)"><form class="group-dialog-body modal-form" @submit.prevent="saveAnswer"><label>回答内容<textarea v-model="editDraft" maxlength="10000" rows="6" required/></label><label class="check"><input v-model="editAnonymous" type="checkbox"/>匿名回答</label><p v-if="editError" class="error" role="alert">{{editError}}</p><button class="primary" :disabled="editBusy||!editDraft.trim()">{{editBusy?'保存中…':'保存修改'}}</button></form></MeshDialog>
    </div>
</template>
