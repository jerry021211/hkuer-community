<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { api } from '@/utils/request'
import { message } from 'ant-design-vue'
import type { Page } from '@/mesh/api'
const pinned=ref(false),announcementCategory=ref('社区公告')
const kind = ref('post'),
    current = ref(1),
    total = ref(0),
    records = ref<{ id: string; title: string; status: number }[]>([]),
    loading = ref(false),
    reason = ref(''),
    target = ref<{ id: string; status: number }>(),
    showCourse = ref(false),
    showAnnouncement = ref(false),
    course = reactive({ code: '', name: '', subtitle: '', description: '', level: 'UG', subject: '', credits: 6 }),
    title = ref(''),
    content = ref('')
const options = [
    ['post', '帖子 / 问答 / 求职 / 生活 / 二手 / 租房'],
    ['answer', '问答回答'],
    ['course', '课程'],
    ['review', '课程评价'],
    ['material', '课程资料'],
    ['group', '课程小组'],
    ['announcement', '公告']
].map(([value, label]) => ({ value, label }))
async function load() {
    loading.value = true
    try {
        const page = await api.get<Page<{ id: string; title: string; status: number }>>('/java/console/mesh/content', {
            params: { kind: kind.value, current: current.value, size: 20 }
        })
        records.value = page.records
        total.value = page.total
    } catch (e) {
        message.error((e as Error).message)
    } finally {
        loading.value = false
    }
}
watch([kind, current], load, { immediate: true })
async function moderate() {
    if (!target.value || !reason.value.trim()) return
    try {
        await api.post('/java/console/mesh/content/status', { kind: kind.value, ...target.value, reason: reason.value })
        target.value = undefined
        reason.value = ''
        await load()
    } catch (e) {
        message.error((e as Error).message)
    }
}
async function addCourse() {
    try {
        const data = { ...course }
        await api.post('/java/console/mesh/courses', data)
        showCourse.value = false
        kind.value = 'course'
        await load()
        message.success('课程已添加')
    } catch (e) {
        message.error((e as Error).message)
    }
}
async function announce() {
    try {
        await api.post('/java/console/mesh/announcements', { title: title.value, content: content.value, pinned:pinned.value, category:announcementCategory.value })
        showAnnouncement.value = false
        kind.value = 'announcement'
        await load()
    } catch (e) {
        message.error((e as Error).message)
    }
}
</script>
<template>
    <div class="mesh-admin">
        <h1>社区内容管理</h1>
        <p>统一管理新前台内容；原举报、申诉、封禁和权限管理继续使用。</p>
        <a-space class="toolbar"
            ><a-select v-model:value="kind" :options="options" style="width: 340px" /><a-button
                @click="showCourse = true"
                >新增课程</a-button
            ><a-button @click="showAnnouncement = true">发布公告</a-button></a-space
        ><a-table
            :data-source="records"
            row-key="id"
            :loading="loading"
            :pagination="false"
            :columns="[
                { title: 'ID', dataIndex: 'id' },
                { title: '标题 / 内容', dataIndex: 'title' },
                { title: '状态', key: 'status' },
                { title: '操作', key: 'action' }
            ]"
            ><template #bodyCell="{ column, record }"
                ><template v-if="column.key === 'status'"
                    ><a-tag :color="record.status === 1 ? 'green' : 'orange'">{{
                        record.status === 1 ? '公开' : record.status === 3 ? '待审核' : '已隐藏'
                    }}</a-tag></template
                ><template v-else-if="column.key === 'action'"
                    ><a-button size="small" @click="target = { id: record.id, status: record.status === 1 ? 2 : 1 }">{{
                        record.status === 1 ? '隐藏' : '恢复公开'
                    }}</a-button></template
                ></template
            ></a-table
        ><a-pagination v-model:current="current" :total="total" :page-size="20" :show-size-changer="false" />
        <a-modal
            :open="!!target"
            title="处理内容"
            @cancel="target = undefined"
            @ok="moderate"
            :ok-button-props="{ disabled: !reason.trim() }"
            ><p>请填写处理理由，操作会写入审核记录。</p>
            <a-textarea v-model:value="reason" :maxlength="500" :rows="4" /></a-modal
        ><a-modal v-model:open="showCourse" title="新增课程" @ok="addCourse"
            ><a-form layout="vertical"
                ><a-form-item label="课程编号" required
                    ><a-input v-model:value="course.code" :maxlength="32" placeholder="例如 COMP1001" /></a-form-item
                ><a-form-item label="课程名称" required
                    ><a-input v-model:value="course.name" :maxlength="200" /></a-form-item
                ><a-form-item label="中文名 / 副标题"
                    ><a-input v-model:value="course.subtitle" :maxlength="200" /></a-form-item
                ><a-form-item label="级别" required
                    ><a-select
                        v-model:value="course.level"
                        :options="[
                            { value: 'UG', label: '本科 UG' },
                            { value: 'PG', label: '研究生 PG' }
                        ]" /></a-form-item
                ><a-form-item label="学科" required
                    ><a-input v-model:value="course.subject" :maxlength="64" /></a-form-item
                ><a-form-item label="学分"
                    ><a-input-number v-model:value="course.credits" :min="0" :max="60" /></a-form-item
                ><a-form-item label="课程介绍"
                    ><a-textarea
                        v-model:value="course.description"
                        :rows="4"
                        :maxlength="5000" /></a-form-item></a-form></a-modal
        ><a-modal v-model:open="showAnnouncement" title="发布公告" @ok="announce"
            ><a-form layout="vertical"><a-form-item label="分类"><a-input v-model:value="announcementCategory" :maxlength="32"/></a-form-item><a-form-item label="置顶"><a-switch v-model:checked="pinned"/></a-form-item></a-form><a-input v-model:value="title" placeholder="标题" :maxlength="200" /><a-textarea
                v-model:value="content"
                :rows="6"
                placeholder="公告内容"
        /></a-modal>
    </div>
</template>
<style scoped>
.mesh-admin {
    text-align: left;
    background: white;
    border-radius: 16px;
    padding: 28px;
}
.mesh-admin h1 {
    margin: 0 0 12px;
}
.mesh-admin p {
    color: #7a8599;
}
.toolbar {
    margin: 16px 0;
}
.ant-pagination {
    margin-top: 20px;
}
</style>
