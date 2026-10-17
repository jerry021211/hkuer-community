<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { api } from '@/utils/request'
import { contentApi, plainText, dateText, type MeshPost } from '../api'
import { social } from '../social-api'
import { requireSession, meshUser } from '../session'
import MeshIcon from '../components/MeshIcon.vue'
import ContentManagement from '../components/ContentManagement.vue'
const route=useRoute(),router=useRouter(),post=ref<MeshPost>(),matches=ref<MeshPost[]>([]),error=ref(''),matchError=ref(''),busy=ref(false),imageIndex=ref(0)
const listing=computed(()=>post.value?.rentalType==='listing')
let sequence=0
async function load(){const stamp=++sequence;error.value='';try{const result=await contentApi.detail(String(route.params.id));if(result.kind!=='rental')throw Error('房源或室友需求不存在');if(stamp===sequence){post.value=result;loadMatches()}}catch(e){if(stamp===sequence)error.value=(e as Error).message}}
async function loadMatches(){const id=post.value?.id;if(!id)return;matchError.value='';try{const result=await api.get<MeshPost[]>(`/java/mesh/public/rental/${id}/matches`);if(id===post.value?.id)matches.value=result}catch(e){if(id===post.value?.id)matchError.value=(e as Error).message}}
watch(()=>[route.params.id,meshUser.value?.userId],()=>{post.value=undefined;matches.value=[];imageIndex.value=0;load()},{immediate:true})
function slide(direction:number){const count=post.value?.images.length||0;if(count)imageIndex.value=(imageIndex.value+direction+count)%count}
function rentalLink(p:MeshPost){return (p.rentalType==='listing'?'/rental/':'/roommates/')+p.id}
async function contact(){if(!post.value?.authorId||busy.value||!requireSession())return;busy.value=true;try{router.push('/chat/'+await social.start(post.value.authorId,post.value.id))}catch(e){message.error((e as Error).message)}finally{busy.value=false}}
async function status(value:string){if(!post.value||busy.value)return;busy.value=true;try{await api.post(`/java/mesh/content/${post.value.id}/status`,{status:value});await load()}catch(e){message.error((e as Error).message)}finally{busy.value=false}}
</script>
<template>
    <article class="rental-detail-page" :class="{roommate:!listing}">
        <div v-if="error" class="empty"><p class="error" role="alert">{{error}}</p><button @click="load">重试</button><RouterLink to="/rental">返回列表</RouterLink></div><a-skeleton v-else-if="!post" active/>
        <template v-else>
            <div v-if="listing" class="rental-detail-gallery"><img v-if="post.images.length" :src="post.images[imageIndex]" :alt="post.title"/><MeshIcon v-else name="home"/><RouterLink to="/rental" class="rental-back" aria-label="返回租房列表"><MeshIcon name="arrow"/></RouterLink><template v-if="post.images.length>1"><button class="gallery-prev" aria-label="上一张图片" @click="slide(-1)">‹</button><button class="gallery-next" aria-label="下一张图片" @click="slide(1)">›</button><div class="rental-gallery-dots"><button v-for="(_,i) in post.images" :key="i" :class="{active:i===imageIndex}" :aria-label="'查看第 '+(i+1)+' 张图片'" @click="imageIndex=i"/></div></template></div>
            <header v-else class="roommate-hero"><RouterLink to="/rental" class="rental-back" aria-label="返回租房列表"><MeshIcon name="arrow"/></RouterLink><h1>{{post.title}}</h1><div class="rental-attributes"><span v-if="post.region">{{post.region}}</span><span v-if="post.gender">{{post.gender}}</span><span v-if="post.budgetMax">预算 HKD {{post.budgetMin||0}}–{{post.budgetMax}}</span></div></header>
            <div class="rental-content-card">
                <template v-if="listing"><div class="rental-price">{{post.negotiable||post.rent==null?'价格面议':'HKD '+post.rent}}<small>/ 月</small></div><h1>{{post.title}}</h1><div class="rental-attributes"><span v-if="post.region">⌖ {{post.region}}</span><span v-for="room in post.roomTypes" :key="room">{{room}}</span><span v-if="post.leaseTerm">{{post.leaseTerm}}</span><span v-if="post.moveIn">入住 {{post.moveIn}}</span></div></template>
                <p v-if="listing" class="rental-detail-meta">{{dateText(post.createdAt)}}　 <MeshIcon name="eye"/>{{post.viewCount||0}} 浏览　<MeshIcon name="heart"/>{{post.likeCount||0}} 喜欢</p>
                <h3>{{listing?'详细介绍':'个人简介'}}</h3><div class="rental-description">{{plainText(post.content)}}</div><div v-if="post.habits?.length" class="rental-attributes"><span v-for="habit in post.habits" :key="habit">{{habit}}</span></div>
                <p v-if="!listing" class="rental-detail-meta">{{dateText(post.createdAt)}}　 <MeshIcon name="eye"/>{{post.viewCount||0}} 浏览</p>
                <div class="rental-publisher"><RouterLink v-if="post.authorId" :to="'/u/'+post.authorId"><span class="avatar"><img v-if="post.authorAvatar" :src="post.authorAvatar" alt=""/><span v-else>{{post.authorName?.slice(0,1)}}</span></span>{{post.authorName}}</RouterLink><span v-else>{{post.authorName}}</span></div>
                <button v-if="!post.own" class="primary rental-contact" :disabled="busy||!post.authorId" @click="contact"><MeshIcon name="chat"/>{{listing?'私聊房东':'私聊'}}</button>
                <div v-if="post.own" class="rental-owner"><label>信息状态 <select :value="post.listingStatus" :disabled="busy" @change="status(($event.target as HTMLSelectElement).value)"><option value="active">进行中</option><option value="closed">已结束</option></select></label><ContentManagement :id="post.id" @changed="router.push('/rental')"/></div>
            </div>
            <aside class="rental-safety"><span>{{listing?'🛡️':'🤝'}}</span><div><strong>{{listing?'租房安全提示':'找室友提示'}}</strong><p>{{listing?'社区仅提供信息展示，请通过站内私聊沟通，实地看房后签约，谨防诈骗。':'先在站内沟通了解对方生活习惯，确定合适后再交换联系方式线下见面。注意保护个人隐私。'}}</p></div></aside>
            <section class="rental-recommendations"><h2><MeshIcon :name="listing?'users':'home'"/>{{listing?'匹配的室友':'匹配的房源'}}</h2><p v-if="matchError" class="error" role="alert">{{matchError}} <button @click="loadMatches">重试</button></p><div v-else-if="!matches.length" class="empty"><MeshIcon :name="listing?'users':'home'"/><p>暂无匹配的{{listing?'室友':'房源'}}</p></div><RouterLink v-for="item in matches" :key="item.id" :to="rentalLink(item)" class="rental-match-card"><div class="row-between"><h3>{{item.title}}</h3><small v-if="item.matchScore!=null">匹配 {{item.matchScore}}%</small></div><p v-if="item.region">{{item.region}}</p><p>{{plainText(item.content).slice(0,120)}}</p></RouterLink></section>
        </template>
    </article>
</template>
