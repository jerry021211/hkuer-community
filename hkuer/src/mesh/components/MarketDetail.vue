<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { api } from '@/utils/request'
import { contentApi, dateText, plainText, type MeshPost } from '../api'
import { social } from '../social-api'
import { requireSession, meshUser } from '../session'
import MeshIcon from './MeshIcon.vue'
import ContentManagement from './ContentManagement.vue'
import ImageViewer from './ImageViewer.vue'
const props=defineProps<{id:string;standalone?:boolean}>(),emit=defineEmits<{close:[];changed:[]}>()
const router=useRouter(),post=ref<MeshPost>(),busy=ref(false),error=ref(''),imageIndex=ref(0),zoom=ref(false)
let sequence=0
async function load(){const stamp=++sequence;error.value='';try{const result=await contentApi.detail(props.id);if(result.kind!=='market')throw Error('商品不存在');if(stamp===sequence)post.value=result}catch(e){if(stamp===sequence)error.value=(e as Error).message}}
watch(()=>[props.id,meshUser.value?.userId],()=>{post.value=undefined;imageIndex.value=0;zoom.value=false;load()},{immediate:true})
async function favorite(){if(!post.value||busy.value||!requireSession())return;busy.value=true;try{await contentApi.favorite(post.value.id,!post.value.favorited);await load();emit('changed')}catch(e){message.error((e as Error).message)}finally{busy.value=false}}
async function contact(){if(!post.value?.authorId||busy.value||!requireSession())return;busy.value=true;try{router.push('/chat/'+await social.start(post.value.authorId,post.value.id))}catch(e){message.error((e as Error).message)}finally{busy.value=false}}
async function status(value:string){if(!post.value||busy.value)return;busy.value=true;try{await api.post(`/java/mesh/content/${post.value.id}/status`,{status:value});await load();emit('changed')}catch(e){message.error((e as Error).message)}finally{busy.value=false}}
function close(){if(props.standalone)router.push('/marketplace');else emit('close')}
function removed(){emit('changed');close()}
function slide(step:number){const count=post.value?.images.length||0;if(count)imageIndex.value=(imageIndex.value+step+count)%count}
</script>
<template><article class="market-detail" :class="{'market-detail-standalone':standalone}">
    <header v-if="!standalone" class="market-detail-header"><button aria-label="关闭详情" @click="close"><MeshIcon name="close"/></button><h2>商品详情</h2></header>
    <div v-if="error" class="empty"><p class="error" role="alert">{{error}}</p><button @click="load">重试</button><button @click="close">返回列表</button></div><a-skeleton v-else-if="!post" active/>
    <template v-else><div class="market-detail-gallery"><button v-if="standalone" class="rental-back" aria-label="返回二手列表" @click="close"><MeshIcon name="arrow"/></button><button v-if="standalone" class="market-gallery-save" aria-label="收藏商品" :class="{on:post.favorited}" :disabled="busy" @click="favorite"><MeshIcon name="bookmark"/></button><img v-if="post.images.length" :src="post.images[imageIndex]" :alt="post.title"/><button v-if="post.images.length" class="gallery-zoom" aria-label="放大图片" @click="zoom=true"><MeshIcon name="search"/></button><template v-if="post.images.length>1"><button class="gallery-prev" aria-label="上一张图片" @click="slide(-1)">‹</button><button class="gallery-next" aria-label="下一张图片" @click="slide(1)">›</button><span class="gallery-counter">{{imageIndex+1}} / {{post.images.length}}</span></template></div>
    <div class="market-detail-copy"><div class="market-price">{{post.price==null?'价格面议':'HKD '+post.price}}<small v-if="post.negotiable&&post.price!=null">{{standalone?'可议价':'可小刀'}}</small><span v-if="post.saleStatus!=='selling'" class="market-status">{{post.saleStatus==='sold'?'已售出':'已预定'}}</span></div><h1>{{post.title}}</h1><div v-if="post.brand||post.tradeLocation||post.conditionLabel" class="market-attributes"><span v-if="post.brand">◆ {{post.brand}}</span><span v-if="post.tradeLocation">⌖ {{post.tradeLocation}}</span><span v-if="post.conditionLabel">{{post.conditionLabel}}</span></div><div class="market-detail-tags"><RouterLink v-for="tag in post.tags" :key="tag" :to="{path:'/marketplace',query:{tags:tag}}">{{tag}}</RouterLink></div><div v-if="plainText(post.content).trim()" class="commerce-description">{{plainText(post.content)}}</div><p v-if="standalone" class="market-detail-meta">{{dateText(post.createdAt)}}　<MeshIcon name="eye"/> {{post.viewCount||0}} 浏览</p>
    <div class="market-seller"><RouterLink v-if="post.authorId" :to="'/u/'+post.authorId"><span class="avatar"><img v-if="post.authorAvatar" :src="post.authorAvatar" alt=""/><span v-else>{{post.authorName?.slice(0,1)}}</span></span>{{post.authorName}}</RouterLink><span v-else>匿名卖家</span><small v-if="!standalone">{{dateText(post.createdAt)}}</small></div>
    <div class="market-detail-actions"><button v-if="!post.own" class="market-contact" :disabled="busy||!post.authorId" @click="contact"><MeshIcon name="chat"/>联系卖家</button><label v-else>商品状态 <select :value="post.saleStatus" :disabled="busy" aria-label="商品状态" @change="status(($event.target as HTMLSelectElement).value)"><option value="selling">在售</option><option value="reserved">已预定</option><option value="sold">已售出</option></select></label><button class="market-favorite" :class="{on:post.favorited}" :disabled="busy" @click="favorite"><MeshIcon name="bookmark"/>{{post.favorited?'取消收藏':'收藏'}}</button></div><ContentManagement v-if="post.own" :id="post.id" @changed="removed"/>
    <p v-if="!standalone" class="market-safety-inline">🛡️ 当面验货后付款，谨防诈骗</p></div><aside v-if="standalone" class="market-safety"><span>🛡️</span><div><strong>安全交易提示</strong><p>社区仅提供信息展示，交易在线下完成。<br/>请当面验货后付款，谨防诈骗。如遇问题商品请举报。</p></div></aside><ImageViewer v-model:open="zoom" :images="post.images" :initial="imageIndex" :title="post.title"/></template>
</article></template>
