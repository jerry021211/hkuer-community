<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { social, type Profile } from '../social-api'
import { meshUser, authDialog, loadSession, endSession } from '../session'
import { dateText, type MeshPost } from '../api'
import { uploadAvatar } from '@/api/user'
import { api } from '@/utils/request'
import MeshIcon from '../components/MeshIcon.vue'
import ContentManagement from '../components/ContentManagement.vue'
import MeshDialog from '../components/MeshDialog.vue'
const nicknameEditing=ref(false), nicknameDraft=ref(''), nicknameBusy=ref(false), badgeHelp=ref(false), skillDraft=ref('')
const skillSuggestions=['Python','Java','JavaScript','TypeScript','C++','Go','Rust','React','Vue','Node.js','Flutter','Swift','Machine Learning','Deep Learning','Data Analysis','NLP','UI/UX','Figma','Graphic Design','Finance','Blockchain','Cybersecurity','Cloud']
function addSkill(skill:string){const value=skill.trim();if(!profile.value||!value)return;if(profile.value.skills.includes(value)){skillDraft.value='';return}if(profile.value.skills.length>=10){message.info('最多添加 10 个技能');return}if(value.length>30){message.info('每个技能最多 30 字');return}profile.value.skills.push(value);skillDraft.value=''}
async function saveNickname(){if(!profile.value||nicknameBusy.value||!nicknameDraft.value.trim())return;nicknameBusy.value=true;try{const latest=await social.profile(profile.value.userId);await social.updateProfile({...latest,nickname:nicknameDraft.value.trim()});profile.value.nickname=nicknameDraft.value.trim();await loadSession();nicknameEditing.value=false;message.success('昵称已保存')}catch(e){message.error((e as Error).message)}finally{nicknameBusy.value=false}}
const route = useRoute(),
    router = useRouter(),
    profile = ref<Profile>(),
    error = ref(''),
    saving = ref(false),
    section = computed(() => ({followed:'watched',marketplace:'market',favorites:'market-favorites'}[String(route.params.section)] || String(route.params.section || 'info'))),
    publicPage = computed(() => route.path.startsWith('/u/'))
const publicTab = ref('public')
const contentFilter = ref(section.value==='posts'?'qa':section.value==='market'?'selling':section.value==='rental'?'listing':'')
watch(section, () => (contentFilter.value = ''))
const rows = ref<Pick<MeshPost, 'id' | 'title' | 'kind' | 'createdAt'>[]>([])
const contentPage = ref(1), contentTotal = ref(0), contentLoading = ref(false)
let contentSequence = 0
async function loadContent() {
    const id = publicPage.value ? String(route.params.id) : meshUser.value?.userId
    if (section.value==='rental' && contentFilter.value==='habits') { rows.value=[]; contentTotal.value=0; return }
    if (!id || (!publicPage.value && ['info', 'groups'].includes(section.value))) return
    const sequence = ++contentSequence
    contentLoading.value = true
    try {
        const result = await social.profileContent(id, publicPage.value ? publicTab.value : section.value, contentFilter.value, contentPage.value)
        if (sequence === contentSequence) { rows.value = result.records; contentTotal.value = result.total }
    } catch (e) {
        if (sequence === contentSequence) error.value = (e as Error).message
    } finally {
        if (sequence === contentSequence) contentLoading.value = false
    }
}
watch(() => [contentFilter.value, publicTab.value, meshUser.value?.userId], () => {
    if (contentPage.value !== 1) contentPage.value = 1
    else loadContent()
}, { immediate: true })
watch(contentPage, loadContent)
const hkuEmail = ref(''),
    hkuCode = ref(''),
    codeSent = ref(false)
