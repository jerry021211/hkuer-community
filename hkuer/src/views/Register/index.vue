<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, SmileOutlined, MailOutlined, SafetyOutlined, CameraOutlined, LoadingOutlined } from '@ant-design/icons-vue'
import { register as registerApi, sendVerificationCode, uploadAvatar } from '@/api/user'
import Compressor from 'compressorjs'

const router = useRouter()

const registerForm = ref({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  email: '',
  verificationCode: '',
  avatar: '',
  agree: false
})

const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer: number | null = null

const avatarUploading = ref(false)
const avatarFileInput = ref<HTMLInputElement | null>(null)

// 邮箱格式验证
const validateEmail = (_rule: any, value: string) => {
  if (!value) {
    return Promise.resolve()
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return Promise.reject('邮箱格式不正确')
  }
  return Promise.resolve()
}

const triggerAvatarUpload = () => {
  avatarFileInput.value?.click()
}

const handleAvatarChange = async (e: Event) => {
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
          error: reject
        })
      })
    }

    const fileName = file.name.endsWith('.png') ? file.name.replace('.png', '.jpg') : file.name
    const url = await uploadAvatar(fileToUpload, fileName)

    if (url) {
      registerForm.value.avatar = url
      message.success('头像上传成功')
    } else {
      message.error('上传成功但未返回地址')
    }
  } catch (err: any) {
    console.error('头像上传失败:', err)
    message.error(`头像上传失败: ${err?.message || '网络错误'}`)
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

// 验证码验证
const validateVerificationCode = (_rule: any, value: string) => {
  if (!value) {
    return Promise.resolve()
  }
  if (!/^\d{6}$/.test(value)) {
    return Promise.reject('验证码为6位数字')
  }
  return Promise.resolve()
}

// 验证密码一致性
const validatePassword = async (_rule: any, value: string) => {
  if (!value) {
    return Promise.resolve()
  }
  if (value !== registerForm.value.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

// 发送验证码
const handleSendCode = async () => {
  if (!registerForm.value.email) {
    message.error('请先输入邮箱')
    return
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(registerForm.value.email)) {
    message.error('邮箱格式不正确')
    return
  }
  
  sendingCode.value = true
  try {
    await sendVerificationCode(registerForm.value.email)
    message.success('验证码已发送，请查收邮件')
    
    // 开始倒计时
    countdown.value = 60
    if (countdownTimer) {
      clearInterval(countdownTimer)
    }
    countdownTimer = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        if (countdownTimer) {
          clearInterval(countdownTimer)
          countdownTimer = null
        }
      }
    }, 1000)
  } catch (error: any) {
    message.error(error.message || '发送验证码失败，请稍后重试')
  } finally {
    sendingCode.value = false
  }
}

