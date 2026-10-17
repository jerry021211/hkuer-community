<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentApi, plainText, type MeshPost } from '../api'
import { courses, type Course } from '../course-api'
import MeshIcon from '../components/MeshIcon.vue'
const route = useRoute(),
    router = useRouter(),
    query = ref(String(route.query.q || '')),
    tab = ref('all'),
    loading = ref(false),
    error = ref(''),
    elapsed = ref(0),
    page = ref(1)
type Hit = { id: string; kind: string; title: string; description: string; path: string }
const groups = ref<Record<string, { total: number; records: Hit[] }>>({})
const tabs = [
    ['all', '全部'],
    ['qa', '问答'],
    ['course', '课程'],
    ['job', '求职'],
    ['life', '生活']
]
const total = computed(() =>
    tab.value === 'all'
        ? Object.values(groups.value).reduce((sum, g) => sum + g.total, 0)
        : groups.value[tab.value]?.total || 0
)
const records = computed(() =>
    tab.value === 'all' ? Object.values(groups.value).flatMap((g) => g.records) : groups.value[tab.value]?.records || []
)
let sequence = 0
function parts(text: string) {
    const q = query.value.trim()
    if (!q) return [{ text, hit: false }]
    const result: { text: string; hit: boolean }[] = []
    let start = 0,
        index = 0
    while ((index = text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase(), start)) !== -1) {
        result.push(
            { text: text.slice(start, index), hit: false },
            { text: text.slice(index, index + q.length), hit: true }
        )
        start = index + q.length
    }
    result.push({ text: text.slice(start), hit: false })
    return result
}
function postHit(p: MeshPost): Hit {
    return {
        id: p.id,
        kind: p.kind,
        title: p.title,
        description: plainText(p.content).slice(0, 180),
        path: (p.kind==='job'?'/jobs/':p.kind==='life'?'/life/':'/question/') + p.id
    }
}
function courseHit(c: Course): Hit {
    return {
        id: c.id,
        kind: 'course',
        title: c.code + ' ' + c.name,
        description: c.subtitle || c.subject,
        path: '/courses/' + c.id
    }
}
async function load() {
    const stamp = ++sequence
    loading.value = true
    error.value = ''
    const start = performance.now()
    try {
        const kinds = tab.value === 'all' ? ['qa', 'course', 'job', 'life'] : [tab.value]
        const results = await Promise.all(
            kinds.map(async (kind) => {
                if (kind === 'course') {
                    const r = await courses.list({ keyword: query.value, current: page.value, size: 10 })
                    return [kind, { total: r.total, records: r.records.map(courseHit) }] as const
                }
                const r = await contentApi.list({ kind, keyword: query.value, current: page.value, size: 10 })
                return [kind, { total: r.total, records: r.records.map(postHit) }] as const
            })
        )
        if (stamp === sequence) {
            groups.value = Object.fromEntries(results)
            elapsed.value = (performance.now() - start) / 1000
        }
    } catch (e) {
        if (stamp === sequence) error.value = (e as Error).message
    } finally {
        if (stamp === sequence) loading.value = false
    }
}
watch(
    () => route.query.q,
    () => {
        query.value = String(route.query.q || '')
        page.value = 1
        load()
    },
    { immediate: true }
)
watch(tab, () => {
    page.value = 1
    load()
})
watch(page, load)
function search() {
    router.replace({ path: '/search', query: { q: query.value } })
    if (query.value === String(route.query.q || '')) load()
}
</script>
<template>
    <section class="search-page">
        <form class="search-box" @submit.prevent="search">
            <MeshIcon name="search" /><input
                v-model="query"
                aria-label="搜索关键词"
                placeholder="搜索问题、课程、求职、生活…"
            /><button class="text-button">搜索</button>
        </form>
        <h1>“{{ route.query.q || '' }}” 的搜索结果</h1>
        <p class="muted">找到 {{ total }} 条结果 · 用时 {{ elapsed.toFixed(2) }} 秒</p>
        <div class="search-tabs">
            <button v-for="t in tabs" :key="t[0]" :class="{ selected: tab === t[0] }" @click="tab = t[0]!">
                {{ t[1] }}
            </button>
        </div>
        <p v-if="error" class="error">{{ error }} <button @click="load">重试</button></p>
        <a-skeleton v-else-if="loading" active class="panel" />
        <div v-else class="panel">
            <RouterLink v-for="r in records" :key="r.kind + r.id" :to="r.path" class="search-result"
                ><span class="tag">{{ tabs.find((t) => t[0] === r.kind)?.[1] }}</span>
                <h3>
                    <template v-for="(p, i) in parts(r.title)" :key="i"
                        ><mark v-if="p.hit">{{ p.text }}</mark
                        ><template v-else>{{ p.text }}</template></template
                    >
                </h3>
                <p class="muted">
                    <template v-for="(p, i) in parts(r.description)" :key="i"
                        ><mark v-if="p.hit">{{ p.text }}</mark
                        ><template v-else>{{ p.text }}</template></template
                    >
                </p></RouterLink
            >
            <div v-if="!records.length" class="empty">没有找到相关内容，试试其他关键词</div>
        </div>
        <a-pagination
            v-if="total > 10"
            v-model:current="page"
            :total="tab === 'all' ? Math.max(0, ...Object.values(groups).map((g) => g.total)) : total"
            :page-size="10"
            :show-size-changer="false"
            class="pagination"
        />
    </section>
</template>
