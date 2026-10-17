<script setup lang="ts">
defineProps<{kind:string}>()
const tabs=[['qa','问答'],['job','求职'],['life','生活'],['market','二手'],['rental','租房/找房']]
</script>
<template><nav class="create-tabs" aria-label="发布类型"><RouterLink v-for="tab in tabs" :key="tab[0]" :to="'/create/'+tab[0]" :class="{selected:kind===tab[0]}">{{tab[1]}}</RouterLink></nav></template>
