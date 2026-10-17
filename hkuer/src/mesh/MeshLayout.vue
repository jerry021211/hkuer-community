<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authDialog, meshUser, loadSession, endSession, requireSession } from './session'
import AuthDialog from './components/AuthDialog.vue'
import MeshIcon from './components/MeshIcon.vue'
import './mesh.css'
import './refinements.css'
const route = useRoute(),
    router = useRouter()
const nav = [
    ['问答', '/home'],
    ['课程', '/courses'],
    ['求职', '/jobs'],
    ['生活', '/life'],
    ['二手', '/marketplace'],
    ['租房', '/rental']
]
const active = computed(() => route.path.startsWith('/create/')?String(route.params.kind):route.meta.section || '')
const immersive = computed(() => route.path === '/courses/pk' || /^\/chat\/[^/]+$/.test(route.path))
const sections = ['qa', 'course', 'job', 'life', 'market', 'rental']
const initials = computed(() => (meshUser.value?.nickname || 'U').slice(0, 1).toUpperCase())
function create() {
    if (requireSession()) router.push('/create/' + (active.value === 'course' ? 'qa' : active.value))
}
onMounted(async () => {
    try {
        await loadSession()
    } catch {
        /* Keep public pages usable when offline. */
    }
})
watch(
    () => route.path,
    () => {
        if (route.path === '/login' || route.path === '/register')
            authDialog.value = route.path === '/register' ? 'register' : 'login'
    },
    { immediate: true }
)
</script>
<template>
    <div class="mesh-app" :class="{creating:route.path.startsWith('/create/'),immersive}">
        <header v-if="!immersive" class="mesh-header">
            <div class="mesh-nav-wrap">
                <div class="nav-start">
                    <RouterLink to="/home" aria-label="HKUmesh 首页"
                        ><img src="/mesh-logo.svg" class="mesh-logo" alt="HKUmesh" /></RouterLink
                    ><button class="quick-create" aria-label="发布内容" @click="create">
                        <MeshIcon name="plus" />
                    </button>
                </div>
                <nav aria-label="主导航">
                    <RouterLink
                        v-for="(item, index) in nav"
                        :key="item[1]"
                        :to="item[1]!"
                        :class="{ selected: active === sections[index] }"
                        >{{ item[0] }}</RouterLink
                    >
                </nav>
                <div class="nav-end">
                    <RouterLink to="/chat" aria-label="私信"><MeshIcon name="chat" /></RouterLink>
                    <RouterLink v-if="meshUser" to="/profile/info" class="avatar" aria-label="个人中心"><img v-if="meshUser.avatar" :src="meshUser.avatar" alt=""/><span v-else>{{initials}}</span></RouterLink>
                    <button v-else class="primary login-button" @click="authDialog = 'login'">登录</button>
                </div>
            </div>
        </header>
        <main class="mesh-main" :class="{ wide: route.path === '/marketplace', 'question-main':route.path.startsWith('/question/') }"><RouterView :key="route.path" /></main>
        <footer v-if="!immersive" class="mesh-footer">
            <span>© {{ new Date().getFullYear() }} HKUMESH. All rights reserved.</span>
        </footer>
        <AuthDialog />
    </div>
</template>
