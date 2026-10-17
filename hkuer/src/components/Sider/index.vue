
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const internal = ref<string>(props.modelValue ?? 'home')

watch(
  () => props.modelValue,
  (v) => {
    if (v && v !== internal.value) internal.value = v
  }
)

// 根据路由路径提取第二位作为当前选中项
const routeSelected = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)
  // pathSegments[0] 是 'user'，pathSegments[1] 是我们需要的部分
  const segment = pathSegments[1] || 'home'
  return segment.toLowerCase()
})

const selected = computed(() => props.modelValue ?? routeSelected.value)

function onSelect(key: string) {
  if (props.modelValue === undefined) {
    internal.value = key
  }
  emit('update:modelValue', key)
  emit('select', key)
  
  // 路由跳转
  router.push(`/user/${key}`)
}
</script>

<template>
  <a-layout-sider class="sider" role="navigation" aria-label="Sidebar">
    <ul class="nav">
      <li class="nav-item" :class="{ active: selected === 'home' }">
        <button class="nav-link" type="button" @click="onSelect('home')">
          <slot name="home">Home</slot>
        </button>
      </li>
      <li class="nav-item" :class="{ active: selected === 'schoollife' }">
        <button class="nav-link" type="button" @click="onSelect('schoollife')">
          <slot name="school-life">School Life</slot>
        </button>
      </li>
      <li class="nav-item" :class="{ active: selected === 'learningexchange' }">
        <button class="nav-link" type="button" @click="onSelect('learningexchange')">
          <slot name="learning-exchange">Learning Exchange</slot>
        </button>
      </li>
      <li class="nav-item" :class="{ active: selected === 'employment' }">
        <button class="nav-link" type="button" @click="onSelect('employment')">
          <slot name="employment">Employment</slot>
        </button>
      </li>
      <li class="nav-item" :class="{ active: selected === 'intership' }">
        <button class="nav-link" type="button" @click="onSelect('intership')">
          <slot name="intership">Intership</slot>
        </button>
      </li>
      <li class="nav-item" :class="{ active: selected === 'treehole' }">
        <button class="nav-link" type="button" @click="onSelect('treehole')">
          <slot name="tree-hole">Tree Hole</slot>
        </button>
      </li>
      <li class="nav-item" :class="{ active: selected === 'rating' }">
        <button class="nav-link" type="button" @click="onSelect('rating')">
          <slot name="rating">Rating</slot>
        </button>
      </li>
    </ul>

    <slot />
  </a-layout-sider>
</template>

<style scoped>
.sider {
  --sider-bg: #ffffff;
  --sider-color: #333;
  --sider-hover-bg: #f5f7fa;
  --sider-active-bg: #e8f3ff;
  --sider-active-color: #1677ff;
  --sider-border-color: #e5e7eb;

  width: 220px;
  background: var(--sider-bg);
  color: var(--sider-color);
  border-right: 1px solid var(--sider-border-color);
  padding: 12px 8px;
  box-sizing: border-box;
}

.nav {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin: 4px 0;
}

.nav-link {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  color: inherit;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  outline: none;
  font-size: 18px;
}

.nav-link:hover {
  background: var(--sider-hover-bg);
}

.nav-item.active .nav-link {
  background: var(--sider-active-bg);
  color: var(--sider-active-color);
}
</style>