const verificationBusy=ref(false), codeCountdown=ref(0)
let codeTimer:ReturnType<typeof setInterval>|undefined
onUnmounted(()=>clearInterval(codeTimer))
const validHkuEmail=computed(()=>/^[^\s@]+@(connect\.)?hku\.hk$/i.test(hkuEmail.value.trim()))
const menu = [
    ['info', '我的资料'],
    ['posts', '我的帖子'],
    ['answers', '我的回答'],
    ['watched', '我蹲的问题'],
    ['market', '我的二手'],
    ['rental', '我的租房'],
    ['market-favorites', '二手收藏'],
    ['bookmarks', '我的收藏']
]
async function load() {
    const id = publicPage.value ? String(route.params.id) : meshUser.value?.userId
    if (!id) return
    try {
        profile.value = await social.profile(id)
        if(profile.value.own){profile.value.smoking ||= '不吸烟';profile.value.sleepSchedule ||= '早睡早起';profile.value.cleanliness ||= '比较爱干净';profile.value.occupation ||= '学生'}
        error.value = ''
    } catch (e) {
        error.value = (e as Error).message
    }
}
watch(() => [route.fullPath, meshUser.value?.userId], load, { immediate: true })
async function save() {
    if (!profile.value) return
    saving.value = true
    try {
        await social.updateProfile(profile.value)
        await loadSession()
        message.success('资料已保存')
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        saving.value = false
    }
}
async function upload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !profile.value) return
    try {
        profile.value.avatar = await uploadAvatar(file, file.name)
    } catch (e) {
        message.error((e as Error).message)
    }
}
async function chat() {
    if (!meshUser.value) {
        authDialog.value = 'login'
        return
    }
    if (profile.value) {
        try {
            router.push('/chat/' + (await social.start(profile.value.userId)))
        } catch (e) {
            message.error((e as Error).message)
        }
    }
}
function link(kind: string, id: string) {
    if(kind==='job'||kind==='life')return '/'+(kind==='job'?'jobs':'life')+'/'+id
    return kind === 'course'
        ? '/courses/' + id
        : kind === 'market'
          ? { path: '/marketplace', query: { id } }
          : kind === 'rental'
            ? { path: '/rental', query: { id } }
            : '/question/' + id
}
async function sendHku() {
    if(verificationBusy.value||codeCountdown.value||!validHkuEmail.value)return
    verificationBusy.value=true
    try {
        await api.post('/java/mesh/verification/send', { email: hkuEmail.value })
        codeSent.value = true
        codeCountdown.value=60;clearInterval(codeTimer);codeTimer=setInterval(()=>{if(--codeCountdown.value<=0)clearInterval(codeTimer)},1000)
        message.success('验证码已发送')
    } catch (e) {
        message.error((e as Error).message)
    } finally {verificationBusy.value=false}
}
async function verifyHku() {
    if(verificationBusy.value)return
    verificationBusy.value=true
    try {
        await api.post('/java/mesh/verification/confirm', { email: hkuEmail.value, code: hkuCode.value })
        await load()
        message.success('认证成功')
    } catch (e) {
        message.error((e as Error).message)
    } finally {verificationBusy.value=false}
}
async function wear(code: string) {
    try {
        await social.wear(profile.value?.activeBadge === code ? '' : code)
        await load()
    } catch (e) {
        message.error((e as Error).message)
    }
}
</script>
<template>
    <div class="profile-page" :class="{'public-profile-page': publicPage}">
        <aside v-if="!publicPage" class="profile-sidebar panel">
            <div class="profile-nav-heading">
                <h2>{{ profile?.nickname || '个人中心' }}</h2>
                <form v-if="nicknameEditing" class="nickname-edit" @submit.prevent="saveNickname"><input v-model="nicknameDraft" aria-label="新昵称" maxlength="20" required/><div><button :disabled="nicknameBusy||!nicknameDraft.trim()">{{nicknameBusy?'保存中…':'保存'}}</button><button type="button" :disabled="nicknameBusy" @click="nicknameEditing=false">取消</button></div></form><button v-else @click="nicknameDraft=profile?.nickname||'';nicknameEditing=true">✎ 编辑昵称</button>
            </div>
            <RouterLink
                v-for="item in menu"
                :key="item[0]"
                :to="'/profile/' + ({watched:'followed',market:'marketplace','market-favorites':'favorites'}[item[0]!] || item[0])"
                :class="{ selected: section === item[0] }"
                ><MeshIcon :name="{info:'user',posts:'document',answers:'chat',watched:'pin',market:'folder',rental:'home','market-favorites':'bookmark',bookmarks:'bookmark'}[item[0]!] || 'users'"/><span>{{ item[1] }}</span></RouterLink
            >
            <div class="profile-nav-footer">
                <RouterLink v-if="meshUser?.usertype===1" to="/admin">管理后台</RouterLink>
                <RouterLink to="/app-guide">▯ 添加到主屏幕</RouterLink
                ><RouterLink v-if="profile" :to="'/u/' + profile.userId">↗ 查看公开主页</RouterLink
                ><button @click="endSession">↪ 退出登录</button>
            </div>
        </aside>
        <section class="profile-content panel">
            <p v-if="error" class="error">{{ error }}</p>
            <div v-else-if="!profile && !meshUser && !publicPage" class="empty">
                <h3>登录后查看个人中心</h3>
                <button class="primary" @click="authDialog = 'login'">登录</button>
            </div>
            <a-skeleton v-else-if="!profile" active />
            <template v-else-if="publicPage">
                <div class="public-profile-header">
                    <div class="public-profile-identity"><span class="avatar"><img v-if="profile.avatar" :src="profile.avatar" alt=""/><span v-else>{{profile.nickname?.slice(0,1)}}</span></span><div><div class="row-between"><h1>{{profile.nickname}}</h1><RouterLink v-if="profile.own" to="/profile/info" class="soft-button"><MeshIcon name="edit"/>编辑资料</RouterLink><button v-else class="primary" @click="chat">私信</button></div><p class="muted">加入于 {{profile.createdAt?.slice(0,7).replace('-','.')}}</p></div></div>
                    <p class="public-bio" :class="{muted:!profile.bio}">{{profile.bio || '此人什么都没写呢'}}</p>
                    <div class="profile-stats"><span><b>{{profile.postCounts?.qa || 0}}</b>提问</span><span><b>{{profile.stats?.answers || 0}}</b>回答</span><span><b>{{profile.stats?.reviews || 0}}</b>课程评价</span><span class="likes"><b>{{profile.stats?.likes || 0}}</b>获赞</span><span class="accepted"><b>{{profile.stats?.accepted || 0}}</b>最佳回答</span></div>
                </div>
                <div class="public-profile-tabs"><button v-for="item in [['public','帖子',profile.stats?.posts],['answers','回答',profile.stats?.answers],['reviews','评价',profile.stats?.reviews]]" :key="String(item[0])" :class="{active:publicTab===item[0]}" @click="publicTab=String(item[0])">{{item[1]}} <small>{{item[2] || 0}}</small></button></div>
                <RouterLink v-for="p in rows" :key="p.id+p.createdAt" :to="link(p.kind,p.id)" class="profile-list-item"><strong>{{p.title.replace(/<[^>]*>/g,'')}}</strong><small class="muted">{{dateText(p.createdAt)}}</small></RouterLink>
                <p v-if="!rows.length && !contentLoading" class="empty">{{publicTab==='reviews'?'暂无评价':publicTab==='answers'?'暂无回答':'暂无帖子'}}</p>
                <button class="public-back" @click="router.back()"><MeshIcon name="arrow"/>返回</button>
            </template>
            <form v-else-if="section === 'info'" class="profile-form" @submit.prevent="save">
                <div class="profile-summary-card">
                    <div class="profile-avatar-row">
                        <span class="avatar"
                            ><img v-if="profile.avatar" :src="profile.avatar" alt="头像" /><span v-else>{{
                                profile.nickname?.slice(0, 1)
                            }}</span></span
                        >
                        <div class="profile-summary-name">
                            <strong>{{ profile.nickname }}</strong
                            ><small>{{ profile.email }}</small
                            ><label class="text-button"
                                >更换头像<input type="file" accept="image/jpeg,image/png" @change="upload"
                            /></label>
                        </div>
                        <RouterLink to="/notifications" class="profile-notifications">♟ 通知</RouterLink>
                    </div>
                    <section class="badges-section">
                        <div class="row-between"><h3>🏅 我的徽章 · 选一个佩戴</h3><button type="button" class="badge-help" @click="badgeHelp=true">ⓘ 徽章说明</button></div>
                        <div class="badge-list">
                            <button
                                v-for="badge in profile.badges"
                                :key="badge.code"
                                type="button"
                                :class="{ wearing: profile.activeBadge === badge.code }"
                                :title="badge.description"
                                @click="wear(badge.code)"
                            >
                                <img v-if="['GENESIS','PIONEER'].includes(badge.code)" class="badge-art" :src="'/badges/'+badge.code.toLowerCase()+'.svg'" alt=""/><span v-else class="badge-verified">HKUer</span
                                ><small>{{ badge.code }}<br />{{ badge.name }}</small
                                ><em>{{ profile.activeBadge === badge.code ? '已佩戴' : '点击佩戴' }}</em>
                            </button>
                            <p v-if="!profile.badges?.length" class="muted">暂未获得徽章</p>
                        </div>
                    </section>
                </div>
                <div class="profile-edit-card">
                    <label>昵称<input v-model="profile.nickname" maxlength="20" required /></label
                    ><label
                        >一句话介绍 <small class="muted">（{{profile.bio?.length||0}}/100）</small><textarea
                            v-model="profile.bio"
                            rows="3"
                            maxlength="100"
                            placeholder="简单介绍一下自己，方便队友了解你"
                        /></label
                    ><div class="profile-skills"><label>技能标签 <small class="muted">（最多 10 个）</small></label><div class="selected-skills"><button v-for="skill in profile.skills" :key="skill" type="button" :aria-label="'移除技能 '+skill" @click="profile.skills=profile.skills.filter(s=>s!==skill)">{{skill}} ×</button><span v-if="!profile.skills.length" class="muted">还没有技能标签</span></div><div class="skill-suggestions"><button v-for="skill in skillSuggestions.filter(s=>!profile?.skills.includes(s))" :key="skill" type="button" :disabled="profile.skills.length>=10" @click="addSkill(skill)">+ {{skill}}</button></div><div class="row"><input v-model="skillDraft" maxlength="30" aria-label="自定义技能" placeholder="添加自定义技能" @keydown.enter.prevent="addSkill(skillDraft)"/><button type="button" :disabled="!skillDraft.trim()||profile.skills.length>=10" @click="addSkill(skillDraft)">添加</button></div></div>
                    <div class="profile-social-links">
                        <label
                            >GitHub<input
                                v-model="profile.github"
                                type="url"
                                placeholder="https://github.com/" /></label
                        ><label
                            >LinkedIn<input
                                v-model="profile.linkedin"
                                type="url"
                                placeholder="https://linkedin.com/in/"
                        /></label>
                    </div>
                    <label>个人网站<input v-model="profile.website" type="url" placeholder="https://" /></label
                    >
                    <button class="primary" :disabled="saving">{{ saving ? '保存中…' : '保存资料' }}</button>
                    <section class="verification-section">
                        <h3>港大身份认证</h3>
                        <p v-if="profile.verifiedHku" class="success">✓ 已完成 HKU 邮箱认证</p>
                        <template v-else
                            ><p class="muted">绑定 HKU 邮箱，获得认证徽章</p>
                            <div class="code-row">
                                <input v-model="hkuEmail" type="text" inputmode="email" placeholder="你的港大邮箱" aria-label="港大邮箱" :readonly="verificationBusy"/><button
                                    type="button"
                                    :disabled="verificationBusy||codeCountdown>0||!validHkuEmail"
                                    @click="sendHku"
                                >
                                    {{codeCountdown>0?codeCountdown+'s 后重发':codeSent?'重新发送':'发送验证码'}}
                                </button>
                            </div>
                            <div v-if="codeSent" class="code-row">
                                <input v-model="hkuCode" maxlength="6" inputmode="numeric" placeholder="6 位验证码" /><button
                                    type="button"
                                    :disabled="verificationBusy||!/^\d{6}$/.test(hkuCode)||!validHkuEmail"
                                    @click="verifyHku"
                                >
                                    确认认证
                                </button>
                            </div></template
                        >
                    </section>
                </div>
            </form>
            <template v-else-if="section === 'groups'"
                ><h1>我的组队</h1>
                <RouterLink
                    v-for="g in profile.groups"
                    :key="g.id"
                    :to="'/courses/' + g.courseId"
                    class="profile-list-item"
                    >{{ g.name }}</RouterLink
                >
                <p v-if="!profile.groups?.length" class="empty">还没有加入小组</p></template
            >
            <template v-else>
                <h1 v-if="['market','rental','market-favorites','bookmarks','watched'].includes(section)">{{menu.find(item=>item[0]===section)?.[1]}}</h1>
                <RouterLink v-if="section==='answers'" to="/home" class="primary answer-cta">← 去回答问题</RouterLink>
                <div v-if="section==='posts'" class="pill-row profile-post-tabs"><button v-for="item in [['qa','问答帖'],['job','求职帖'],['life','生活帖']]" :key="item[0]" :class="{active:contentFilter===item[0]}" @click="contentFilter=item[0]!">{{item[1]}} <small>{{profile.postCounts?.[item[0]!] || 0}}</small></button></div>
                <div v-if="['market','rental','bookmarks'].includes(section)" class="pill-row" :class="{'rental-profile-tabs':section==='rental'}">
                    <button v-for="item in section==='market' ? [['selling','在售'],['reserved','已预定'],['sold','已售出']] : section==='rental' ? [['listing','🏠 我的房源'],['roommate','👥 我的找室友'],['habits','⚙️ 生活习惯']] : [['','全部'],['course','课程'],['qa','问答'],['job','求职帖子'],['life','生活帖子']]" :key="item[0]" :class="{active:contentFilter===item[0]}" @click="contentFilter=item[0]!">{{item[1]}}</button>
                </div>
                <form v-if="section==='rental' && contentFilter==='habits'" class="habits-form" @submit.prevent="save">
                    <p class="muted">这些信息仅在你发布房源或找室友需求时展示，帮助潜在室友了解你</p>
                    <div class="two-columns"><label>吸烟<select v-model="profile.smoking"><option>不吸烟</option><option>偶尔</option><option>经常吸烟</option></select></label><label>作息时间<select v-model="profile.sleepSchedule"><option>早睡早起</option><option>晚睡晚起</option><option>不规律</option></select></label><label>清洁习惯<select v-model="profile.cleanliness"><option>非常爱干净</option><option>比较爱干净</option><option>卫生习惯随意</option></select></label><label>职业<select v-model="profile.occupation"><option>学生</option><option>工作</option><option>两者都有</option></select></label></div>
                    <label>自我介绍<textarea v-model="profile.bio" maxlength="100" rows="3" placeholder="简单介绍一下自己，让潜在室友更了解你..."/></label><button class="primary" :disabled="saving">{{saving?'保存中…':'保存'}}</button>
                </form>
                <template v-else><article v-for="p in rows" :key="p.id+p.createdAt" class="profile-owned-row"><RouterLink :to="link(p.kind,p.id)" class="profile-list-item"><strong>{{p.title.replace(/<[^>]*>/g,'')}}</strong><small class="muted">{{dateText(p.createdAt)}}</small></RouterLink><ContentManagement v-if="['posts','market','rental'].includes(section)" :id="p.id" @changed="loadContent();load()"/></article>
                <div v-if="!rows.length && !contentLoading" class="empty profile-empty" :class="{'answer-empty':section==='answers'}"><MeshIcon v-if="section!=='posts'" :name="section==='answers'?'empty':section==='rental'?'home':'bookmark'"/><p>{{section==='posts' ? '暂无'+({qa:'问答帖',job:'求职帖',life:'生活帖'}[contentFilter] || '帖子') : section==='answers'?'暂无回答记录':section==='watched'?'还没有蹲任何问题':section==='rental'?(contentFilter==='listing'?'还没有发布房源':'还没有发布找室友需求'):section==='market-favorites'?'暂无收藏的商品':section==='bookmarks'?'暂无收藏':'暂无商品'}}</p><RouterLink v-if="section==='answers'" to="/home" class="primary">← 去回答问题</RouterLink><RouterLink v-if="section==='rental'" :to="{path:'/create/rental',query:{type:contentFilter}}" class="primary">{{contentFilter==='listing'?'发布房源':'找室友'}}</RouterLink></div></template>
            </template>
            <p v-if="contentLoading" class="empty" role="status">加载中…</p>
            <a-pagination v-if="(publicPage || !['info', 'groups'].includes(section)) && contentTotal > 20" v-model:current="contentPage" :total="contentTotal" :page-size="20" :show-size-changer="false" :disabled="contentLoading" />
        </section>
        <MeshDialog v-model:open="badgeHelp" title="徽章说明" :width="384" name="badge-help-dialog"><div class="badge-explanations"><article><img class="badge-art" src="/badges/genesis.svg" alt=""/><div><small>GENESIS</small><h4>创世勋章</h4><p>前 200 位注册用户专属。感谢你最早加入社区，成为社区的奠基者。</p></div></article><article><img class="badge-art" src="/badges/pioneer.svg" alt=""/><div><small>PIONEER</small><h4>先驱勋章</h4><p>第 201–1000 位注册用户。作为早期开拓者，你帮助社区成长壮大。</p></div></article><article><span class="badge-verified">HKUer</span><div><h4>HKUer 认证徽章</h4><p>完成港大邮箱验证即可获得。证明你是港大的一员。</p></div></article><button class="primary full-width" @click="badgeHelp=false">知道了</button></div></MeshDialog>
    </div>
</template>
