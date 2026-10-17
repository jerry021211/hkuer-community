<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { courses, type Course } from '../course-api'
import { requireSession } from '../session'
import { contentApi, type MeshPost } from '../api'
import ReportAction from '../components/ReportAction.vue'
import MeshDialog from '../components/MeshDialog.vue'
import GroupDialog from '../components/GroupDialog.vue'
import GroupFields from '../components/GroupFields.vue'
import StarRating from '../components/StarRating.vue'
import MeshIcon from '../components/MeshIcon.vue'
const route = useRoute(),
    id = String(route.params.id),
    course = ref<Course>(),
    tab = ref('reviews'),
    error = ref(''),
    showReview = ref(false),
    showGroup = ref(false),
    showMaterial = ref(false),
    uploadingMaterial = ref(false),
    busy = ref(false),
    questions = ref<MeshPost[]>([])
const review = reactive({
    semester: '',
    overall: 0,
    difficulty: 0,
    workload: 0,
    teaching: 0,
    examDifficulty: 0,
    midterm: null as boolean | null,
    finalExam: null as boolean | null,
    openBook: null as boolean | null,
    content: '',
    anonymous: false
})
const dimensions = [
    ['overall', '总体评分'],
    ['difficulty', '难度'],
    ['workload', '工作量'],
    ['teaching', '教学质量'],
    ['examDifficulty', '考试难度']
] as const
const group = reactive({ name: '', description: '', capacity: 4, skills:[] as string[], wechat:'', contactNote:'' }),
    material = reactive({ title: '', category: 'notes', url: '' })
