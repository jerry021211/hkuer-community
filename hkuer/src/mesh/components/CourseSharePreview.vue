<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import type { Course } from '../course-api'
import { meshUser } from '../session'
import MeshDialog from './MeshDialog.vue'
const props=defineProps<{open:boolean;course:Course;rating:number;comment:string}>(),emit=defineEmits<{'update:open':[value:boolean]}>()
const image=ref(''),error=ref('')
let sequence=0
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
async function generate(){const stamp=++sequence;image.value='';error.value='';try{
    const c=props.course,canvas=document.createElement('canvas');canvas.width=800;canvas.height=1200;const context=canvas.getContext('2d');if(!context)throw Error('当前浏览器无法生成图片');const ctx:CanvasRenderingContext2D=context
    const qr=await loadImage(await QRCode.toDataURL(location.origin+'/courses/'+c.id,{margin:1,width:150}));const logo=await loadImage('/mesh-logo.svg')
    const gradient=ctx.createLinearGradient(0,0,800,1200);gradient.addColorStop(0,'#54212c');gradient.addColorStop(1,'#101720');ctx.fillStyle=gradient;ctx.fillRect(0,0,800,1200)
    ctx.drawImage(logo,44,42,58,58);ctx.font='bold 46px sans-serif';ctx.fillStyle='#7aa6ff';ctx.fillText('HKUmesh',126,84)
    ctx.fillStyle='#195942';ctx.beginPath();ctx.roundRect(680,42,76,42,10);ctx.fill();ctx.fillStyle='#a7f3d0';ctx.font='bold 23px sans-serif';ctx.fillText(c.level==='UG'?'本科':'硕士',692,71)
    ctx.font='bold 42px sans-serif';ctx.fillStyle='#d1d5db';ctx.fillText(c.code,50,172)
    function wrap(value:string,x:number,y:number,width:number,lineHeight:number,maxLines:number){
        const chars=Array.from(value);let line='',row=1
        for(let i=0;i<chars.length;i++){
            const char=chars[i]!
            if(ctx.measureText(line+char).width>width||char==='\n'){
                if(row===maxLines){while(ctx.measureText(line+'…').width>width)line=Array.from(line).slice(0,-1).join('');ctx.fillText(line+'…',x,y);return y}
                ctx.fillText(line,x,y);y+=lineHeight;row++;line=char==='\n'?'':char
            }else line+=char
        }
        ctx.fillText(line,x,y);return y
    }
    ctx.font='bold 52px sans-serif';ctx.fillStyle='white';wrap(c.name,50,245,690,64,3)
    const count=c.recommendCount+c.dislikeCount,rate=count?Math.round(c.recommendCount/count*100):50
    ctx.font='bold 30px sans-serif';ctx.fillText(rate+'% 好评',50,465);ctx.fillStyle='#75444d';ctx.beginPath();ctx.roundRect(50,480,700,18,9);ctx.fill();if(rate){ctx.fillStyle='#6ee7b7';ctx.beginPath();ctx.roundRect(50,480,700*rate/100,18,9);ctx.fill()}
    ctx.font='24px sans-serif';ctx.fillStyle='#a8a3aa';ctx.fillText(c.recommendCount+' 人推荐',50,525);ctx.textAlign='right';ctx.fillText(c.dislikeCount+' 人不推荐',750,525);ctx.textAlign='left'
    if(props.rating){ctx.font='38px sans-serif';ctx.fillStyle='#facc15';ctx.fillText('★'.repeat(props.rating)+'☆'.repeat(5-props.rating),50,585)}
    if(props.comment){ctx.fillStyle='#ffffff0d';ctx.beginPath();ctx.roundRect(50,615,700,190,16);ctx.fill();ctx.fillStyle='#e5e7eb';ctx.font='26px sans-serif';wrap('“'+props.comment+'”',76,657,648,38,4)}
    ctx.font='bold 34px sans-serif';ctx.fillStyle='#a1a1aa';ctx.fillText(c.subject,50,875);ctx.fillStyle='#bfdbfe';ctx.font='bold 42px sans-serif';ctx.fillText('来 HKUmesh',50,940);ctx.fillText('给港大课程打分吧！',50,997);ctx.fillStyle='#d1d5db';ctx.font='26px sans-serif';ctx.fillText(location.host,50,1043)
    ctx.fillStyle='#ffffff18';ctx.fillRect(50,1100,520,1);ctx.fillStyle='#d1d5db';ctx.font='24px sans-serif';ctx.fillText(meshUser.value?.nickname||'社区同学',50,1145);ctx.drawImage(qr,610,1020,140,140);ctx.font='20px sans-serif';ctx.fillText('扫码访问',636,1185)
    if(stamp===sequence&&props.open)image.value=canvas.toDataURL('image/png')
}catch(e){if(stamp===sequence)error.value=e instanceof Error?e.message:'分享图片生成失败，请重试'}}
watch(()=>props.open,open=>{if(open)generate();else sequence++},{immediate:true})
</script>
<template><MeshDialog :open="open" title="课程分享图片" :width="416" name="course-share-preview" @update:open="emit('update:open',$event)"><p v-if="error" class="error">{{error}} <button @click="generate">重试</button></p><p v-else-if="!image" class="share-generating" role="status">图片正在生成中…</p><img v-else :src="image" :alt="course.code+' 课程分享图片'"/><footer><a v-if="image" :href="image" :download="course.code+'-课程分享.png'" class="primary">↓ 保存图片</a><button @click="emit('update:open',false)">关闭</button></footer></MeshDialog></template>
