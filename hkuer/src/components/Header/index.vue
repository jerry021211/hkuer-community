  
<script setup lang="ts">
import { HomeFilled, EditOutlined, MessageOutlined, HeartOutlined, StarOutlined, UserOutlined, SearchOutlined, BookOutlined, CameraOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { logout as logoutApi, getProfile, updateProfile, uploadAvatar, type UserProfile } from '@/api/user';
import { getUserType } from '@/api/user'
import Compressor from 'compressorjs'

const value = ref('');
const route = useRoute();
const router = useRouter();

// 根据路由路径提取第二位作为当前选中项
const currentRoute = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean);
  const segment = pathSegments[1] || 'home';
  return segment.toLowerCase();
});

// 路由跳转函数
const navigateTo = (path: string) => {
  router.push(`/user/${path}`);
};

// 菜单点击处理
const handleMenuClick = async ({ key }: { key: string }) => {
  if (key === 'logout') {
    try {
      await logoutApi();
      message.success('退出登录成功');
      router.push('/login');
    } catch (error: any) {
      message.error(error.message || '退出登录失败');
    }
  } 
  // else if (key === 'profile') {
  //   console.log('Profile clicked');
  // } 
  else if (key === 'edit') {
    openSettingsModal()
  } else if (key === 'console') {
    router.push('/admin');
  }
};
const isAdmin = ref(false)
const userProfile = ref<UserProfile | null>(null)

async function fetchUserType() {
  try {
    const userType = await getUserType()
    isAdmin.value = userType === 1
  } catch {
    isAdmin.value = false
  }
}

async function fetchUserProfile() {
  try {
    userProfile.value = await getProfile()
  } catch (error: any) {
    console.error('获取用户信息失败:', error)
    userProfile.value = null
  }
}

onMounted(() => {
  fetchUserType()
  fetchUserProfile()
})

// ============ Settings 模态框 ============
const settingsVisible = ref(false)
const settingsNickname = ref('')
const settingsAvatar = ref('')
const avatarUploading = ref(false)
const settingsSaving = ref(false)
const avatarFileInput = ref<HTMLInputElement | null>(null)

function openSettingsModal() {
  settingsNickname.value = userProfile.value?.nickname || ''
  settingsAvatar.value = userProfile.value?.avatar || ''
  settingsVisible.value = true
}

function closeSettingsModal() {
  settingsVisible.value = false
}

function triggerAvatarUpload() {
  avatarFileInput.value?.click()
}

async function handleAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 校验文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    message.error('仅支持 JPG、PNG、GIF、WEBP 格式的图片')
    input.value = ''
    return
  }

  // 校验大小上限 10MB
  if (file.size > 10 * 1024 * 1024) {
    message.error('图片大小不能超过 10MB')
    input.value = ''
    return
  }

  avatarUploading.value = true
  try {
    let fileToUpload: File | Blob = file

    // 超过 500KB 进行压缩
    const COMPRESS_THRESHOLD = 500 * 1024
    if (file.size > COMPRESS_THRESHOLD) {
      fileToUpload = await new Promise<Blob>((resolve, reject) => {
        new Compressor(file, {
          quality: 0.6,
          maxWidth: 800,
          maxHeight: 800,
          mimeType: 'image/jpeg',
          success: resolve,
          error: reject,
        })
      })
    }

    const fileName = file.name.endsWith('.png') ? file.name.replace('.png', '.jpg') : file.name
    const url = await uploadAvatar(fileToUpload, fileName)

    if (url) {
      settingsAvatar.value = url
      message.success('头像上传成功')
    } else {
      message.error('上传成功但未返回地址')
    }
  } catch (err: any) {
    console.error('头像上传失败:', err)
    message.error(`头像上传失败: ${err?.message || '网络错误'}`)
  } finally {
    avatarUploading.value = false
    input.value = '' // 重置 input，允许重复选择相同文件
  }
}

