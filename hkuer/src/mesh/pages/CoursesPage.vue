<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { courses, type Course } from '../course-api'
import { requireSession, meshUser } from '../session'
import MeshIcon from '../components/MeshIcon.vue'
import GroupDialog from '../components/GroupDialog.vue'
import { social, type Profile } from '../social-api'
const showGroups=ref(false), groups=ref<NonNullable<Profile['groups']>>([]), groupLoading=ref(false), groupError=ref(''), selectedGroup=ref('')
async function loadGroups(){
    if(!meshUser.value)return
    groupLoading.value=true;groupError.value=''
    try{groups.value=(await social.profile(meshUser.value.userId)).groups || []}
    catch(e){groupError.value=(e as Error).message}finally{groupLoading.value=false}
}
async function openGroups(){if(!requireSession())return;showGroups.value=true;await loadGroups()}
const code = ref(''),
    name = ref(''),
    sort = ref('code'),
    level = ref(''),
    subject = ref(''),
    mine = ref(false),
    page = ref(1),
    items = ref<Course[]>([]),
    total = ref(0),
    subjects = ref<{ subject: string; total: number }[]>([]),
    loading = ref(false),
    error = ref(''),
    expanded = ref(false)
let stamp = 0,
    timer: ReturnType<typeof setTimeout> | undefined
async function load() {
    const current = ++stamp
    loading.value = true
    try {
        const data = await courses.list({
            code: code.value,
            name: name.value,
            sort: sort.value,
            level: level.value,
            subject: subject.value,
            mine: mine.value,
            current: page.value,
            size: 24
        })
        if (current === stamp) {
            items.value =
                page.value > 1
                    ? [...new Map([...items.value, ...data.records].map((c) => [c.id, c])).values()]
                    : data.records
            total.value = data.total
            error.value = ''
        }
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        if (current === stamp) loading.value = false
    }
}
watch([code, name], () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
        page.value = 1
        load()
    }, 250)
})
watch(
    [sort, level, subject, mine, meshUser],
    () => {
        page.value = 1
        load()
    },
    { immediate: true }
)
watch(page, load)
onMounted(async () => {
    subjects.value = await courses.subjects()
})
</script>
<template>
    <section class="course-page">
        <div class="course-heading row-between">
            <div>
                <h1>
                    课程库 <small class="muted">{{ total }} 门</small>
                </h1>
                <p class="muted">浏览评分、写下你的修课心得</p>
            </div>
            <RouterLink class="pk-link" to="/courses/pk">🗳️ 课程投票</RouterLink>
        </div>
        <div class="segmented course-scope">
            <button :class="{ active: !mine&&!showGroups }" @click="showGroups=false;mine = false">全部课程</button
            ><button :class="{ active: mine&&!showGroups }" @click="requireSession() && (showGroups=false,mine = true)">我参与的</button
            ><button :class="{active:showGroups}" @click="openGroups">我的组队</button>
        </div>
        <section v-if="showGroups" class="my-course-groups"><p v-if="groupError" class="error">{{groupError}} <button @click="loadGroups">重试</button></p><p v-else-if="groupLoading" class="empty" role="status">加载中…</p><p v-else-if="!groups.length" class="empty">还没有加入或创建任何队伍</p><article v-for="g in groups" v-else :key="g.id" class="panel group-list-card"><div><h3>{{g.name}}</h3><RouterLink :to="'/courses/'+g.courseId">查看课程</RouterLink></div><button class="soft-button" @click="selectedGroup=g.id">查看小组</button></article></section>
        <template v-else>
        <div class="panel course-filters">
            <div class="course-search">
                <div class="search-box">
                    <MeshIcon name="search" /><input
                        v-model="code"
                        aria-label="课程编号"
                        placeholder="课程编号 (如COMP或3002)"
                    />
                </div>
                <div class="search-box">
                    <MeshIcon name="search" /><input
                        v-model="name"
                        aria-label="课程名称"
                        placeholder="课程名称 (如machine learning)"
                    />
                </div>
                <select v-model="sort" aria-label="课程排序">
                    <option value="code">按代码排序</option>
                    <option value="rating">按评分排序</option>
                    <option value="reviews">按评价数排序</option>
                </select>
            </div>
            <div class="pill-row">
                <button
                    v-for="l in [
                        ['', '全部级别'],
                        ['UG', '本科 UG'],
                        ['PG', '研究生 PG']
                    ]"
                    :key="l[0]"
                    :class="{ active: level === l[0] }"
                    @click="($event: any) => {
                        level = l[0]!
                        page = 1
                    }"
                >
                    {{ l[1] }}
                </button>
            </div>
        </div>
        <div class="pill-row course-subjects">
            <button
                :class="{ active: !subject }"
                @click="($event: any) => {
                    subject = ''
                    page = 1
                }"
            >
                All {{ total }}</button
            ><button
                v-for="s in expanded ? subjects : subjects.slice(0, 12)"
                :key="s.subject"
                :class="{ active: subject === s.subject }"
                @click="($event: any) => {
                    subject = s.subject
                    page = 1
                }"
            >
                {{ s.subject }}
            </button>
        </div>
        <button v-if="subjects.length > 12" class="text-button expand-subjects" @click="expanded = !expanded">
            {{ expanded ? '收起' : '展开全部 (' + subjects.length + ')' }}⌄
        </button>
        <p v-if="error" class="error" role="alert">{{ error }} <button @click="load">重试</button></p>
        <a-skeleton v-else-if="loading && !items.length" active />
        <div v-else-if="!items.length" class="empty">
            <h3>暂无匹配课程</h3>
            <p>试试其他关键词或筛选条件</p>
        </div>
        <div v-else class="course-grid">
            <RouterLink v-for="c in items" :key="c.id" :to="'/courses/' + c.id" class="course-card"
                ><div class="row-between">
                    <span class="course-code">{{ c.code }}</span
                    ><span class="subject-badge">{{ c.subject }}</span>
                </div>
                <h3>{{ c.name }}</h3>
                <p class="muted">{{ c.subtitle }}</p>
                <div class="row-between muted">
                    <span v-if="c.reviewCount">★ {{ Number(c.rating).toFixed(1) }} · {{ c.reviewCount }} 条评价</span
                    ><span v-else>暂无评价</span><span>{{ c.credits }} 学分</span>
                </div></RouterLink
            >
        </div>
        <button v-if="items.length < total" class="load-more" :disabled="loading" @click="page++">
            {{ loading ? '加载中…' : '加载更多' }}
        </button>
        </template>
        <GroupDialog v-if="selectedGroup" :id="selectedGroup" @close="selectedGroup=''" @changed="loadGroups"/>
    </section>
</template>
