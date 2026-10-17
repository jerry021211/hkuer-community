<script setup lang="ts">
import { ref, shallowRef, onBeforeUnmount } from 'vue'
import { Form, Input, Radio, Button, message, Modal } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { insertPost, submitAppeal } from '@/api/post' 
// @ts-ignore - Vue 3 setup component auto-export
import Payment from '@/components/Payment/index.vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { api } from '@/utils/request'
import Compressor from 'compressorjs'

const formRef = ref<FormInstance>()

// 表单数据
const formState = ref({
  title: '',
  section: 'School Life',
  content: '', 
  keywords: undefined
})

// ========== 编辑器配置 ==========
const editorRef = shallowRef<IDomEditor>()
const editorKey = ref(0)
const mode = 'default'
const toolbarConfig: Partial<IToolbarConfig> = {
  toolbarKeys: ['uploadImage', 'insertLink', 'emotion']
}

// 完整的编辑器配置，已合并你的上传逻辑
const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入帖子内容...',
  hoverbarKeys: { image: { menuKeys: [] } },
  MENU_CONF: {
    uploadImage: {
      maxFileSize: 10 * 1024 * 1024,
      maxNumberOfFiles: 20,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
        // 定义一个唯一的 key，用于更新 loading 状态
        const loadingKey = 'upload_image_process'
        
        try {
          // 1. 开始处理提示
          message.loading({ content: '正在处理图片...', key: loadingKey, duration: 0 })

          let fileToUpload: File | Blob = file
          
          // === 优化点 1: 阈值降到 500KB ===
          const COMPRESS_THRESHOLD = 500 * 1024

          if (file.size > COMPRESS_THRESHOLD) {
            // === 优化点 2: 提示正在压缩 ===
            message.loading({ content: '图片较大，正在压缩...', key: loadingKey, duration: 0 })
            
            fileToUpload = await new Promise<Blob>((resolve, reject) => {
              new Compressor(file, {
                quality: 0.4,       // === 优化点 3: 质量降到 0.4 (足够清晰) ===
                maxWidth: 1280,     // === 优化点 4: 宽度限制 1280 (大幅减小体积) ===
                maxHeight: 1280,
                mimeType: 'image/jpeg', // 统一转为 jpeg，png转jpeg体积会骤减
                success: resolve,
                error: reject,
              })
            })
            
            // 调试用：看看压到了多大
            console.log(`压缩对比: ${(file.size/1024).toFixed(0)}KB -> ${(fileToUpload.size/1024).toFixed(0)}KB`)
          }

          // 2. 开始上传
          message.loading({ content: '正在上传...', key: loadingKey, duration: 0 })

          const formData = new FormData()
          // 必须传 file.name，否则转换后的 blob 可能丢失文件名后缀
          const fileName = file.name.endsWith('.png') ? file.name.replace('.png', '.jpg') : file.name
          formData.append('file', fileToUpload, fileName)
          formData.append('module', 'post')

          const url = await api.post<string>('/java/file/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000 // 60秒超时
          } as any)

          if (url) {
            insertFn(url, '', '')
            message.success({ content: '上传成功', key: loadingKey, duration: 2 })
          } else {
            message.error({ content: '上传成功但未返回地址', key: loadingKey })
          }

        } catch (err: any) {
          console.error(err)
          message.error({ content: `上传失败: ${err?.message || '网络错误'}`, key: loadingKey })
        }
      }
    }
  }
}

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor
}

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) editor.destroy()
})

// ========== 选项配置 ==========
const sectionOptions = [
  { label: 'School Life', value: 'School Life' },
  { label: 'Learning Exchange', value: 'Learning Exchange' },
  { label: 'Employment', value: 'Employment' },
  { label: 'Intership', value: 'Intership' },
  { label: 'Tree Hole', value: 'Tree Hole' }
]

// ========== 核心状态管理 ==========

const submitting = ref(false)
const blockedPostId = ref<string | number>('') // 存储被拦截的帖子ID

// 弹窗控制
const blockModalVisible = ref(false)  // 拦截选择弹窗 (付费or申诉)
const payModalVisible = ref(false)    // 付费弹窗
const appealModalVisible = ref(false) // 申诉弹窗
const appealReason = ref('')          // 申诉理由

// ========== 发布逻辑 (大幅修改) ==========

