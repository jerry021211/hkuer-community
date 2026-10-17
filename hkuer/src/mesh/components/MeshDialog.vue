<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import MeshIcon from './MeshIcon.vue'
import { lockDialog, unlockDialog } from '../dialog-lock'
const props = withDefaults(defineProps<{ open: boolean; title: string; width?: number; name?: string }>(), { width: 512, name: '' })
const emit = defineEmits<{ 'update:open': [value: boolean]; keydown:[event:KeyboardEvent] }>()
const panel = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null
const lockKey=Symbol('mesh-dialog')
let locked = false
function close() { emit('update:open', false) }
function release() {
    if (!locked) return
    unlockDialog(lockKey)
    if(previousFocus?.isConnected)previousFocus.focus()
    locked = false
}
watch(() => props.open, async (open) => {
    if (!open) { release(); return }
    previousFocus = document.activeElement as HTMLElement
    lockDialog(lockKey)
    locked = true
    await nextTick()
    if(props.open&&locked)panel.value?.focus()
}, { immediate: true })
onUnmounted(release)
function keyboard(event: KeyboardEvent) {
    emit('keydown',event)
    if (event.key === 'Escape') { event.preventDefault(); close() }
    if (event.key !== 'Tab') return
    const items = Array.from(panel.value?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]') || []).filter(el => el.getClientRects().length)
    const first = items[0], last = items.at(-1)
    if (!first) { event.preventDefault(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.value)) { event.preventDefault(); first.focus() }
}
</script>
<template>
    <Teleport to="body">
        <div v-if="open" class="mesh-app mesh-dialog" :class="name" @click.self="close" @keydown="keyboard">
            <section ref="panel" class="mesh-dialog-panel" :style="{maxWidth:width+'px'}" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1">
                <header class="mesh-dialog-header"><h3>{{ title }}</h3><slot name="header-actions"/><button type="button" aria-label="关闭弹窗" @click="close"><MeshIcon name="close"/></button></header>
                <slot/>
            </section>
        </div>
    </Teleport>
</template>
