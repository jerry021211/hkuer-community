<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentApi, plainText, type HomeInfo } from '../api'
import { api } from '@/utils/request'
import { requireSession } from '../session'
import MeshIcon from '../components/MeshIcon.vue'
const route=useRoute(),router=useRouter(),info=ref<HomeInfo>(),error=ref(''),loading=ref(true),busy=ref(false)
const feedback=ref({count:0,helpful:false}),guide= computed(()=>route.path==='/app-guide')
const announcement=computed(()=>info.value?.announcements.find(a=>a.id===String(route.params.id)))
const features=[
    ['💬','问答广场','从课程备考到校园日常，在这里提出问题、分享经验。支持匿名提问、标签搜索和关注问题，有新回答时可以收到通知。'],
    ['📚','课程库','查看课程信息与同学评价，了解难度、工作量、教学和考试安排；分享学习资料，参与课程小组，与同学一起学习。'],
    ['💼','求职专区','集中查看经验分享、工作机会、内推、岗位信息、简历互评和行业动态，让实习和求职的信息更容易找到。'],
    ['🌿','生活社区','记录校园生活、周末活动和探店体验，按地区与标签发现感兴趣的内容，分享图片与评分。'],
    ['👤','个人主页','展示个人介绍、技能与社交链接，通过港大邮箱认证获得徽章。公开主页汇集提问、回答和课程评价。'],
    ['📱','移动优先','在手机浏览器中切换版块、浏览内容和参与讨论，也可以将网站添加到主屏幕，随时打开。']
]
const steps=[['打开网站','使用 Safari 浏览器打开本站。'],['点击分享按钮','点击 Safari 工具栏中间的分享图标。'],['添加到主屏幕','向下滑动菜单，选择「添加到主屏幕」。'],['确认添加','确认网站名称，点击右上角「添加」。']]
async function load(){loading.value=true;error.value='';try{if(guide.value)feedback.value=await api.get('/java/mesh/public/pages/app-guide/feedback');else if(route.path.startsWith('/announcements'))info.value=await contentApi.home()}catch(e){error.value=(e as Error).message}finally{loading.value=false}}
async function helpful(){if(!requireSession()||busy.value)return;busy.value=true;try{feedback.value=await api.post('/java/mesh/pages/app-guide/feedback',{enabled:!feedback.value.helpful})}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
function back(){if(route.params.id)router.push('/announcements');else router.push('/home')}
onMounted(load)
</script>
<template>
    <section class="info-page" :class="{'guide-page':guide,'about-page':route.path==='/about','announcement-page':route.path.startsWith('/announcements')}">
        <button class="back-link" @click="back"><MeshIcon name="arrow"/>返回</button>
        <p v-if="error" role="alert" class="error">{{error}} <button @click="load">重试</button></p>
        <template v-if="route.path.startsWith('/announcements')">
            <h1 v-if="!route.params.id">公告栏</h1><p v-if="loading" class="empty">加载中…</p>
            <template v-else-if="route.params.id"><article v-if="announcement" class="announcement-detail"><span class="announcement-category">{{announcement.category || '社区公告'}}</span><h1>{{announcement.title}}</h1><time>{{announcement.createdAt.slice(0,10)}}</time><div class="announcement-body">{{plainText(announcement.content)}}</div><RouterLink to="/about" class="text-button">了解更多 →</RouterLink></article><p v-else class="empty">公告不存在或已下线</p><RouterLink to="/announcements" class="back-link">← 返回公告列表</RouterLink></template>
            <template v-else><RouterLink v-for="a in info?.announcements" :key="a.id" :to="'/announcements/'+a.id" class="announcement-card"><div class="row-between"><h2><span v-if="a.pinned" class="pinned-label">置顶</span>{{a.title}}</h2><MeshIcon name="arrow"/></div><p>{{plainText(a.content)}}</p><time>{{a.createdAt.slice(0,10)}}</time></RouterLink><p v-if="!info?.announcements.length && !error" class="empty">暂无公告</p></template>
        </template>
        <div v-else-if="guide" class="guide-inner"><h1>📱 移动版体验升级指南</h1><p class="muted">跟着黄色箭头操作，30 秒完成</p><article v-for="(step,i) in steps" :key="i" class="guide-step"><h2><span>{{i+1}}</span>{{step[0]}}</h2><p>{{step[1]}}</p><img :src="'/guide/step'+(i+1)+'.png'" :alt="step[0]" loading="lazy"/></article><p class="guide-success">✅ 设置完成！从桌面点击网站图标即可打开</p><section class="guide-faq"><h3>遇到问题？</h3><details open><summary>主屏幕打开后无法输入？</summary><p>先关闭页面并重新打开。如系统键盘仍未响应，可以尝试重新启动手机。</p></details><details open><summary>想回到普通浏览器模式？</summary><p>直接在 Safari 打开本站即可，使用同一个账号登录。</p></details></section><div class="row-between guide-actions"><RouterLink to="/home">返回首页</RouterLink><button :class="{active:feedback.helpful}" :disabled="busy" @click="helpful"><MeshIcon name="heart"/>{{feedback.helpful?'已标记有用':'有用'}} {{feedback.count}}</button></div></div>
        <template v-else><header class="about-hero"><h1>HKUmesh 正式上线 🎓</h1><p>连接港大同学的校园社区，浏览器打开即用。</p><i/></header><div class="about-intro"><p>选课、学习、求职与生活，校园里每天都有值得交流的问题。</p><p>课程评价不易查找，实习经验分散在群聊，想组队或寻找生活建议时也常常无从下手。我们希望把同学们分享的知识和经验集中起来，让有用的信息被更多人找到。</p><strong>让每一次分享，都能帮助到需要它的人。</strong></div><section v-for="feature in features" :key="feature[1]" class="about-feature"><h2><span>{{feature[0]}}</span>{{feature[1]}}</h2><p>{{feature[2]}}</p></section><section class="about-feature"><h2>为什么不用微信群？</h2><p>群聊适合即时交流，社区则让内容长期保留。通过搜索、标签和收藏，过去的回答与经验也能持续帮助后来的人。</p></section><section class="about-team"><h2>HKUer 社区</h2><p class="muted">港大学习、求职与生活交流平台</p><p>欢迎提出建议，也欢迎用你的经验帮助其他同学。</p></section><RouterLink to="/home" class="primary about-start">开始使用 HKUmesh →</RouterLink></template>
    </section>
</template>
