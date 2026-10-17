<script setup lang="ts">
import { useRoute } from 'vue-router'
import MarketDetail from '../components/MarketDetail.vue'
const route=useRoute()
</script>
<template><MarketDetail :id="String(route.params.id)" standalone/></template>
