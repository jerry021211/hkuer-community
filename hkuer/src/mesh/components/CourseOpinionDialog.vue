<script setup lang="ts">
import { ref, watch } from 'vue'
import MeshDialog from './MeshDialog.vue'
import StarRating from './StarRating.vue'
const props=defineProps<{open:boolean;code:string;share?:boolean;rating?:number;comment?:string}>()
const emit=defineEmits<{'update:open':[value:boolean];save:[rating:number,comment:string]}>()
const stars=ref(0),text=ref('')
watch(()=>props.open,open=>{if(open){stars.value=props.rating||0;text.value=props.comment||''}})
const phrases=['完美的课，冲就完事了！','好课！收获很多','workload适中','老师人很好很有意思，推荐','难度有点大但值得','比较水','避雷，快跑','没考勤很nice','这课很硬核，慎选','workload大，作业多','课程内容有点水，没啥收获']
</script>
<template><MeshDialog :open="open" :title="share?'生成分享卡片':code" :width="448" name="course-opinion-dialog" @update:open="emit('update:open',$event)"><form @submit.prevent="emit('save',stars,text)"><p class="opinion-intro">{{share?'给 '+code+' 加点评价再分享吧':'打分+评价后，滑动卡片完成投票'}}</p><StarRating v-model="stars" label="课程评分" :size="28"/><textarea v-model="text" maxlength="280" rows="2" :placeholder="share?'一句话评价（可选）':'写下你的课程评价（可选）'" aria-label="课程评价"/><div v-if="!share" class="opinion-counter">{{text.length}}/280</div><small v-if="share" class="opinion-caption">或选一句系统文案：</small><div class="opinion-phrases"><button v-for="phrase in phrases" :key="phrase" type="button" @click="text=phrase">{{phrase}}</button></div><footer><button type="button" @click="emit('update:open',false)">取消</button><button class="primary" :disabled="!share&&!stars">{{share?'生成分享图':'保存，再滑动投票'}}</button></footer></form></MeshDialog></template>
