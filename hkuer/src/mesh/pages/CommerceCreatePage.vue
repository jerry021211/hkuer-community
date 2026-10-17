<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import Compressor from 'compressorjs'
import { api } from '@/utils/request'
import { contentApi, type MeshPost } from '../api'
import { requireSession } from '../session'
import CreateTabs from '../components/CreateTabs.vue'
import {regions} from '../regions'
const props=defineProps<{initial?:MeshPost}>()
type BatchItem={url:string;title:string;price:number|null;negotiable:boolean;content:string;brand:string;tradeLocation:string;tags:string[];key:string;signature:string;state:'draft'|'saving'|'saved'|'pending'|'failed'|'uncertain';error:string;id?:string}
function newItem(url:string):BatchItem{return {url,title:'',price:null,negotiable:false,content:'',brand:'',tradeLocation:'',tags:[],key:'',signature:'',state:'draft',error:''}}
const route = useRoute(),
    router = useRouter(),
    market = computed(() => (props.initial?.kind || route.params.kind) === 'market'),
    busy = ref(false),
    uploading = ref(false),
    error = ref(''),
    items = ref<BatchItem[]>([])
const form = reactive({
    kind: market.value ? 'market' : 'rental',
    rentalType: ['listing','roommate','wanted'].includes(String(route.query.type))?String(route.query.type):'listing',
    title: '',
    content: '',
    images: [] as string[],
    tags: [] as string[],
    region: '',
    price: null as number | null,
    negotiable: false,
    tradeLocation: '',
    brand: '',
    conditionLabel: '',
    rent: null as number | null,
    budgetMin: null as number | null,
    budgetMax: null as number | null,
    approximate: false,
    roomTypes: [] as string[],
    leaseTerm: '',
    moveIn: '',
    gender: '',
    habits: [] as string[]
})
if(props.initial){
    for(const key of Object.keys(form) as (keyof typeof form)[]){
        const value=props.initial[key as keyof MeshPost]
        if(value!==undefined&&value!==null)Object.assign(form,{[key]:Array.isArray(value)?[...value]:value})
    }
    form.moveIn=form.moveIn.slice(0,10)
}
const savedCount=computed(()=>items.value.filter(i=>['saved','pending'].includes(i.state)).length)
const pendingCount=computed(()=>items.value.filter(i=>i.state==='pending').length)
const habitOptions = ['不吸烟', '作息规律', '爱干净', '安静', '不常带人回家', '接受宠物', '学生优先']
async function upload(e: Event) {
    const input = e.target as HTMLInputElement,
        files = Array.from(input.files || []),
        limit = market.value ? (props.initial?9:20) : 3
    if (files.length + (market.value&&!props.initial ? items.value.length : form.images.length) > limit) {
        message.error(`最多 ${limit} 张图片`)
        return
    }
    uploading.value = true
    try {
        for (const file of files) {
            let uploadFile = file
            if (market.value) {
                let compressed: File | Blob = file
                for (const width of [1400, 1100, 850, 650, 450]) {
                    compressed = await new Promise<File | Blob>(
                        (resolve, reject) =>
                            new Compressor(file, {
                                quality: 0.65,
                                maxWidth: width,
                                maxHeight: width,
                                mimeType: 'image/jpeg',
                                convertSize: 0,
                                success: resolve,
                                error: reject
                            })
                    )
                    if (compressed.size <= 200 * 1024) break
                }
                if (compressed.size > 200 * 1024) throw new Error('图片压缩后仍超过 200KB，请选择较小的图片')
                uploadFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            }
            const url = await contentApi.upload(uploadFile)
            if (market.value&&!props.initial) items.value.push(newItem(url))
            else form.images.push(url)
        }
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        uploading.value = false
        input.value = ''
    }
}
async function submit() {
    if (!requireSession() || busy.value) return
    busy.value = true
    error.value = ''
    try {
        if(props.initial){
            await contentApi.update(props.initial.id,{...form,moveIn:form.moveIn||null})
            message.success('修改已保存')
            await router.push({path:market.value?'/marketplace':'/rental',query:{id:props.initial.id}})
            return
        }
        if (market.value) {
            for(const item of items.value){
                if(['saved','pending'].includes(item.state))continue
                const payload=[{kind:'market',title:item.title,images:[item.url],price:item.price,negotiable:item.negotiable,content:item.content,brand:item.brand,tradeLocation:item.tradeLocation,tags:item.tags}]
                const signature=JSON.stringify(payload)
                if(signature!==item.signature){item.key=crypto.randomUUID();item.signature=signature}
                item.state='saving';item.error=''
                try{
                    const results=await api.post<{code:string;data:string}[]>('/java/mesh/market/batch',payload,{headers:{'Idempotency-Key':item.key}})
                    const result=results[0]
                    if(!result||!['200','3000'].includes(result.code))throw new Error('发布结果未确认，请重试')
                    item.id=result.data;item.state=result.code==='3000'?'pending':'saved'
                }catch(e){
                    const failure=e as Error&{code?:string}
                    item.state=['400','403','404','409'].includes(failure.code||'')?'failed':'uncertain'
                    item.error=failure.message
                    if(item.state==='uncertain')item.error+='。请重试确认结果，同一商品不会重复发布。'
                }
            }
            if(savedCount.value===items.value.length)message.success('全部商品已保存')
            else error.value='部分商品尚未完成发布，请查看下方提示后重试。已保存的商品不会重复提交。'
            return
        } else {
            await contentApi.create({ ...form, moveIn: form.moveIn || null })
        }
        router.push(market.value ? '/marketplace' : '/rental')
    } catch (e) {
        const failure = e as Error & { code?: string }
        error.value = failure.message
        if (failure.code === '3000') {
            message.info('内容已保存，等待审核')
            router.push(market.value?'/profile/marketplace':'/profile/rental')
        }
    } finally {
        busy.value = false
    }
}
</script>
<template><section class="create-flow" :class="market?'market-create':'rental-create'"><CreateTabs v-if="!initial" :kind="market?'market':'rental'"/><section class="create-page commerce-create"><header class="commerce-create-heading"><button @click="router.back()">← 返回</button><h1>{{initial?(market?'编辑商品':'编辑租房信息'):market?'发布二手':'发布'}}</h1><p v-if="!market" class="muted">发布房源或找室友需求，系统自动帮你匹配</p></header><form @submit.prevent="submit">
<div v-if="!market" class="segmented rental-tabs"><button v-for="t in [['listing','🏠 发布房源'],['roommate','♟ 发布找室友'],['wanted','🔍 找房源']]" :key="t[0]" type="button" :class="{active:form.rentalType===t[0]}" @click="form.rentalType=t[0]!">{{t[1]}}</button></div>
<template v-if="market && !initial"><p class="batch-tip">💡 每张照片 = 一个商品。上传所有照片后，依次填写信息，一键发布全部。</p><h3 class="upload-heading">📷 上传商品照片 <small class="muted">({{items.length}}/20)</small></h3><label class="upload-button">＋<small>{{uploading?'上传中…':'添加照片'}}</small><input type="file" accept="image/jpeg,image/png" multiple :disabled="uploading||busy" @change="upload"/></label><p class="upload-hint muted">支持 JPG/PNG，单张自动压缩至 200KB 以内</p><div v-if="!items.length" class="market-upload-empty"><span>▧</span><h2>上传商品照片开始发布</h2><p>每张照片对应一件商品，可一次发布多件</p></div>
<article v-for="(item,index) in items" :key="item.url" class="batch-item" :class="'batch-'+item.state"><img :src="item.url" alt="商品图片"/><fieldset :disabled="busy||['saved','pending','uncertain'].includes(item.state)"><legend>商品 {{index+1}}</legend><label>商品名称<input v-model="item.title" required maxlength="100"/></label><label>价格（HKD）<input v-model.number="item.price" type="number" min="0" max="99999999.99" step="0.01" :required="!item.negotiable"/></label><label class="check"><input v-model="item.negotiable" type="checkbox"/>价格面议</label><label>交易地点<input v-model="item.tradeLocation" maxlength="100" placeholder="例如：港大地铁站"/></label><label>品牌<input v-model="item.brand" maxlength="64" placeholder="选填"/></label><label>补充说明<textarea v-model="item.content" rows="3" maxlength="5000" placeholder="介绍物品的使用情况…"/></label><label>标签<a-select v-model:value="item.tags" mode="tags" :disabled="busy||['saved','pending','uncertain'].includes(item.state)" placeholder="选择或输入标签" :options="['家具','电器','厨具','数码','免费','书桌','椅子','床垫','宜家'].map(value=>({value}))"/></label></fieldset><button v-if="!['saved','pending','uncertain'].includes(item.state)" type="button" :disabled="busy" aria-label="移除商品" @click="items.splice(index,1)">×</button><p v-if="item.error" class="error batch-message" role="alert">{{item.error}}</p><p v-if="item.state==='saving'" class="batch-message" role="status">正在发布…</p><p v-if="item.state==='saved'||item.state==='pending'" class="success batch-message">{{item.state==='pending'?'已保存，等待审核':'已发布'}} · <RouterLink :to="'/edit/'+item.id">查看或编辑</RouterLink></p></article><div v-if="savedCount" class="batch-summary" role="status">已保存 {{savedCount}} / {{items.length}} 件<span v-if="pendingCount">，其中 {{pendingCount}} 件待审核</span>。<RouterLink to="/profile/marketplace">查看我的二手</RouterLink></div></template>
<div v-else-if="market" class="rental-form-card"><label>商品名称<input v-model="form.title" required maxlength="100"/></label><label>商品照片（1–9 张）<div class="image-upload"><div v-for="(url,index) in form.images" :key="url"><img :src="url" alt="商品图片"/><button type="button" aria-label="移除商品图片" @click="form.images.splice(index,1)">×</button></div><label v-if="form.images.length<9" class="upload-button">＋<input type="file" accept="image/jpeg,image/png" multiple :disabled="uploading||busy" @change="upload"/></label></div></label><label>价格（HKD）<input v-model.number="form.price" type="number" min="0" max="99999999.99" step="0.01" :required="!form.negotiable"/></label><label class="check"><input v-model="form.negotiable" type="checkbox"/>价格面议</label><label>交易地点<input v-model="form.tradeLocation" maxlength="100"/></label><label>品牌<input v-model="form.brand" maxlength="64"/></label><label>补充说明<textarea v-model="form.content" rows="5" maxlength="5000"/></label><label>标签<a-select v-model:value="form.tags" mode="tags"/></label></div><div v-else class="rental-form-card"><label>标题 <span class="required">*</span><input v-model="form.title" required maxlength="100" placeholder="如：坚尼地城近港大单间 月租8000"/><small class="count">{{form.title.length}}/100</small></label><label>{{form.rentalType==='roommate'?'个人简介':form.rentalType==='wanted'?'需求描述':'描述'}} <span class="required">*</span><textarea v-model="form.content" required rows="6" maxlength="5000" placeholder="描述房源情况、周边环境、合租室友信息等…"/><small class="count">{{form.content.length}}/5000</small></label><label>区域 <span v-if="form.rentalType==='listing'" class="required">*</span><select v-model="form.region" :required="form.rentalType==='listing'"><option value="">请选择区域</option><option v-for="region in regions" :key="region">{{region}}</option></select></label>
<div v-if="form.rentalType==='listing'" class="two-columns"><label>租金（HKD/月）<input v-model.number="form.rent" type="number" min="0" step="0.01" :required="!form.negotiable"/></label><div class="price-options"><label class="check"><input v-model="form.negotiable" type="checkbox"/>面议</label><label class="check"><input v-model="form.approximate" type="checkbox"/>约数</label></div></div><div v-else class="two-columns"><label>最低预算<input v-model.number="form.budgetMin" type="number" min="0" step="0.01"/></label><label>最高预算<input v-model.number="form.budgetMax" type="number" min="0" step="0.01"/></label></div>
<label v-if="form.rentalType==='listing'">房源照片（1–3 张）<div class="image-upload"><div v-for="(url,index) in form.images" :key="url"><img :src="url" alt="房源图片"/><button type="button" aria-label="移除房源图片" @click="form.images.splice(index,1)">×</button></div><label v-if="form.images.length<3" class="upload-button">＋<input type="file" accept="image/jpeg,image/png" multiple :disabled="uploading||busy" @change="upload"/></label></div></label>
<template v-if="form.rentalType!=='wanted'"><div class="two-columns"><label>入住日期<input v-model="form.moveIn" type="date"/></label><label>租期<select v-model="form.leaseTerm"><option value="">不限</option><option>短期</option><option>长期</option><option>可议</option></select></label></div><label v-if="form.rentalType==='listing'">房型<a-select v-model:value="form.roomTypes" mode="multiple" :options="['单间','主卧','次卧','客厅','整套','多间'].map(value=>({value}))"/></label><label v-if="form.rentalType==='roommate'">室友性别偏好<select v-model="form.gender"><option value="">不限</option><option value="female">女生</option><option value="male">男生</option></select></label><label>生活习惯<div class="pill-row"><button v-for="habit in habitOptions" :key="habit" type="button" :class="{active:form.habits.includes(habit)}" @click="form.habits.includes(habit)?form.habits.splice(form.habits.indexOf(habit),1):form.habits.push(habit)">{{habit}}</button></div></label></template></div>
<p v-if="error" class="error" role="alert">{{error}}</p><button v-if="initial||!market||items.length" class="primary full-width" :class="{orange:market}" :disabled="busy||uploading||(market&&!initial&&(!items.length||savedCount===items.length))">{{busy?(initial?'保存中…':'发布中…'):initial?'保存修改':market?(savedCount===items.length?'全部已保存':items.some(item=>['failed','uncertain'].includes(item.state))?'重试未完成商品':'一键发布全部'):'发布'}}</button>
</form></section></section></template>
