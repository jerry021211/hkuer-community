<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { contentApi, dateText, type MeshPost } from '../api'
import { requireSession, meshUser } from '../session'
import MeshIcon from './MeshIcon.vue'
import ContentComments from './ContentComments.vue'
import ContentManagement from './ContentManagement.vue'
const props=defineProps<{id:string;modal?:boolean}>()
const emit=defineEmits<{close:[];changed:[]}>()
const router=useRouter(), post=ref<MeshPost>(), error=ref(''), busy=ref(false), imageIndex=ref(0)
let sequence=0
const job=computed(()=>post.value?.kind==='job')
const category=computed(()=>({'求职经验':'经验分享','内推':'内推机会','招聘':'岗位信息','简历':'简历互评','行业资讯':'行业洞察'}[post.value?.category || ''] || post.value?.category))
const body=computed(()=>{const d=new DOMParser().parseFromString(post.value?.content||'','text/html');d.querySelectorAll('img').forEach(n=>n.remove());return d.body.innerHTML})
async function load(){
    const current=++sequence;error.value=''
    try{const result=await contentApi.detail(props.id);if(current===sequence)post.value=result}
    catch(e){if(current===sequence)error.value=(e as Error).message}
}
watch(()=>[props.id,meshUser.value?.userId],()=>{post.value=undefined;imageIndex.value=0;load()},{immediate:true})
async function action(kind:'like'|'favorite'){
    if(!post.value||busy.value||!requireSession())return
    busy.value=true
    try{await (kind==='like'?contentApi.like(post.value.id,!post.value.liked):contentApi.favorite(post.value.id,!post.value.favorited));await load();emit('changed')}
    catch(e){message.error((e as Error).message)}finally{busy.value=false}
}
function close(){if(props.modal)emit('close');else router.push(job.value?'/jobs':'/life')}
function removed(){emit('changed');close()}
function slide(direction:number){const count=post.value?.images.length||0;if(count)imageIndex.value=(imageIndex.value+direction+count)%count}
</script>
<template>
    <div class="discovery-detail" :class="{'discovery-detail-modal':modal,'discovery-detail-page':!modal,'job-detail':job,'has-images':!!post?.images.length}">
        <div v-if="error" class="empty"><p class="error" role="alert">{{error}}</p><button @click="load">重试</button><button @click="close">返回</button></div><a-skeleton v-else-if="!post" active/>
        <template v-else>
            <button v-if="!modal" class="discovery-back" aria-label="返回列表" @click="close"><MeshIcon name="arrow"/></button>
            <div class="discovery-detail-visual" :class="{'job-placeholder':job&&!post.images.length}">
                <template v-if="post.images.length"><img :src="post.images[imageIndex]" :alt="post.title"/><template v-if="post.images.length>1"><button class="gallery-prev" aria-label="上一张图片" @click="slide(-1)">‹</button><button class="gallery-next" aria-label="下一张图片" @click="slide(1)">›</button><span class="gallery-counter">{{imageIndex+1}} / {{post.images.length}}</span></template></template>
                <template v-else><small>{{category}}</small><strong>{{post.company||post.title}}</strong><span v-if="post.role">{{post.role}}</span></template>
            </div>
            <div class="discovery-detail-copy">
                <header v-if="modal" class="discovery-author-bar"><RouterLink v-if="post.authorId" :to="'/u/'+post.authorId" @click="emit('close')"><span class="avatar"><img v-if="post.authorAvatar" :src="post.authorAvatar" alt=""/><span v-else>{{post.authorName?.slice(0,1)}}</span></span>{{post.authorName}}</RouterLink><span v-else class="anonymous-author"><span class="avatar">?</span>{{post.authorName}}</span><small v-if="job" class="discovery-category">{{category}}</small><button aria-label="关闭详情" @click="close"><MeshIcon name="close"/></button></header>
                <div class="discovery-detail-scroll">
                    <div class="discovery-detail-text"><div class="discovery-detail-title"><h1>{{post.title}}</h1><span v-if="post.rating" class="detail-stars" :aria-label="post.rating+'星'"><span v-for="n in 5" :key="n" :class="{filled:n<=post.rating}">★</span></span></div>
                        <div v-if="job&&(post.company||post.role)" class="company-strip">▣ {{post.company}}<span v-if="post.role"> · {{post.role}}</span></div>
                        <div class="discovery-detail-tags"><RouterLink v-for="tag in post.tags" :key="tag" :to="'/tag/'+encodeURIComponent(tag)" @click="emit('close')"># {{tag}}</RouterLink></div>
                        <div class="discovery-detail-body rich-content" v-html="body"/><p class="discovery-meta">{{dateText(post.createdAt)}} · {{post.viewCount||0}} 次浏览<span v-if="post.region"> · {{post.region}}</span></p>
                    </div>
                    <div class="discovery-interactions"><RouterLink v-if="!modal&&post.authorId" class="discovery-inline-author" :to="'/u/'+post.authorId"><span class="avatar">{{post.authorName?.slice(0,1)}}</span>{{post.authorName}}</RouterLink><button :disabled="busy" :class="{on:post.liked}" aria-label="点赞" @click="action('like')"><MeshIcon name="heart"/>{{post.likeCount||0}}</button><a href="#discovery-comments" aria-label="查看评论"><MeshIcon name="chat"/>{{post.commentCount||0}}</a><button class="discovery-save" :disabled="busy" :class="{on:post.favorited}" aria-label="收藏" @click="action('favorite')"><MeshIcon name="bookmark"/></button></div>
                    <ContentManagement v-if="post.own" :id="post.id" @changed="removed"/>
                    <div id="discovery-comments"><ContentComments :id="post.id" compact @changed="load();emit('changed')"/></div>
                </div>
            </div>
        </template>
    </div>
</template>
