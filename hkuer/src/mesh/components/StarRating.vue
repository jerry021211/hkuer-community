<script setup lang="ts">
withDefaults(defineProps<{ modelValue: number; label?: string; disabled?: boolean; size?: number }>(), { label: '评分', disabled: false, size: 20 })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>
<template><div class="mesh-stars" :aria-label="label"><button v-for="star in 5" :key="star" type="button" :disabled="disabled" :aria-label="`${label} ${star} 星`" :aria-pressed="star===modelValue" @click="emit('update:modelValue', star===modelValue?0:star)"><svg :width="size" :height="size" viewBox="0 0 24 24" :class="{filled:star<=modelValue}" aria-hidden="true"><path d="m12 2 3.1 6.3 7 .9-5.1 5 1.2 7-6.2-3.3L5.8 21l1.2-7L2 9.2l6.9-.9Z"/></svg></button></div></template>
