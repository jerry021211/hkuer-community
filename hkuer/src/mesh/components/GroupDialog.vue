<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { courses, type GroupDetail } from '../course-api'
import MeshDialog from './MeshDialog.vue'
import GroupFields from './GroupFields.vue'
const props=defineProps<{id:string}>()
const emit=defineEmits<{close:[];changed:[]}>()
const group=ref<GroupDetail>(), error=ref(''), busy=ref(false), editing=ref(false)
let sequence=0
async function load(){const current=++sequence;error.value='';group.value=undefined;try{const data=await courses.groupDetail(props.id);if(current===sequence)group.value=data}catch(e){if(current===sequence)error.value=(e as Error).message}}
watch(()=>props.id,load,{immediate:true})
async function act(type:'save'|'remove'|'close'|'leave',member?:string){
    if(!group.value||busy.value)return
    busy.value=true;error.value=''
    try{
        if(type==='save')await courses.updateGroup(props.id,{name:group.value.name,description:group.value.description,capacity:group.value.capacity,skills:group.value.skills,wechat:group.value.wechat,contactNote:group.value.contactNote})
        else if(type==='remove')await courses.removeMember(props.id,member!)
        else if(type==='close')await courses.closeGroup(props.id)
        else await courses.joinGroup(props.id,false)
        emit('changed');message.success(type==='save'?'修改已保存':type==='close'?'小组已解散':type==='leave'?'已退出小组':'成员已移除')
        if(type==='close'||type==='leave')emit('close')
        else {editing.value=false;await load()}
    }catch(e){error.value=(e as Error).message}finally{busy.value=false}
}
</script>
<template><MeshDialog :open="true" :title="group?.name || '小组详情'" name="group-detail-dialog" @update:open="!$event && emit('close')">
    <div class="group-dialog-body"><p v-if="error" class="error" role="alert">{{error}}</p><button v-if="!group&&error" @click="load">重试</button><a-skeleton v-if="!group&&!error" active/>
    <template v-if="group"><form v-if="editing" class="modal-form" @submit.prevent="act('save')"><GroupFields :form="group"/><button class="primary" :disabled="busy">保存修改</button><button type="button" :disabled="busy" @click="editing=false;load()">取消</button></form>
    <template v-else><p>{{group.description || '暂无介绍'}}</p><div class="selected-skills"><span v-for="skill in group.skills" :key="skill">{{skill}}</span></div><section v-if="group.wechat||group.contactNote" class="group-contact-info"><h4>🔒 成员专属信息</h4><p v-if="group.wechat">微信号：{{group.wechat}}</p><p v-if="group.contactNote">微信群链接 / 说明：{{group.contactNote}}</p></section><div class="row-between"><h3>小组成员 {{group.members.length}} / {{group.capacity}}</h3><button v-if="group.own" @click="editing=true">编辑小组</button></div><div v-for="member in group.members" :key="member.userId" class="group-member"><RouterLink :to="'/u/'+member.userId" @click="emit('close')"><span class="avatar"><img v-if="member.avatar" :src="member.avatar" alt=""/><span v-else>{{member.nickname?.slice(0,1)}}</span></span>{{member.nickname}} <small v-if="member.owner">组长</small></RouterLink><a-popconfirm v-if="group.own&&!member.owner" title="将这名成员移出小组？" ok-text="移出" cancel-text="取消" @confirm="act('remove',member.userId)"><button :disabled="busy">移出</button></a-popconfirm></div></template></template></div>
    <footer v-if="group&&!editing" class="mesh-dialog-footer"><a-popconfirm v-if="group.own" title="解散后小组将关闭，所有成员都无法继续加入。确认解散？" ok-text="解散" cancel-text="取消" @confirm="act('close')"><button class="error" :disabled="busy">解散小组</button></a-popconfirm><a-popconfirm v-else title="确定退出这个小组？" ok-text="退出" cancel-text="取消" @confirm="act('leave')"><button :disabled="busy">退出小组</button></a-popconfirm><button @click="emit('close')">关闭</button></footer>
</MeshDialog></template>