async function handleSettingsSave() {
  if (!settingsNickname.value.trim()) {
    message.error('昵称不能为空')
    return
  }

  settingsSaving.value = true
  try {
    await updateProfile({
      nickname: settingsNickname.value.trim(),
      avatar: settingsAvatar.value,
    })
    message.success('资料更新成功')

    // 更新本地状态
    if (userProfile.value) {
      userProfile.value.nickname = settingsNickname.value.trim()
      userProfile.value.avatar = settingsAvatar.value
    }

    closeSettingsModal()
  } catch (err: any) {
    console.error('更新资料失败:', err)
    message.error(`更新失败: ${err?.message || '网络错误'}`)
  } finally {
    settingsSaving.value = false
  }
}

</script>

<template>
    <a-layout-header class="hk-header">
      <!-- 左侧：Logo / 自定义 -->
      <div class="left">
        <slot name="logo">
          <div class="brand" >
            <img src="@/assets/HKU.svg" alt="HKUer" class="logo">
            <span class="title">HKUer</span>
          </div>
        </slot>
      </div>

      <div class="center">
        <slot name="nav">
          <a-space :size="40" wrap>
            <a-button 
              type="text" 
              class="icon"
              :class="{ active: currentRoute === 'home' }"
              @click="navigateTo('home')"
            >
              <template #icon>
                <HomeFilled />
              </template>
              Home
            </a-button>
            <a-button 
              type="text" 
              class="icon"
              :class="{ active: currentRoute === 'post' }"
              @click="navigateTo('post')"
            >
              <template #icon>
              <EditOutlined /> 
              </template>
              Post
            </a-button>
            <a-button 
              type="text" 
              class="icon"
              :class="{ active: currentRoute === 'comment' }"
              @click="navigateTo('comment')"
            >
              <template #icon>
              <MessageOutlined /> 
              </template>
              Comment
            </a-button>
            <a-button 
              type="text" 
              class="icon"
              :class="{ active: currentRoute === 'like' }"
              @click="navigateTo('like')"
            >
              <template #icon>
              <HeartOutlined /> 
              </template>
              Like
            </a-button>
            <a-button 
              type="text" 
              class="icon"
              :class="{ active: currentRoute === 'favorite' }"
              @click="navigateTo('favorite')"
            >
              <template #icon>
              <StarOutlined /> 
              </template>
              Favorite
            </a-button>
            <a-button 
              type="text" 
              class="icon"
              :class="{ active: currentRoute === 'history' }"
              @click="navigateTo('history')"
            >
              <template #icon>
              <BookOutlined />
              </template>
              History
            </a-button>
          </a-space>
        </slot>
      </div>
  
      <!-- 右侧：搜索 + 操作区 / 可替换 -->
      <div class="right">
        <slot name="right">
          <a-space :size="12" align="center">
            <a-input v-model:value="value" placeholder="Search">
              <template #prefix><SearchOutlined /></template>
            </a-input>
              <a-dropdown>
              <a-avatar :size="36" style="cursor:pointer;" :src="userProfile?.avatar">
                <template v-if="!userProfile?.avatar" #icon><UserOutlined /></template>
              </a-avatar>
              <template #overlay>
                <a-menu @click="handleMenuClick">
                  <!-- <a-menu-item key="profile">Profile</a-menu-item> -->
                  <a-menu-item key="edit">Edit</a-menu-item>
                  <a-menu-item v-if="isAdmin" key="console">Console</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="logout">Logout</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </slot>
      </div>
    </a-layout-header>

    <!-- Settings 模态框 -->
    <Teleport to="body">
      <div v-if="settingsVisible" class="settings-overlay" @click.self="closeSettingsModal">
        <div class="settings-modal">
          <div class="settings-header">
            <h3 class="settings-title">个人设置</h3>
            <button class="settings-close" @click="closeSettingsModal">&times;</button>
          </div>
          <div class="settings-body">
            <!-- 头像区域 -->
            <div class="avatar-section">
              <div class="avatar-wrapper" @click="triggerAvatarUpload">
                <a-avatar :size="88" :src="settingsAvatar || undefined">
                  <template v-if="!settingsAvatar" #icon><UserOutlined style="font-size: 40px" /></template>
                </a-avatar>
                <div class="avatar-overlay" :class="{ uploading: avatarUploading }">
                  <LoadingOutlined v-if="avatarUploading" style="font-size: 22px; color: #fff" />
                  <CameraOutlined v-else style="font-size: 22px; color: #fff" />
                </div>
              </div>
              <input
                ref="avatarFileInput"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style="display: none"
                @change="handleAvatarChange"
              />
              <p class="avatar-hint">点击头像更换</p>
            </div>
            <!-- 昵称区域 -->
            <div class="nickname-section">
              <label class="field-label">昵称</label>
              <a-input
                v-model:value="settingsNickname"
                placeholder="请输入昵称"
                :maxlength="20"
                show-count
                size="large"
              />
            </div>
          </div>
          <div class="settings-footer">
            <button class="btn-cancel" @click="closeSettingsModal">取消</button>
            <button class="btn-save" :disabled="settingsSaving" @click="handleSettingsSave">
              {{ settingsSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </template>

  
  <style scoped lang="scss">
  .hk-header{
    background: transparent;
    display:flex;
    align-items:center;
    min-height: 55px;
    width: 100vw;
    padding-left: 0px; 
    border-bottom: 1px solid #e5e7eb;
  }
  .left{ justify-self:start; }
  .center{ 
    justify-self:center;
    margin-left: auto; 

  }
  .icon{
    font-size: 1.4rem;
    padding-top: 0;
    margin-top: 1.5rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  
  .icon:hover{
    background-color: #f5f7fa;
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  }
  
  .icon:hover :deep(.anticon) {
    transform: scale(1.15);
    animation: bounce 0.6s ease;
  }
  
  .icon.active{
    color: #1677ff;
    background-color: #e8f3ff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.2);
  }
  
  .icon.active:hover{
    background-color: #d6e9ff;
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 8px 20px rgba(22, 119, 255, 0.3);
  }
  
  .icon:active {
    transform: translateY(-2px) scale(1.02);
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.15) rotate(-5deg);
    }
    50% {
      transform: scale(1.2);
    }
    75% {
      transform: scale(1.15) rotate(5deg);
    }
  }
  .right{
    margin-left: auto;
  }
  .brand{ display:flex; align-items:center; gap:0px; cursor:pointer; }

  .logo{ width:3.5rem; height:3.5rem;}
  .title{ font-size:30px; font-weight:700; margin-left: 1rem;}
  @media (max-width: 992px){
    .hk-header{ grid-template-columns: 1fr auto; }
    .center{ display:none; } 
  }
  </style>

  <style>
  /* Settings 模态框样式 - 非 scoped 以便 Teleport 到 body */
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .settings-modal {
    background: #fff;
    border-radius: 16px;
    width: 420px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s ease;
    overflow: hidden;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .settings-title {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
  }

  .settings-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #999;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 0.2s;
  }

  .settings-close:hover {
    color: #333;
  }

  .settings-body {
    padding: 28px 24px;
  }

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 28px;
  }

  .avatar-wrapper {
    position: relative;
    cursor: pointer;
    border-radius: 50%;
    overflow: hidden;
    width: 88px;
    height: 88px;
  }

  .avatar-wrapper .ant-avatar {
    display: block;
  }

  .avatar-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.25s ease;
    border-radius: 50%;
  }

  .avatar-wrapper:hover .avatar-overlay,
  .avatar-overlay.uploading {
    opacity: 1;
  }

  .avatar-hint {
    margin-top: 10px;
    font-size: 13px;
    color: #999;
  }

  .nickname-section {
    margin-bottom: 8px;
  }

  .field-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 8px;
  }

  .settings-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px 20px;
    border-top: 1px solid #f0f0f0;
  }

  .btn-cancel {
    padding: 8px 20px;
    border: 1px solid #d9d9d9;
    background: #fff;
    border-radius: 8px;
    font-size: 14px;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel:hover {
    border-color: #999;
    color: #333;
  }

  .btn-save {
    padding: 8px 24px;
    border: none;
    background: linear-gradient(135deg, #1677ff, #4096ff);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-save:hover {
    background: linear-gradient(135deg, #0958d9, #1677ff);
    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.35);
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  </style>
  