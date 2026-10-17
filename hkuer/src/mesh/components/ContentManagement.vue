<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { contentApi } from '../api'
const props=defineProps<{ id:string }>()
const emit=defineEmits<{ changed:[] }>()
const busy=ref(false)
async function remove(){
    if(busy.value)return
    busy.value=true
    try{await contentApi.remove(props.id);message.success('已删除');emit('changed')}
    catch(e){message.error((e as Error).message)}finally{busy.value=false}
}
</script>
<template><div class="content-management"><RouterLink :to="'/edit/'+id">编辑</RouterLink><a-popconfirm title="确定删除这条内容？删除后无法恢复。" ok-text="删除" cancel-text="取消" @confirm="remove"><button :disabled="busy">{{busy?'删除中…':'删除'}}</button></a-popconfirm></div></template>