const materialCategory = ref('')
const selectedGroup=ref('')
const materialCategories = [['','全部'],['pastpaper','历年考卷'],['slides','课件'],['openbook','开卷资料'],['notes','笔记'],['other','其他']]
const filteredMaterials = computed(() => course.value?.materials.filter(m => !materialCategory.value || m.category===materialCategory.value) || [])
const semesterYears = Array.from({length:4}, (_, i) => 2025-i)
const semesters = semesterYears.flatMap(year => [`${year}-${year+1} Sem 2`, `${year}-${year+1} Sem 1`])
const distribution = computed(() =>
    [5, 4, 3, 2, 1].map((score) => ({
        score,
        count: course.value?.reviews.filter((r) => r.overall === score).length || 0
    }))
)
async function load() {
    try {
        course.value = await courses.detail(id)
        error.value = ''
    } catch (e) {
        error.value = (e as Error).message
    }
}
onMounted(load)
async function action(kind: string, enabled: boolean) {
    if (!requireSession()) return
    try {
        await courses.action(id, kind, enabled)
        await load()
    } catch (e) {
        message.error((e as Error).message)
    }
}
async function submit(type: string) {
    if (!requireSession() || busy.value || uploadingMaterial.value) return
    busy.value = true
    try {
        if (type === 'review') {
            await courses.review(id, review)
            showReview.value = false
        } else if (type === 'group') {
            await courses.group(id, group)
            showGroup.value = false
            Object.assign(group,{name:'',description:'',capacity:4,skills:[],wechat:'',contactNote:''})
        } else {
            await courses.material(id, material)
            showMaterial.value = false
            Object.assign(material,{title:'',category:'notes',url:''})
        }
        await load()
        message.success('已保存')
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        busy.value = false
    }
}
async function changeTab(value: string) {
    tab.value = value
    if (value === 'qa') {
        try {
            const data = await contentApi.list({ kind: 'qa', courseId: id })
            questions.value = data.records
        } catch (e) { message.error((e as Error).message) }
    }
}
async function joinGroup(groupId: string, enabled: boolean) {
    if (!requireSession()) return
    try {
        await courses.joinGroup(groupId, enabled)
        await load()
    } catch (e) {
        message.error((e as Error).message)
    }
}
async function uploadMaterial(e: Event) {
    const input=e.target as HTMLInputElement,file = input.files?.[0]
    if (!file || uploadingMaterial.value) return
    if(file.size>20*1024*1024||!file.name.toLowerCase().endsWith('.pdf')){message.error('请选择 20MB 以内的 PDF 文件');input.value='';return}
    uploadingMaterial.value=true
    const data = new FormData()
    data.append('file', file)
    try {
        const { api } = await import('@/utils/request')
        material.url = await api.post<string>('/java/mesh/files/upload', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (!material.title) material.title = file.name
    } catch (e) {
        message.error((e as Error).message)
    } finally {uploadingMaterial.value=false;input.value=''}
}
</script>
<template>
    <section class="course-detail">
        <RouterLink to="/courses" class="back-link">← 返回课程库</RouterLink>
        <p v-if="error" class="error">{{ error }}</p>
        <a-skeleton v-else-if="!course" active />
        <template v-else
            ><div class="panel course-summary">
                <div class="row-between">
                    <div>
                        <span class="course-code">{{ course.code }}</span>
                        <span class="course-subject">{{ course.code.replace(/[0-9].*/, '') }}</span><span class="muted">{{ course.credits }} 学分</span>
                        <h1>{{ course.name }}</h1>
                        <p class="muted">{{ course.subtitle }}</p>
                    </div>
                    <div class="course-buttons">
                        <button class="soft-button" @click="action('join', !course.participating)">
                            <MeshIcon name="plus"/>{{ course.participating ? '已参与' : '参与课程' }}</button
                        ><button class="primary" @click="requireSession() && (showReview = true)"><MeshIcon name="edit"/> 写评价</button>
                    </div>
                </div>
            </div>
            <div class="panel rating-summary">
                <div class="rating-main">
                    <strong>{{ course.reviewCount ? Number(course.rating).toFixed(1) : '–' }}</strong
                    ><StarRating :model-value="Number(course.rating)" disabled :size="16"/>
                    <p class="muted">{{ course.reviewCount }} 条评价</p>
                    <p class="success"><MeshIcon name="users"/> {{ course.participantCount }} 人参与</p>
                </div>
                <div class="rating-histogram">
                    <div v-for="d in distribution" :key="d.score">
                        <span>{{ d.score }}</span>
                        <div>
                            <i
                                :style="{
                                    width: (course.reviewCount ? (d.count / course.reviewCount) * 100 : 0) + '%'
                                }"
                            />
                        </div>
                        <span>{{ d.count }}</span>
                    </div>
                </div>
                <div class="exam-stats">
                    <div
                        v-for="(label, key) in { midterm: '期中考', finalExam: '期末考', openBook: '开卷' }"
                        :key="key"
                    >
                        <p>{{ label }}</p>
                        <span
                            >{{key==='openBook'?'是':'有'}} {{ course.reviews.filter((r) => r[key]===true).length }} / {{key==='openBook'?'否':'无'}}
                            {{ course.reviews.filter((r) => r[key]===false).length }}</span
                        >
                    </div>
                </div>
            </div>
            <div class="panel course-tabs">
                <button
                    v-for="t in [
                        ['materials', '文件','folder'],
                        ['groups', '小组','users'],
                        ['qa', '问答','chat'],
                        ['reviews', '评价','star']
                    ]"
                    :key="t[0]"
                    :class="{ active: tab === t[0] }"
                    @click="changeTab(t[0]!)"
                >
                    <MeshIcon :name="t[2]!"/>{{ t[1] }}
                </button>
            </div>
            <section class="panel course-section" v-if="tab === 'reviews'">
                <div class="row-between">
                    <h3>
                        <MeshIcon name="chat"/>修课评价 <small class="muted">({{ course.reviews.length }})</small>
                    </h3>
                    <button class="primary" @click="requireSession() && (showReview = true)"><MeshIcon name="edit"/>写评价</button>
                </div>
                <div v-if="!course.reviews.length" class="empty">
                    <MeshIcon name="empty"/><p>暂无评价，快来第一个写评价吧</p>
                    <button class="primary" @click="requireSession() && (showReview = true)"><MeshIcon name="edit"/>写第一篇评价</button>
                </div>
                <article v-for="r in course.reviews" :key="r.id" class="answer">
                    <div class="row-between">
                        <strong>{{ r.authorName }}</strong
                        ><span class="muted">{{ r.semester }}</span>
                    </div>
                    <a-rate :value="r.overall" disabled />
                    <p class="review-content">{{ r.content }}</p>
                    <ReportAction :id="r.id" type="COURSE_REVIEW" />
                </article>
            </section>
            <section class="panel course-section" v-else-if="tab === 'materials'">
                <div class="row-between">
                    <h3><MeshIcon name="folder"/>课程资料 <small class="muted">({{course.materials.length}})</small></h3>
                    <button v-if="course.participating" class="primary" @click="requireSession() && (showMaterial = true)">上传资料</button>
                </div>
                <div class="pill-row material-filters"><button v-for="category in materialCategories" :key="category[0]" :class="{active:materialCategory===category[0]}" @click="materialCategory=category[0]!">{{category[1]}}</button></div>
                <div v-if="!filteredMaterials.length" class="empty"><MeshIcon name="folder"/><p>暂无资料</p></div>
                <div v-for="m in filteredMaterials" :key="m.id" class="material-row row-between">
                    <a :href="m.url" target="_blank" rel="noopener noreferrer"
                        >📄 {{ m.title }} <small class="muted">{{ m.category }}</small></a
                    ><ReportAction :id="m.id" type="COURSE_MATERIAL" />
                </div>
            </section>
            <section class="panel course-section" v-else-if="tab === 'groups'">
                <div class="row-between">
                    <h3><MeshIcon name="users"/>组队区 <small class="muted">({{course.groups.length}})</small></h3>
                    <button v-if="course.participating" class="primary" @click="requireSession() && (showGroup = true)">创建队伍</button><span v-else class="muted">参与课程后才能组队</span>
                </div>
                <div v-if="!course.groups.length" class="empty"><MeshIcon name="users"/><p>暂无队伍，快来创建吧！</p></div>
                <article v-for="g in course.groups" :key="g.id" class="answer">
                    <div class="row-between">
                        <h3>{{ g.name }}</h3>
                        <button v-if="g.joined" @click="selectedGroup=g.id">{{g.own?'管理小组':'查看小组'}}</button><button v-else :disabled="!course.participating||g.memberCount>=g.capacity" @click="joinGroup(g.id, true)">{{g.memberCount>=g.capacity?'人数已满':'加入小组'}}</button>
                    </div>
                    <p>{{ g.description }}</p>
                    <div class="selected-skills"><span v-for="skill in g.skills" :key="skill">{{skill}}</span></div>
                    <small class="muted">{{ g.memberCount }} / {{ g.capacity }} 人</small>
                </article>
            </section>
            <section class="panel course-section" v-else>
                <div class="row-between">
                    <h3>课程问答</h3>
                    <RouterLink :to="{ path: '/create/qa', query: { course: id, code: course.code } }" class="primary"
                        >提问</RouterLink
                    >
                </div>
                <RouterLink v-for="q in questions" :key="q.id" :to="'/question/' + q.id" class="material-row">{{
                    q.title
                }}</RouterLink>
                <p v-if="!questions.length" class="empty">暂无问题</p>
            </section>
        </template>
        <MeshDialog v-model:open="showReview" :title="'写评价 · '+(course?.code || '')" name="review-dialog">
            <form @submit.prevent="submit('review')">
                <div class="review-fields">
                    <div class="review-overall"><label>总体评分 <span class="required">*</span></label><StarRating v-model="review.overall" label="总体评分" :size="28"/></div>
                    <div class="review-dimensions"><div v-for="d in dimensions.slice(1)" :key="d[0]"><label>{{d[1]}}</label><StarRating v-model="review[d[0]]" :label="d[1]"/></div></div>
                    <label class="review-semester">修读学期<select v-model="review.semester"><option value="">不填写</option><option v-for="semester in semesters" :key="semester">{{semester}}</option></select></label>
                    <div class="review-exams"><label>考试信息</label><div v-for="exam in ([['midterm','期中考试'],['finalExam','期末考试'],['openBook','期末开卷']] as const)" :key="exam[0]" class="review-exam-row"><span>{{exam[1]}}</span><label><input v-model="review[exam[0]]" type="radio" :name="exam[0]" :value="true"/>{{exam[0]==='openBook'?'是':'有'}}</label><label><input v-model="review[exam[0]]" type="radio" :name="exam[0]" :value="false"/>{{exam[0]==='openBook'?'否':'没有'}}</label></div></div>
                    <label class="review-text"><span>评价内容<small>{{review.content.length}} / 1000</small></span><textarea v-model="review.content" rows="4" maxlength="1000" placeholder="分享你的修课体验、对选课的建议..."/></label>
                    <div class="anonymous-row"><div><p>匿名发布</p><small class="muted">其他用户看不到你的名字</small></div><button type="button" role="switch" :aria-checked="review.anonymous" aria-label="匿名发布" :class="{on:review.anonymous}" @click="review.anonymous=!review.anonymous"><span/></button></div>
                </div><footer class="mesh-dialog-footer"><button type="button" @click="showReview=false">取消</button><button class="primary" :disabled="busy||!review.overall">{{busy?'发布中…':'发布评价'}}</button></footer>
            </form>
        </MeshDialog>
        <GroupDialog v-if="selectedGroup" :id="selectedGroup" @close="selectedGroup=''" @changed="load"/>
        <MeshDialog v-model:open="showGroup" title="创建队伍" :width="448" name="group-create-dialog"><form @submit.prevent="submit('group')"><GroupFields :form="group"/><footer class="mesh-dialog-footer"><button type="button" @click="showGroup=false">取消</button><button class="primary" :disabled="busy||!group.name.trim()">{{busy?'发布中…':'发布队伍'}}</button></footer></form></MeshDialog>
        <a-modal v-model:open="showMaterial" title="分享课程资料" :footer="null" wrap-class-name="mesh-modal"
            ><form class="mesh-app modal-form" @submit.prevent="submit('material')">
                <label>资料名称<input v-model="material.title" required maxlength="200" /></label
                ><label
                    >分类<select v-model="material.category">
                        <option value="pastpaper">Past Paper</option>
                        <option value="slides">Slides</option>
                        <option value="openbook">Open Book</option>
                        <option value="notes">Notes</option>
                        <option value="other">其他</option>
                    </select></label
                ><label
                    >上传 PDF（20MB 以内）<input type="file" accept="application/pdf" :disabled="uploadingMaterial||busy" @change="uploadMaterial" /><small v-if="uploadingMaterial" role="status">文件上传中…</small></label
                ><label>或填写资料链接<input v-model="material.url" :disabled="uploadingMaterial" required placeholder="https://" /></label
                ><button class="primary" :disabled="busy||uploadingMaterial||!material.url.trim()||!material.title.trim()">{{busy?'保存中…':uploadingMaterial?'上传中…':'分享资料'}}</button>
            </form></a-modal
        >
    </section>
</template>
