<script setup lang="ts">
import { ref, watch } from 'vue'
import MeshDialog from './MeshDialog.vue'
const props=defineProps<{open:boolean;images:string[];initial?:number;title?:string}>()
const emit=defineEmits<{'update:open':[value:boolean]}>()
const index=ref(0)
watch(()=>props.open,open=>{if(open)index.value=Math.min(props.initial||0,Math.max(0,props.images.length-1))})
function slide(step:number){if(props.images.length)index.value=(index.value+step+props.images.length)%props.images.length}
</script>
<template><MeshDialog :open="open" :title="title||'查看图片'" :width="1600" name="image-viewer" @update:open="emit('update:open',$event)" @keydown.left.prevent="slide(-1)" @keydown.right.prevent="slide(1)"><div class="image-viewer-body"><img :src="images[index]" :alt="title||'图片预览'"/><template v-if="images.length>1"><button class="gallery-prev" aria-label="上一张图片" @click="slide(-1)">‹</button><button class="gallery-next" aria-label="下一张图片" @click="slide(1)">›</button><span class="gallery-counter">{{index+1}} / {{images.length}}</span></template></div></MeshDialog></template>
