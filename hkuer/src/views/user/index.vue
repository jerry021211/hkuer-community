<script lang="ts" setup>
// 引入所需的 Ant Design Vue 组件和自定义组件
import { RouterView, useRouter } from 'vue-router';
import { onMounted, ref} from 'vue';
import AppHeader from '@/components/Header/index.vue';
import AppSider from '@/components/Sider/index.vue';
const router = useRouter();

</script>

<template>
  <a-layout  class="work-body">
    <AppHeader>
    </AppHeader>
    <a-layout>
      <AppSider width="260px" height="100vh" >
      </AppSider>
      <a-layout style="padding: 0 24px 24px">
        <a-layout-content
          :style="{ background: 'transparent', padding: '24px', margin: 0, minHeight: '280px' }"
        >
          <RouterView />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<style scoped lang="scss">
.work-body {
  height: 100vh;
  background-color: #ffffff;
  overflow-y: hidden;
  overflow-x: auto;
  
}
</style>