const onFinish = async (values: any) => {
  loading.value = true
  try {
    await registerApi(
      values.username,
      values.password,
      values.nickname,
      values.email,
      values.verificationCode,
      registerForm.value.avatar
    )
    
    message.success('注册成功！请登录')
    // 注册成功后跳转到登录页
    router.push('/login')
  } catch (error: any) {
    message.error(error.message || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

// 勾选协议校验（供模板中使用）
const agreeValidator = (_rule: any, value: boolean) => {
  return value ? Promise.resolve() : Promise.reject('请同意用户协议')
}
</script>

<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h1 class="register-title">创建账户</h1>
        <p class="register-subtitle">加入 HKUer 社区</p>
      </div>

      <a-form
        :model="registerForm"
        name="register"
        class="register-form"
        @finish="onFinish"
        @finishFailed="() => message.error('请检查表单输入')"
      >
        <div class="avatar-section">
          <div class="avatar-wrapper" @click="triggerAvatarUpload">
            <a-avatar :size="88" :src="registerForm.avatar || undefined">
              <template v-if="!registerForm.avatar" #icon>
                <UserOutlined style="font-size: 40px" />
              </template>
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
          <p class="avatar-hint">点击头像上传（可选）平台内部也可以修改</p>
        </div>

        <a-form-item
          name="username"
          :rules="[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { max: 20, message: '用户名最多20个字符' }
          ]"
        >
          <a-input
            v-model:value="registerForm.username"
            size="large"
            placeholder="用户名"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
          name="nickname"
          :rules="[
            { required: true, message: '请输入昵称' },
            { min: 1, message: '昵称至少1个字符' },
            { max: 20, message: '昵称最多20个字符' }
          ]"
        >
          <a-input
            v-model:value="registerForm.nickname"
            size="large"
            placeholder="昵称（在论坛中显示的名字）"
          >
            <template #prefix>
              <SmileOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
          name="email"
          :rules="[
            { required: true, message: '请输入邮箱' },
            { validator: validateEmail }
          ]"
        >
          <a-input
            v-model:value="registerForm.email"
            size="large"
            placeholder="邮箱"
          >
            <template #prefix>
              <MailOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
          name="verificationCode"
          :rules="[
            { required: true, message: '请输入验证码' },
            { validator: validateVerificationCode }
          ]"
        >
          <div class="verification-code-input">
            <a-input
              v-model:value="registerForm.verificationCode"
              size="large"
              placeholder="验证码（6位数字）"
              :maxlength="6"
            >
              <template #prefix>
                <SafetyOutlined />
              </template>
            </a-input>
            <a-button
              type="primary"
              size="large"
              :loading="sendingCode"
              :disabled="countdown > 0"
              @click="handleSendCode"
              class="send-code-btn"
            >
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </a-button>
          </div>
        </a-form-item>

        <a-form-item
          name="password"
          :rules="[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' }
          ]"
        >
          <a-input-password
            v-model:value="registerForm.password"
            size="large"
            placeholder="密码（至少6个字符）"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item
          name="confirmPassword"
          :rules="[
            { required: true, message: '请确认密码' },
            { validator: validatePassword }
          ]"
        >
          <a-input-password
            v-model:value="registerForm.confirmPassword"
            size="large"
            placeholder="确认密码"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item
          name="agree"
          :rules="[
            { validator: agreeValidator }
          ]"
        >
          <a-checkbox v-model:checked="registerForm.agree">
            我已阅读并同意
            <a href="#" target="_blank">《用户协议》</a>
            和
            <a href="#" target="_blank">《隐私政策》</a>
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            :loading="loading"
            class="register-button"
            block
          >
            注册
          </a-button>
        </a-form-item>

        <a-form-item>
          <div class="login-link">
            已有账户？
            <a @click="goToLogin">立即登录</a>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>


<style scoped lang="scss">
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-box {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 48px 40px;
}

.register-header {
  text-align: center;
  margin-bottom: 40px;

  .register-title {
    font-size: 32px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 8px 0;
  }

  .register-subtitle {
    font-size: 16px;
    color: #666;
    margin: 0;
  }
}

.register-form {
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-input) {
    border-radius: 8px;
  }

  :deep(.ant-input-password) {
    border-radius: 8px;
  }

  :deep(.ant-checkbox-wrapper) {
    a {
      color: #667eea;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .verification-code-input {
    display: flex;
    gap: 8px;

    :deep(.ant-input-affix-wrapper) {
      flex: 1;
    }

    .send-code-btn {
      white-space: nowrap;
      border-radius: 8px;
      min-width: 120px;
    }
  }

  .register-button {
    border-radius: 8px;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    margin-top: 8px;
  }

  .login-link {
    text-align: center;
    color: #666;
    font-size: 14px;

    a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
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

@media (max-width: 480px) {
  .register-box {
    padding: 32px 24px;
  }

  .register-header .register-title {
    font-size: 28px;
  }

  .register-form .verification-code-input {
    flex-direction: column;

    .send-code-btn {
      width: 100%;
    }
  }
}
</style>
