<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { contentApi, type MeshPost } from '../api'
import { requireSession } from '../session'
import Payment from '@/components/Payment/index.vue'
import CreateTabs from '../components/CreateTabs.vue'
const props = defineProps<{ initial?: MeshPost }>()
const route = useRoute(),
    router = useRouter(),
    kind = computed(() => props.initial?.kind || String(route.params.kind || 'qa'))
const title = ref(''),
    content = ref(''),
    tags = ref<string[]>(route.query.code ? [String(route.query.code)] : []),
    images = ref<string[]>([]),
    anonymous = ref(false),
    category = ref('求职经验'),
    company = ref(''),
    role = ref(''),
    region = ref(''),
    rating = ref(0),
    busy = ref(false),
    uploading = ref(false),
    error = ref(''),
    pendingId = ref(''),
    appeal = ref('')
if (props.initial) {
    const p = props.initial
    title.value=p.title; content.value=p.content; tags.value=[...p.tags]; images.value=[...p.images]
    anonymous.value=!!p.anonymous; category.value=p.category || ''; company.value=p.company || ''
    role.value=p.role || ''; region.value=p.region || ''; rating.value=p.rating || 0
}
const maxImages = computed(() => (kind.value === 'qa' ? 2 : 9)),
    names: Record<string, string> = { qa: '发布提问', job: '发布求职内容', life: '分享生活' }
