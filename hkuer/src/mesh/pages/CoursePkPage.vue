<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { courses, type Course } from '../course-api'
import { requireSession } from '../session'
import '../pk.css'
import CourseOpinionDialog from '../components/CourseOpinionDialog.vue'
import CourseSharePreview from '../components/CourseSharePreview.vue'
import MeshIcon from '../components/MeshIcon.vue'
const opinion=ref(false),sharing=ref(false),preview=ref(false),comment=ref(''),shareRating=ref(0),shareComment=ref(''),notes=ref<{rating:number|null;content:string;authorName:string}[]>([])
function saveOpinion(value:number,text:string){if(sharing.value){shareRating.value=value;shareComment.value=text;preview.value=true}else{rating.value=value;comment.value=text}opinion.value=false}

const level = ref('UG'),
    subject = ref(''),
    step = ref('level'),
    items = ref<Course[]>([]),
    index = ref(0),
    voted = ref(0),
    busy = ref(false),
    error = ref(''),
    page = ref(1),
    more = ref(true),
    touchX = ref(0),
    rating = ref(0),
    showHelp = ref(false),
    counts = ref({ UG: 0, PG: 0 }),
    subjects = ref<{ subject: string; total: number }[]>([])
const current = computed(() => items.value[index.value]),
    rankings = computed(() =>
        [...items.value]
            .filter((c) => c.recommendCount + c.dislikeCount > 0)
            .sort(
                (a, b) =>
                    b.recommendCount / (b.recommendCount + b.dislikeCount) -
                    a.recommendCount / (a.recommendCount + a.dislikeCount)
            )
    )