const handleSubmit = async () => {
  // 1. 基础校验
  if (!formState.value.title?.trim()) {
    message.warning('Title is required')
    return
  }
  const editor = editorRef.value
  const plainText = editor ? editor.getText().trim() : ''
  if (!plainText) {
    message.warning('Content is required')
    return
  }

  // 2. 提交给后端 (不再前端检测敏感词)
  submitting.value = true
  try {
    // insertPost 现在返回完整的响应对象 { code, msg, data }
    const res: any = await insertPost({
      title: formState.value.title.trim(),
      content: formState.value.content,
      boardName: formState.value.section
    })

    // === Case 1: 正常发布 (Code 200) ===
    // 注意：这里兼容了 code 是数字或字符串的情况
    if (res.code == 200) {
      message.success('Posted successfully')
      resetForm()
    } 
    // === Case 2: 敏感词拦截 (Code 3000) ===
    else if (res.code == 3000) {
      blockedPostId.value = res.data // 拿到后端返回的 postId
      blockModalVisible.value = true // 打开拦截选择弹窗
    } 
    // === Case 3: 其他错误 ===
    else {
      message.error(res.msg || 'Post failed')
    }

  } catch (e: any) {
    console.error(e)
    message.error(e?.message || 'Network Error')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  formState.value.title = ''
  formState.value.content = ''
  editorKey.value++
}

// ========== 交互逻辑处理 ==========

// 1. 选择去付费
const handleGoPay = () => {
  blockModalVisible.value = false
  payModalVisible.value = true
}

// 2. 选择去申诉
const handleGoAppeal = () => {
  blockModalVisible.value = false
  appealReason.value = ''
  appealModalVisible.value = true
}

// 3. 提交申诉
const confirmAppeal = async () => {
  if (!appealReason.value.trim()) {
    message.warning('Please enter the reason')
    return
  }
  try {
    // 调用封装好的申诉接口
    const resMsg = await submitAppeal({
      postId: Number(blockedPostId.value),
      reason: appealReason.value
    })
    message.success(resMsg || 'Appeal submitted, please wait for audit')
    appealModalVisible.value = false
    resetForm() // 申诉提交后也清空表单，因为帖子已经入库了
  } catch (e: any) {
    message.error(e.message || 'Appeal failed')
  }
}

// 4. 支付成功回调
const onPaySuccess = () => {
  payModalVisible.value = false
  message.success('Payment successful! Post is now active.')
  resetForm()
}

</script>

<template>
  <div class="release-container">
    <h2 class="title">Release Topic</h2>

    <a-form ref="formRef" :model="formState" layout="vertical" class="release-form">
      <a-form-item label="Title：" name="title" required>
        <a-input v-model:value="formState.title" placeholder="20 words or less" :maxlength="20" />
      </a-form-item>

      <a-form-item label="Section：" name="section" required>
        <div class="section-desc">Select the section you want to post in.</div>
        <a-radio-group v-model:value="formState.section">
          <a-radio v-for="option in sectionOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="Content：" name="content" required>
        <div class="editor-wrapper" :key="editorKey">
          <Toolbar class="editor-toolbar" :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" />
          <Editor class="editor-content" v-model="formState.content" :defaultConfig="editorConfig" :mode="mode" @onCreated="handleCreated" />
        </div>
      </a-form-item>

      <a-form-item>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">Release</a-button>
      </a-form-item>
    </a-form>

    <a-modal v-model:open="blockModalVisible" title="Content Review Required" :footer="null" :width="500">
      <div class="modal-body">
        <p class="warning-text">
            System detected potential promotional content (e.g., "Recruitment", "Part-time").
        </p>
        <p class="sub-text">
            Please choose an option to proceed:
        </p>
        
        <div class="action-buttons">
            <a-button @click="handleGoAppeal" class="appeal-btn">
                It's a mistake (Appeal)
            </a-button>
            
            <a-button type="primary" danger @click="handleGoPay" class="pay-btn">
                It's an Ad (Pay ¥0.02)
            </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:open="appealModalVisible" title="Submit Appeal" @ok="confirmAppeal">
        <p style="margin-bottom: 8px;">Please explain why your post is not an advertisement:</p>
        <a-textarea 
            v-model:value="appealReason" 
            placeholder="e.g. I am looking for study partners, not hiring..." 
            :rows="4" 
        />
    </a-modal>

    <a-modal v-model:open="payModalVisible" title="Promotional Post Payment" :footer="null" :width="400">
      <div class="pay-modal-content">
        <p style="color: #666; margin-bottom: 16px;">
          Pay <strong style="color: #ff4d4f; font-size: 18px;">¥0.02</strong> to publish this post.
        </p>
        <Payment
          pay-type="alipay"
          business-type="AD_POST_PUBLISH"
          :business-id="blockedPostId"
          button-text="Confirm Payment"
          @success="onPaySuccess"
        />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
/* 保持你原有的所有样式 */
.release-container {
  background: transparent;
  overflow-y: auto;
  height: calc(100vh - 90px);
  overflow-x: hidden;
  border: 1px solid #ddd;
  min-width: 1350px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: 50px;
  margin-left: -1rem;
}

.title {
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 16px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
  text-align: left;
}

.release-form {
  margin-top: 16px;
}

.section-desc {
  margin-bottom: 8px;
  color: #666;
  font-size: 13px;
}

/* Modal 样式优化 */
.modal-body {
    padding: 10px 0;
    text-align: center;
}
.warning-text {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin-bottom: 10px;
}
.sub-text {
    color: #888;
    margin-bottom: 24px;
}
.action-buttons {
    display: flex;
    justify-content: center;
    gap: 16px;
}
.appeal-btn {
    width: 160px;
}
.pay-btn {
    width: 160px;
}

/* WangEditor 样式 */
.editor-wrapper {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  z-index: 100;
  position: relative;
}
.editor-toolbar {
  border-bottom: 1px solid #d9d9d9;
}
.editor-content {
  height: 400px !important;
  overflow-y: auto;
}
:deep(.w-e-text-placeholder) {
  left: 12px !important;
  top: 10px !important;
  text-align: left !important;
  font-style: normal;
}
:deep(.w-e-text-container [contenteditable="true"]) {
  text-align: left !important;
  padding: 10px 12px !important;
  min-height: 100%;
}
.editor-wrapper {
  text-align: left !important;
}
</style>
