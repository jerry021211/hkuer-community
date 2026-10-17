<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { contentApi, type MeshPost } from '../api'
import { meshUser, authDialog } from '../session'
import CreatePage from './CreatePage.vue'
import CommerceCreatePage from './CommerceCreatePage.vue'
const route = useRoute(), post = ref<MeshPost>(), error = ref(''), loading = ref(false)
let sequence = 0
async function load() {
    const current = ++sequence
    post.value = undefined; error.value = ''
    if (!meshUser.value) return
    loading.value = true
    try {
        const result = await contentApi.editable(String(route.params.id))
        if (current === sequence) post.value = result
    } catch (e) { if (current === sequence) error.value = (e as Error).message }
    finally { if (current === sequence) loading.value = false }
}
watch(() => [route.params.id, meshUser.value?.userId], load, { immediate: true })
</script>
<template>
    <div v-if="!meshUser" class="panel empty"><p>登录后编辑自己的内容</p><button class="primary" @click="authDialog='login'">登录</button></div>
    <div v-else-if="error" class="panel empty"><p class="error" role="alert">{{error}}</p><button @click="load">重试</button><RouterLink to="/profile/posts">返回个人中心</RouterLink></div>
    <a-skeleton v-else-if="loading || !post" active />
    <CommerceCreatePage v-else-if="['market','rental'].includes(post.kind)" :key="post.id" :initial="post" />
    <CreatePage v-else :key="post.id" :initial="post" />
</template>
