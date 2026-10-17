<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { contentApi, type MeshPost, type HomeInfo } from '../api'
import { meshUser, requireSession } from '../session'
import MeshIcon from '../components/MeshIcon.vue'
import PostCard from '../components/PostCard.vue'
import QuestionDetail from '../components/QuestionDetail.vue'
import MeshDialog from '../components/MeshDialog.vue'
import DiscoveryDetail from '../components/DiscoveryDetail.vue'
const route = useRoute(),
    router = useRouter()
const kind = computed(() => String(route.meta.kind || 'qa'))
const search = ref(String(route.query.q || '')),
    tag = ref(String(route.params.tag || '')),
    category = ref(''),
    region = ref(''),
    page = ref(1),
    total = ref(0),
    loading = ref(true),
    error = ref(''),
    posts = ref<MeshPost[]>([]),
    home = ref<HomeInfo>(),
    selected = ref(''),
    draft = ref(''),
    publishing = ref(false)
const tags = [
    '内推',
    'CDS',
    '校招',
    '这课咋样',
    '选课',
    '秋招',
    '实习',
    'AI',
    '美食',
    '应届生',
    '毕业',
    '深圳',
    '实习毕业',
    '港大'
]
const categories = [
    ['', '全部'],
    ['求职经验', '经验分享'],
    ['找工作', '找工作'],
    ['内推', '内推机会'],
    ['招聘', '岗位信息'],
    ['简历', '简历互评'],
    ['行业资讯', '行业洞察']
]
const lifeTags = [
    '新生',
    '校园',
    '美食',
    '探店',
    '王者',
    '搭子',
    '周末',
    '锐评',
    '从夯到拉',
    '港大牙医',
    '港大医学院',
    '港大计算机'
]
const title = computed(() =>
    route.params.tag
        ? '# ' + route.params.tag
        : route.path === '/search'
          ? '搜索结果'
          : kind.value === 'job'
            ? '求职广场'
            : kind.value === 'life'
              ? '生活广场'
              : '问答广场'
)
let sequence = 0
function requestPage(current:number){return contentApi.list({kind:kind.value,keyword:search.value,tag:tag.value,category:category.value,region:region.value,current,size:20})}
async function fetchPage(nextPage: number) {
    const stamp = ++sequence
    loading.value = true
    error.value = ''
    try {
        const result = await requestPage(nextPage)
        if (stamp === sequence) {
            posts.value =
                nextPage > 1
                    ? [...new Map([...posts.value, ...result.records].map((p) => [p.id, p])).values()]
                    : result.records
            total.value = result.total
            page.value = nextPage
        }
    } catch (e) {
        if (stamp === sequence) error.value = (e as Error).message
    } finally {
        if (stamp === sequence) loading.value = false
    }
}
function load() { return fetchPage(1) }
async function refresh(){
    const stamp=++sequence, count=page.value
    error.value='';loading.value=true
    try{const results=await Promise.all(Array.from({length:count},(_,i)=>requestPage(i+1)));if(stamp===sequence){posts.value=[...new Map(results.flatMap(r=>r.records).map(p=>[p.id,p])).values()];total.value=results[0]?.total||0;page.value=Math.min(count,Math.max(1,Math.ceil(total.value/20)))}}
    catch(e){if(stamp===sequence)error.value=(e as Error).message}finally{if(stamp===sequence)loading.value=false}
}
function loadMore() { if (!loading.value) return fetchPage(page.value + 1) }
watch(() => [kind.value, tag.value, category.value, region.value, meshUser.value?.userId], () => { posts.value=[]; page.value=1; load() }, {
    immediate: true
})
onMounted(async () => {
    try {
        home.value = await contentApi.home()
    } catch {
        /* Feed has its own retry state. */
    }
})
function open(id: string) {
    if(kind.value!=='qa'&&window.matchMedia('(max-width:639px)').matches){router.push('/'+(kind.value==='job'?'jobs':'life')+'/'+id);return}
    selected.value = id
}
async function closeDetail() {
    selected.value = ''
    await refresh()
    try{home.value = await contentApi.home()}catch{/* Optional announcement summary. */}
}
function create() {
    if (requireSession()) router.push('/create/' + kind.value)
}
function doSearch() {
    router.push({ path: '/search', query: { q: search.value } })
}
async function quickPublish() {
    if (!requireSession() || publishing.value) return
    publishing.value = true
    try {
        await contentApi.create({
            kind: 'qa',
            title: draft.value,
            content: '',
            tags: [tag.value || '港大'],
            images: []
        })
        draft.value = ''
        await load()
        home.value = await contentApi.home()
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        publishing.value = false
    }
}
</script>
<template>
    <section
        class="feed-page"
        :class="{ 'discovery-page': kind === 'job' || kind === 'life', 'life-page': kind === 'life' }"
    >
        <template v-if="kind === 'qa' && !route.params.tag && route.path !== '/search'"
            ><RouterLink v-if="home?.announcements[0]" class="announcement-bar" to="/announcements"
                ><span>📣 <small>置顶</small> {{ home.announcements[0].title }}</span
                ><span>全部 ›</span></RouterLink
            >
            <div class="heat-bar">
                🔥 港大圈子正在热议 · {{ home?.questionCount ?? 0 }} 个问题 · {{ home?.answerCount ?? 0 }} 个回答
            </div></template
        >
        <div v-if="kind === 'job' || kind === 'life'" class="discovery-heading row-between">
            <div>
                <h1>{{ kind === 'job' ? '求职专区' : '生活社区' }}</h1>
                <p class="muted">
                    {{ kind === 'job' ? '分享经验 · 内推互助 · 岗位信息' : '分享校园周边的吃喝玩乐攻略' }}
                </p>
            </div>
            <button class="primary" @click="create">＋ 发帖</button>
        </div>
        <form class="search-box" @submit.prevent="kind === 'qa' ? doSearch() : load()">
            <MeshIcon name="search" /><input
                v-model="search"
                aria-label="搜全站"
                :placeholder="
                    kind === 'job' ? '搜索帖子、公司、职位、标签…' : kind === 'life' ? '搜索帖子、标签…' : '搜全站…'
                "
            /><button v-if="route.path === '/search'" @click.prevent="load">搜索</button>
        </form>
        <div v-if="kind === 'qa'" class="section-title">
            <div>
                <h1>{{ title }}</h1>
                <p>社区最新提问，开放讨论</p>
            </div>
            <button class="primary" @click="create"><MeshIcon name="plus" />提问</button>
        </div>
        <div v-if="kind === 'job'" class="pill-row">
            <button
                v-for="c in categories"
                :key="c[0]"
                :class="{ active: category === c[0] }"
                @click="($event: any) => {
                    category = c[0]!
                    page = 1
                }"
            >
                {{ c[1] }}
            </button>
        </div>
        <div v-if="kind === 'life'" class="pill-row">
            <button
                v-for="r in ['', '港岛', '九龙', '新界', '深圳', '薄扶林', '中环', '铜锣湾', '旺角', '尖沙咀', '红磡', '观塘', '沙田', '大埔', '将军澳', '荃湾', '屯门', '元朗']"
                :key="r"
                :class="{ active: region === r }"
                @click="($event: any) => {
                    region = r
                    page = 1
                }"
            >
                {{ r || '全部地区' }}
            </button>
        </div>
        <div v-if="kind !== 'job'" class="pill-row tags">
            <button
                v-for="t in kind === 'life' ? lifeTags : tags"
                :key="t"
                :class="{ active: tag === t }"
                @click="($event: any) => {
                    tag = tag === t ? '' : t
                    page = 1
                }"
            >
                {{ kind === 'life' ? '# ' : '' }}{{ t }}
            </button>
        </div>
        <form
            v-if="kind === 'qa' && route.path !== '/search' && !route.params.tag"
            class="quick-post panel"
            @submit.prevent="quickPublish"
        >
            <div class="quick-row">
                <span class="avatar">{{ meshUser?.nickname?.slice(0, 1) || '?' }}</span
                ><textarea
                    v-model="draft"
                    rows="2"
                    maxlength="200"
                    placeholder="分享你的想法、提问或求助…"
                    aria-label="快速提问"
                    @focus="requireSession"
                />
            </div>
            <div class="quick-bottom">
                <button type="button" class="muted" aria-label="上传图片提问" @click="create">
                    <MeshIcon name="image" /></button
                ><span v-if="draft" class="muted"># {{ tag || '港大' }}</span
                ><button class="primary" :disabled="!draft.trim() || publishing">
                    {{ publishing ? '发布中…' : '发布' }}
                </button>
            </div>
        </form>
        <p v-if="error" role="alert" class="error panel">{{ error }} <button @click="load">重试</button></p>
        <a-skeleton v-if="loading && !posts.length" class="panel" active />
        <div v-else-if="!posts.length" class="empty panel">
            <MeshIcon name="chat" />
            <h3>暂无{{ kind === 'qa' ? '问题' : '内容' }}</h3>
            <p>试试其他标签，或发布第一条内容</p>
            <button class="primary" @click="create">{{ kind === 'qa' ? '发布提问' : '发布内容' }}</button>
        </div>
        <div v-else-if="kind === 'job' || kind === 'life'" class="discovery-grid">
            <button v-for="post in posts" :key="post.id" class="discovery-card" @click="open(post.id)">
                <div class="discovery-cover">
                    <img v-if="post.images[0]" :src="post.images[0]" :alt="post.title" /><template v-else
                        ><small>{{ post.category }}</small
                        ><strong>{{ post.company || post.title }}</strong><span v-if="post.role" class="cover-role">{{post.role}}</span></template
                    ><span v-if="post.rating" class="cover-rating">★ {{ post.rating.toFixed(1) }}</span>
                    <span v-if="kind==='life'&&post.region" class="cover-region">{{post.region}}</span>
                </div>
                <div class="discovery-caption">
                    <h3>{{ post.title }}</h3>
                    <div class="row-between muted">
                        <span
                            ><i>{{ post.authorName?.slice(0, 1) }}</i
                            >{{ post.authorName }}</span
                        ><small>♥ {{ post.likeCount || 0 }}</small>
                    </div>
                </div>
            </button>
        </div>
        <div v-else class="feed-list panel">
            <PostCard v-for="post in posts" :key="post.id" :post="post" @open="open" @changed="refresh" />
        </div>
        <button
            v-if="posts.length && posts.length < total"
            class="load-more"
            :disabled="loading"
            @click="loadMore"
        >
            {{ loading ? '加载中…' : '加载更多' }}
        </button>
        <MeshDialog v-if="kind==='job'||kind==='life'" :open="!!selected" title="内容详情" :width="1024" name="discovery-dialog" @update:open="!$event&&closeDetail()"><DiscoveryDetail v-if="selected" :id="selected" modal @close="closeDetail" @changed="refresh"/></MeshDialog>
        <MeshDialog v-else :open="!!selected" title="问题详情" :width="672" name="question-dialog" @update:open="!$event&&closeDetail()"><template #header-actions><RouterLink class="detail-link" :to="'/question/'+selected">完整页面 ↗</RouterLink></template><QuestionDetail v-if="selected" :id="selected" modal/></MeshDialog>
    </section>
</template>
