<script setup lang="ts">
import { useRoute } from 'vue-router'
import QuestionDetail from '../components/QuestionDetail.vue'
const route = useRoute()
</script>
<template>
    <div class="question-full-page">
        <RouterLink to="/home" class="back-link" aria-label="返回问答">‹</RouterLink><QuestionDetail :id="String(route.params.id)" />
    </div>
</template>