onMounted(async () => {
    try {
        const [ug, pg, s] = await Promise.all([
            courses.list({ level: 'UG', size: 1 }),
            courses.list({ level: 'PG', size: 1 }),
            courses.subjects()
        ])
        counts.value = { UG: ug.total, PG: pg.total }
        subjects.value = s
    } catch (e) {
        error.value = (e as Error).message
    }
})
async function choose(value: string) {
    level.value = value; step.value = 'subject'; subjects.value=[];error.value=''
    try { subjects.value=await courses.subjects(value) } catch(e) {error.value=(e as Error).message}
}
async function start(value: string) {
    if (!requireSession()||busy.value) return
    subject.value = value
    page.value=1;index.value=0;voted.value=0;items.value=[];rating.value=0;comment.value='';more.value=true
    busy.value = true
    error.value = ''
    try {
        const data = await courses.list({ level: level.value, subject: value, current: page.value, size: 50 })
        items.value=data.records
        more.value = page.value < data.pages
        step.value = 'vote'
        if (index.value === 0) showHelp.value = true
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        busy.value = false
    }
}
async function nextPage(){
    if(busy.value||!more.value)return
    busy.value=true;error.value=''
    try{
        const next=page.value+1
        const data=await courses.list({level:level.value,subject:subject.value,current:next,size:50})
        items.value.push(...data.records);page.value=next;more.value=next<data.pages
    }catch(e){error.value=(e as Error).message}finally{busy.value=false}
}
async function vote(value: boolean | null) {
    if (!current.value || busy.value) return
    busy.value = true
    try {
        if (value !== null) {
            await courses.vote(current.value.id, value, rating.value || undefined,comment.value)
            items.value[index.value] = await courses.detail(current.value.id)
            voted.value++
        }
        rating.value = 0;comment.value=''
        index.value++
        if (index.value === items.value.length && more.value) {
            busy.value = false
            await nextPage()
        }
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        busy.value = false
    }
}
async function bookmark() {
    if (!current.value) return
    try {
        await courses.action(current.value.id, 'bookmark', !current.value.bookmarked)
        current.value.bookmarked = !current.value.bookmarked
    } catch (e) {
        message.error((e as Error).message)
    }
}
function swipe(e: TouchEvent) {
    const diff = (e.changedTouches[0]?.clientX || 0) - touchX.value
    if (Math.abs(diff) > 80) vote(diff > 0)
}
function share(){sharing.value=true;opinion.value=true}
watch(()=>current.value?.id,async id=>{notes.value=[];shareRating.value=0;shareComment.value='';opinion.value=false;preview.value=false;if(!id)return;try{const c=await courses.detail(id);if(current.value?.id===id)notes.value=c.voteNotes||[]}catch{/* Voting remains available when the optional notes fail. */}})
</script>
<template>
    <section class="pk-screen">
        <RouterLink to="/courses" class="pk-back" aria-label="返回课程库">‹</RouterLink>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-if="step === 'level'" class="pk-onboarding">
            <div class="pk-symbol">🎓</div>
            <h1>选择你的学历身份</h1>
            <p>为你匹配对应级别的课程</p>
            <button class="pk-level ug" @click="choose('UG')">
                <span
                    ><strong>本科生</strong><small>Undergraduate</small><em>{{ counts.UG }} 门课</em></span
                ><b>1xxx–4xxx</b></button
            ><button class="pk-level pg" @click="choose('PG')">
                <span
                    ><strong>研究生</strong><small>Postgraduate</small><em>{{ counts.PG }} 门课</em></span
                ><b>5xxx–9xxx</b>
            </button>
            <p class="pk-footnote">身份仅用于课程匹配，不会限制你的投票权限</p>
        </div>
        <div v-else-if="step === 'subject'" class="pk-subjects">
            <button class="pk-change" @click="step = 'level'">‹ 更换学历身份</button>
            <h1>选择你感兴趣的学科</h1>
            <p>从熟悉的领域开始，分享你的真实体验</p>
            <div>
                <button :disabled="busy" @click="start('')">
                    <strong>全部学科</strong><small>{{ counts[level as 'UG' | 'PG'] }} 门课程</small></button
                ><button v-for="s in subjects" :key="s.subject" :disabled="busy" @click="start(s.subject)">
                    <strong>{{ s.subject }}</strong
                    ><small>{{ s.total }} 门课程</small>
                </button>
            </div>
        </div>
        <div v-else class="pk-voting">
            <div class="pk-progress">
                {{ level === 'UG' ? '本科' : '研究生' }} · {{ subject || '全部学科' }}
                <span>{{ Math.min(index + 1, items.length) }} / {{ items.length }}{{ more ? '+' : '' }}</span>
            </div>
            <article
                v-if="current"
                class="pk-swipe-card"
                @touchstart="touchX = $event.touches[0]?.clientX || 0"
                @touchend="swipe"
            >
                <div class="row-between">
                    <strong>{{ current.code }}</strong
                    ><button @click="share">↗ 分享</button>
                </div>
                <h2>{{ current.name }}</h2>
                <p>{{ current.subtitle }}</p>
                <div class="pk-note-list"><article v-for="(note,n) in notes" :key="n"><small v-if="note.rating">{{'★'.repeat(note.rating)}}</small><p>{{note.content}}</p><span>{{note.authorName}}</span></article><div v-if="!notes.length" class="pk-no-notes"><MeshIcon name="chat"/><p>暂无评价，来做第一个打分的人吧</p></div></div>
                <div class="pk-card-bottom">
                    <div class="pk-counts">
                        <span>{{ current.dislikeCount }} 人不推荐</span><span>{{ current.recommendCount }} 人推荐</span>
                    </div>
                    <div class="pk-ratio">
                        <i
                            :style="{
                                width:
                                    (current.recommendCount + current.dislikeCount
                                        ? (current.recommendCount / (current.recommendCount + current.dislikeCount)) *
                                          100
                                        : 50) + '%'
                            }"
                        />
                    </div>
                    <div class="row-between">
                        <button @click="bookmark">{{ current.bookmarked ? '★ 已收藏' : '☆ 收藏课程' }}</button
                        ><button :disabled="busy" @click="vote(null)">跳过 ⏭</button><button class="pk-rate-button" @click="sharing=false;opinion=true">☆ {{rating?'已打分 '+rating+' 星':'打分'}}</button>
                    </div>
                </div>
            </article>
            <div v-else-if="more" class="pk-finished" role="status"><h2>{{busy?'加载下一组课程…':'下一组课程加载失败'}}</h2><button class="primary" :disabled="busy" @click="nextPage">重试加载</button></div>
            <div v-else class="pk-finished">
                <h1>本轮投票完成</h1>
                <p>你为 {{ voted }} 门课程提供了建议</p>
                <h2>本轮课程好评率排行</h2>
                <RouterLink v-for="(c, i) in rankings" :key="c.id" :to="'/courses/' + c.id"
                    ><b>{{ i + 1 }}</b
                    ><span>{{ c.code }} · {{ c.name }}</span
                    ><strong
                        >{{ Math.round((c.recommendCount / (c.recommendCount + c.dislikeCount)) * 100) }}%</strong
                    ></RouterLink
                >
                <p v-if="!rankings.length">暂无投票记录</p>
                <RouterLink to="/courses" class="primary">返回课程库</RouterLink>
                <button class="soft-button" @click="step='level'">重新选择课程</button>
            </div>
            <div v-if="current" class="pk-vote-buttons">
                <button :disabled="busy" aria-label="不推荐" @click="vote(false)">×</button
                ><button :disabled="busy" aria-label="推荐" @click="vote(true)">♡</button>
            </div>
            <div class="pk-instructions">
                <span>← 左滑不推荐</span><span>右滑推荐 →</span><button @click="showHelp = true">ⓘ 使用说明</button>
            </div>
        </div>
        <div v-if="showHelp" class="pk-help-shade">
            <section class="pk-help">
                <button class="pk-help-close" aria-label="关闭使用说明" @click="showHelp = false">×</button>
                <h2>使用说明</h2>
                <p>左滑右滑，快速评价课程</p>
                <div class="pk-help-grid">
                    <article
                        v-for="item in [
                            ['👈👉', '滑动投票', '左滑差评 右滑好评'],
                            ['⭐', '打分评价', '评分后滑动提交'],
                            ['⏭', '跳过课程', '没修过直接下一门'],
                            ['📤', '分享卡片', '生成精美分享图片'],
                            ['🔖', '收藏课程', '左下角书签收藏'],
                            ['🏆', '排行榜', '投完查看好评率排行']
                        ]"
                        :key="item[1]"
                    >
                        <span>{{ item[0] }}</span
                        ><strong>{{ item[1] }}</strong
                        ><small>{{ item[2] }}</small>
                    </article>
                </div>
                <button class="pk-help-done" @click="showHelp = false">知道了，开始投票</button>
            </section>
        </div>
        <CourseOpinionDialog v-if="current" v-model:open="opinion" :code="current.code" :share="sharing" :rating="sharing?shareRating:rating" :comment="sharing?shareComment:comment" @save="saveOpinion"/>
        <CourseSharePreview v-if="current" v-model:open="preview" :course="current" :rating="shareRating" :comment="shareComment"/>
    </section>
</template>
