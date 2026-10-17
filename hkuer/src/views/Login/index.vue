<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { login as loginApi } from '@/api/user'

const router = useRouter()
const route = useRoute()

const loginForm = ref({
  username: '',
  password: '',
  remember: false
})

const loading = ref(false)

// 检查是否是被封禁跳转过来的
const isBanned = computed(() => route.query.reason === 'banned')

const onFinish = async (values: any) => {
  loading.value = true
  try {
    // 调用登录API（内部会处理获取公钥和加密密码）
    // 登录成功后，后端会自动将token存入HttpOnly Cookie
    await loginApi(values.username, values.password)
    localStorage.setItem('last_active_time', Date.now().toString());
    
    message.success('登录成功！')
    
    // 登录成功后跳转
    const redirect = route.query.redirect as string
    router.push(redirect || '/user/home')
  } catch (error: any) {
    message.error(error.message || '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1 class="login-title">欢迎回来</h1>
        <p class="login-subtitle">登录您的 HKUer 账户</p>
      </div>

      <!-- 封禁提示 -->
      <a-alert
        v-if="isBanned"
        type="error"
        show-icon
        class="banned-alert"
        message="账号已被封禁"
        description="您的账号已被管理员封禁，如有疑问请联系管理员处理。"
      />

      <a-form
        :model="loginForm"
        name="login"
        class="login-form"
        @finish="onFinish"
        @finishFailed="() => message.error('请检查表单输入')"
      >
        <a-form-item
          name="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input
            v-model:value="loginForm.username"
            size="large"
            placeholder="用户名"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="loginForm.password"
            size="large"
            placeholder="密码"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item>
          <div class="login-form-extra">
            <a-checkbox v-model:checked="loginForm.remember">
              记住我
            </a-checkbox>
            <a class="forgot-password" href="#">忘记密码？</a>
          </div>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            :loading="loading"
            class="login-button"
            block
          >
            登录
          </a-button>
        </a-form-item>

        <a-form-item>
          <div class="register-link">
            还没有账户？
            <a @click="goToRegister">立即注册</a>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>


<style scoped lang="scss">
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 48px 40px;
}

.banned-alert {
  margin-bottom: 24px;
  border-radius: 8px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;

  .login-title {
    font-size: 32px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 8px 0;
  }

  .login-subtitle {
    font-size: 16px;
    color: #666;
    margin: 0;
  }
}

.login-form {
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-input) {
    border-radius: 8px;
  }

  :deep(.ant-input-password) {
    border-radius: 8px;
  }

  .login-form-extra {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .forgot-password {
    color: #667eea;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .login-button {
    border-radius: 8px;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    margin-top: 8px;
  }

  .register-link {
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

@media (max-width: 480px) {
  .login-box {
    padding: 32px 24px;
  }

  .login-header .login-title {
    font-size: 28px;
  }
}
</style>

