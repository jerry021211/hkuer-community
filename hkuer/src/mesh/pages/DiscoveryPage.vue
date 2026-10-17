<script setup lang="ts">
import {useRoute} from 'vue-router'
import DiscoveryDetail from '../components/DiscoveryDetail.vue'
const route=useRoute()
</script>
<template><DiscoveryDetail :id="String(route.params.id)"/></template>