const presets = [
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
async function upload(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files || [])
    if (images.value.length + files.length > maxImages.value) {
        message.error(`最多上传 ${maxImages.value} 张图片`)
        return
    }
    uploading.value = true
    try {
        for (const file of files) images.value.push(await contentApi.upload(file))
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        uploading.value = false
        input.value = ''
    }
}
async function submit() {
    if (!requireSession() || busy.value || pendingId.value) return
    busy.value = true
    error.value = ''
    try {
        const data = {
            kind: kind.value,
            courseId: props.initial?.courseId || (route.query.course ? String(route.query.course) : undefined),
            title: title.value,
            content: content.value,
            tags: tags.value,
            images: images.value,
            anonymous: anonymous.value,
            category: category.value,
            company: company.value,
            role: role.value,
            region: region.value,
            rating: rating.value || undefined
        }
        const id = props.initial ? await contentApi.update(props.initial.id, data) : await contentApi.create(data)
        if (props.initial) message.success('修改已保存')
        await router.push((kind.value==='job'?'/jobs/':kind.value==='life'?'/life/':'/question/') + id)
    } catch (e) {
        const failure = e as Error & { code?: string; data?: string }
        error.value = failure.message
        if (failure.code === '3000') pendingId.value = String(failure.data)
    } finally {
        busy.value = false
    }
}
async function submitAppeal() {
    if (!appeal.value.trim()) return
    const { api } = await import('@/utils/request')
    try {
        await api.post('/java/post/appeal/submit', { postId: pendingId.value, reason: appeal.value })
        message.success('申诉已提交')
    } catch (e) {
        message.error((e as Error).message)
    }
}
</script>
<template><section class="create-flow" :class="kind+'-create'"><CreateTabs v-if="!initial" :kind="kind"/><div class="create-page"><header class="create-heading"><button @click="router.back()">← <span v-if="kind!=='job'">返回</span></button><div><h1>{{initial?'编辑内容':kind==='qa'?'发起提问':kind==='job'?'发布求职帖':'发布生活帖'}}</h1><p v-if="kind==='qa'" class="muted">好问题能帮助更多人，写得越清楚，回答越快</p></div></header>
<form class="create-form" @submit.prevent="submit">
<div v-if="kind==='job'" class="create-category"><label>帖子类型</label><div class="job-types"><button v-for="c in [['求职经验','★ 求职经验'],['内推','➤ 内推机会'],['招聘','▣ 岗位信息'],['简历','▤ 简历互评'],['行业资讯','◈ 行业洞察']]" :key="c[0]" type="button" :class="{selected:category===c[0]}" @click="category=c[0]!">{{c[1]}}</button></div></div>
<label class="field create-title"><strong><span v-if="kind==='qa'" class="field-icon question-mark">?</span>{{kind==='qa'?'问题标题':'标题'}} <span class="required">*</span></strong><input v-model="title" required :maxlength="kind==='qa'?200:100" :placeholder="kind==='qa'?'用一句话描述你的问题（建议以问号结尾）':'一句话概括这篇帖子…'"/><small class="count">{{title.length}} / {{kind==='qa'?200:100}}</small></label>
<div v-if="kind==='job'" class="two-columns create-company"><label>公司名称<input v-model="company" maxlength="100" placeholder="如：Goldman Sachs"/></label><label>职位<input v-model="role" maxlength="100" placeholder="如：暑期实习生"/></label></div>
<label class="field create-content"><strong><span v-if="kind==='qa'" class="field-icon">☷</span>{{kind==='qa'?'补充说明':'内容'}} <span v-if="kind!=='qa'" class="required">*</span><small v-else class="muted">（可选）</small></strong><textarea v-model="content" :required="kind!=='qa'" rows="7" maxlength="5000" :placeholder="kind==='qa'?'可以补充问题的背景、已尝试过的方案、期望得到什么样的回答…':'分享你的经历、心得或信息…'"/><small v-if="kind!=='qa'" class="count">{{content.length}} / 5000</small></label>
<div class="field create-images"><strong><span class="field-icon">▧</span>{{kind==='qa'?'附图':kind==='life'?'图片':'图片'}} <small class="muted">{{kind==='qa'?'（可选，最多 2 张）':kind==='life'?'（至少1张，最多9张）':'（最多9张）'}}</small><span v-if="kind==='life'" class="required"> *</span></strong><p v-if="kind==='life'&&!images.length" class="image-tip">📷 生活帖至少要发一张图片哦，或者去发布问答帖～</p><div class="image-upload"><div v-for="(url,index) in images" :key="url"><img :src="url" alt="待发布图片"/><button type="button" aria-label="移除图片" @click="images.splice(index,1)">×</button></div><label v-if="images.length<maxImages" class="upload-button">＋<small>{{uploading?'上传中…':kind==='qa'?'选择图片':'添加图片'}}</small><input type="file" accept="image/jpeg,image/png,image/gif" multiple :disabled="uploading" @change="upload"/></label></div></div>
<div class="field create-tags"><strong><span v-if="kind==='qa'" class="field-icon">◆</span>{{kind==='qa'?'添加标签':'标签'}} <span v-if="kind==='qa'" class="required">*</span><small v-else class="muted">（最多{{kind==='life'?10:5}}个）</small></strong><div class="pill-row tag-presets"><button v-for="tag in (kind==='qa'?['选课','实习','课程','考试','GPA','编程','毕业','奖学金','宿舍','社团','交换生']:kind==='life'?['美食','攻略','打卡','租房','银行卡','拍照','hiking','新生','健身','校园','周末','探店']:presets)" :key="tag" type="button" :class="{active:tags.includes(tag)}" :disabled="!tags.includes(tag)&&tags.length>=(kind==='life'?10:5)" @click="tags.includes(tag)?tags.splice(tags.indexOf(tag),1):tags.push(tag)">{{tag}}</button></div><a-select v-model:value="tags" mode="tags" :max-tag-count="kind==='life'?10:5" aria-label="标签" placeholder="选择或输入自定义标签"/></div>
<div v-if="kind==='life'" class="two-columns create-extra"><label>地区<input v-model="region" maxlength="64" placeholder="例如：坚尼地城"/></label><label>评分（选填）<a-rate v-model:value="rating"/></label></div>
<label class="check create-anonymous"><input v-model="anonymous" type="checkbox"/>匿名发布</label><p v-if="error" role="alert" class="error create-error">{{error}}</p>
<div v-if="pendingId" class="pending-review"><p>内容已保存，正在等待审核，请勿重复发布。</p><textarea v-model="appeal" placeholder="说明申诉理由"/><button type="button" @click="submitAppeal">提交申诉</button><Payment pay-type="alipay" business-type="AD_POST_PUBLISH" :business-id="pendingId" button-text="支付发布费用" @success="router.push('/question/'+pendingId)"/><RouterLink to="/user/history">查看我的帖子</RouterLink></div>
<button class="primary full-width create-submit" :disabled="busy||uploading||!!pendingId||!title.trim()||(kind==='qa'&&!tags.length)||(kind==='life'&&!images.length)">{{busy?(initial?'保存中…':'发布中…'):initial?'保存修改':kind==='qa'?'发布提问':'发布'}}</button>
</form></div></section></template>
