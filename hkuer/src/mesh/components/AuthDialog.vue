<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login, register, sendVerificationCode } from '@/api/user'
import { authDialog, loadSession } from '../session'
import MeshDialog from './MeshDialog.vue'
const router = useRouter(),
    route = useRoute()
const email = ref(''),
    password = ref(''),
    username = ref(''),
    code = ref(''),
    busy = ref(false),
    error = ref(''),
    notice = ref(''),
    cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | undefined
onUnmounted(()=>clearInterval(cooldownTimer))
watch(authDialog, () => {
    error.value = ''
    notice.value = ''
})
async function sendCode() {
    if (cooldown.value) return
    try {
        cooldown.value = 60
        notice.value = await sendVerificationCode(email.value)
        cooldownTimer=setInterval(()=>{if(--cooldown.value<=0)clearInterval(cooldownTimer)},1000)
    } catch (e) {
        error.value = (e as Error).message
        cooldown.value = 0
    }
}
async function submit() {
    busy.value = true
    error.value = ''
    try {
        if (authDialog.value === 'register') {
            await register(username.value, password.value, username.value, email.value, code.value)
            authDialog.value = 'login'
            notice.value = '注册成功，请登录'
            return
        }
        await login(email.value, password.value)
        await loadSession()
        authDialog.value = null
        const redirect = String(route.query.redirect || '/home')
        if (route.path === '/login' || route.path === '/register')
            await router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/home')
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        busy.value = false
    }
}
</script>
<template>
    <MeshDialog :open="!!authDialog" title="HKUmesh" :width="384" name="auth-dialog" @update:open="authDialog=null">
        <div class="auth-tabs"><button type="button" :class="{active:authDialog==='login'}" @click="authDialog='login'">登录</button><button type="button" :class="{active:authDialog==='register'}" @click="authDialog='register'">注册</button></div>
        <form class="auth-fields" @submit.prevent="submit"><label>邮箱<input v-model="email" type="text" required autocomplete="username" placeholder="请输入邮箱"/></label>
            <template v-if="authDialog==='register'"><label>验证码<div class="code-row"><input v-model="code" required pattern="[0-9]{6}" maxlength="6" inputmode="numeric" placeholder="6位验证码"/><button type="button" :disabled="cooldown>0||!email.trim()" @click="sendCode">{{cooldown?cooldown+'秒后重发':'发送验证码'}}</button></div></label><label>用户名<input v-model="username" required maxlength="20" placeholder="设置用户名"/></label></template>
            <label>密码<input v-model="password" required type="password" :minlength="authDialog==='register'?6:1" :autocomplete="authDialog==='register'?'new-password':'current-password'" :placeholder="authDialog==='register'?'至少6位':'请输入密码'"/></label>
            <RouterLink v-if="authDialog==='login'" to="/forgot-password" class="forgot-link" @click="authDialog=null">忘记密码？</RouterLink><p v-if="error" role="alert" class="error">{{error}}</p><p v-if="notice" role="status" class="success">{{notice}}</p><button class="primary auth-submit" :disabled="busy">{{busy?'请稍候…':authDialog==='register'?'注册':'登录'}}</button>
        </form>
    </MeshDialog>
</template>
