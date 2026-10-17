<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { api } from '@/utils/request'
import { contentApi, plainText, type MeshPost } from '../api'
import { requireSession } from '../session'
import { social } from '../social-api'
import MeshIcon from '../components/MeshIcon.vue'
import MarketDetail from '../components/MarketDetail.vue'
const route = useRoute(),
    router = useRouter(),
    market = computed(() => route.meta.section === 'market'),
    kind = computed(() => (market.value ? 'market' : 'rental')),
    items = ref<MeshPost[]>([]),
    selected = ref<MeshPost>(),
    keyword = ref(''),
    category = ref(''),
    tag = ref(String(route.query.tags||'')),
    sort = ref('latest'),
    error = ref(''),
    loading = ref(true),
    page = ref(1),
    total = ref(0)
const tags = ['🪑 家具', '🔌 电器', '🍳 厨具', '📱 数码', '🎁 免费', '📐 书桌', '💺 椅子', '🛏️ 床垫', '🛋️ 宜家', '✨ 全新', '📍 西营盘', '💬 可议价', '🤝 自取']
const display = computed(() => {
    const rows = [...items.value]
    if (sort.value === 'low') rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    if (sort.value === 'high') rows.sort((a, b) => (b.price ?? -1) - (a.price ?? -1))
    return rows
})
let sequence = 0
async function load() {
    const request = ++sequence
    loading.value = true
    try {
        const data = await contentApi.list({
            kind: kind.value,
            keyword: keyword.value,
            category: category.value,
            tag: tag.value,
            sort: sort.value,
            current: page.value,
            size: 48
        })
        if (request === sequence) {
            items.value = data.records
            total.value = data.total
            if (route.query.id && !selected.value) {
                if(!market.value){await router.replace('/rental/'+String(route.query.id));return}
                selected.value = await contentApi.detail(String(route.query.id))
            }
            error.value = ''
        }
    } catch (e) {
        if(request===sequence)error.value = (e as Error).message
    } finally {
        if (request === sequence) loading.value = false
    }
}
watch([kind,category,tag,sort],()=>{page.value=1;load()},{immediate:true})
watch(page,load)
watch(()=>route.query.tags,value=>{tag.value=String(value||'')})
async function open(item: MeshPost) {
    if(!market.value){router.push((item.rentalType==='listing'?'/rental/':'/roommates/')+item.id);return}
    try {
        if(window.matchMedia('(max-width:639px)').matches){router.push('/marketplace/'+item.id);return}
        selected.value = item
    } catch (e) {
        message.error((e as Error).message)
    }
}
async function closeDetail(){selected.value=undefined;if(route.query.id)await router.replace({path:route.path,query:{...route.query,id:undefined}})}
function create() {
    if (requireSession()) router.push('/create/' + kind.value)
}
</script>
<template>
    <section class="commerce-page" :class="{ marketplace: market, rentals: !market }">
        <div class="commerce-list">
            <div class="commerce-toolbar">
                <div class="row-between">
                    <div>
                        <h1>{{ market ? '二手交易' : '租房找室友' }}</h1>
                        <p class="muted">
                            {{ market ? 'HKU 学生二手集市 · 好物等你淘' : 'HKU 学生租房 & 找室友平台' }}
                        </p>
                    </div>
                    <button class="primary orange" @click="create">＋ 发布</button>
                </div>
                <form v-if="market" class="market-search" @submit.prevent="page=1;load()">
                    <div class="search-box">
                        <MeshIcon name="search" /><input
                            v-model="keyword"
                            placeholder="搜索商品、品牌、地点…"
                            aria-label="搜索商品"
                        />
                    </div>
                    <div class="segmented sort">
                        <button
                            type="button"
                            v-for="s in [
                                ['latest', '最新'],
                                ['low', '低价'],
                                ['high', '高价']
                            ]"
                            :key="s[0]"
                            :class="{ selected: sort === s[0] }"
                            @click="sort = s[0]!"
                        >
                            {{ s[1] }}
                        </button>
                    </div>
                </form>
                <div v-else class="segmented rental-tabs">
                    <button
                        v-for="c in [
                            ['', '全部'],
                            ['listing', '房源'],
                            ['roommate', '找室友'],
                            ['wanted', '找房源']
                        ]"
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
            </div>
            <div v-if="market" class="pill-row market-tags">
                <button
                    v-for="t in tags"
                    :key="t"
                    :class="{ active: tag === t.slice(t.indexOf(' ') + 1) }"
                    @click="($event: any) => {
                        tag = tag === t.slice(t.indexOf(' ') + 1) ? '' : t.slice(t.indexOf(' ') + 1)
                        page = 1
                    }"
                >
                    {{ t }}
                </button>
            </div>
            <p v-if="error" role="alert" class="error">{{ error }} <button @click="load">重试</button></p>
            <a-skeleton v-else-if="loading" active />
            <div v-else-if="!display.length" class="empty">
                <h3>暂无{{ market ? '商品' : '信息' }}</h3>
                <p>发布一条，连接需要的同学</p>
            </div>
            <div v-else class="commerce-grid" :class="{ 'rental-grid': !market }">
                <button
                    v-for="p in display"
                    :key="p.id"
                    class="commerce-card"
                    :class="{
                        chosen: selected?.id === p.id,
                        roommate: p.rentalType === 'roommate',
                        wanted: p.rentalType === 'wanted',
                        'listing-card': !market && p.rentalType === 'listing'
                    }"
                    @click="open(p)"
                >
                    <img v-if="p.images?.[0]" :src="p.images[0]" :alt="p.title" />
                    <div class="commerce-card-text">
                        <small v-if="!market" class="rental-type">{{
                            p.rentalType === 'listing'
                                ? '⌂ 房源'
                                : p.rentalType === 'roommate'
                                  ? '♟ 找室友'
                                  : '🔎 找房源'
                        }}</small>
                        <h3>{{ p.title }}</h3>
                        <p v-if="market" class="price">{{ p.price==null ? '价格面议' : 'HKD ' + p.price }}</p>
                        <p v-else-if="p.rentalType === 'listing'">
                            {{ p.rent ? 'HKD ' + p.rent + ' / 月' : '价格面议' }}
                        </p>
                        <p v-else class="muted card-excerpt">{{ plainText(p.content).slice(0, 90) }}</p>
                        <div class="row-between muted">
                            <small>{{ market ? p.tradeLocation : p.authorName }}</small
                            ><small>{{ p.createdAt?.slice(0, 10) }}</small>
                        </div>
                    </div>
                </button>
            </div>
            <a-pagination
                v-if="total > 48"
                v-model:current="page"
                :total="total"
                :page-size="48"
                :show-size-changer="false"
                class="pagination"
            />
        </div>
        <aside v-if="market" class="commerce-detail" :class="{opened:!!selected}"><MarketDetail v-if="selected" :id="selected.id" @close="closeDetail" @changed="load"/><div v-else class="empty detail-empty"><span>☝</span><h3>点击左侧商品查看详情</h3><p>无需跳转，即点即看</p></div></aside>
    </section>
</template>
