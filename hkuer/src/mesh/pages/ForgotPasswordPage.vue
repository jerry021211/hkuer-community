<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/utils/request'
import { getPublicKey } from '@/api/user'
import { encryptPassword } from '@/utils/encrypt'
import { authDialog } from '../session'
const email = ref(''),
    code = ref(''),
    password = ref(''),
    sent = ref(false),
    busy = ref(false),
    error = ref(''),
    done = ref(false)
async function submit() {
    busy.value = true
    error.value = ''
    try {
        if (!sent.value) {
            await api.post('/java/mesh/public/password/code', { email: email.value })
            sent.value = true
        } else {
            const key = await getPublicKey()
            await api.post('/java/mesh/public/password/reset', {
                email: email.value,
                code: code.value,
                password: encryptPassword(password.value, key)
            })
            done.value = true
        }
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        busy.value = false
    }
}
</script>
<template>
    <section class="password-page panel">
        <h1>忘记密码</h1>
        <p class="muted">通过注册邮箱重置密码</p>
        <div v-if="done" class="empty">
            <h3>密码已重置</h3>
            <button class="primary" @click="authDialog = 'login'">重新登录</button>
        </div>
        <form v-else class="modal-form" @submit.prevent="submit">
            <label
                >邮箱<input
                    v-model="email"
                    type="email"
                    required
                    :readonly="sent"
                    placeholder="请输入注册邮箱" /></label
            ><template v-if="sent"
                ><label
                    >验证码<input
                        v-model="code"
                        maxlength="6"
                        required
                        inputmode="numeric"
                        placeholder="6 位验证码" /></label
                ><label
                    >新密码<input
                        v-model="password"
                        type="password"
                        required
                        minlength="6"
                        maxlength="72"
                        autocomplete="new-password"
                        placeholder="至少 6 位" /></label
            ></template>
            <p v-if="error" class="error">{{ error }}</p>
            <button class="primary full-width" :disabled="busy">
                {{ busy ? '请稍候…' : sent ? '重置密码' : '发送验证码' }}</button
            ><RouterLink to="/login" class="back-link">返回登录</RouterLink>
        </form>
    </section>
</template>
