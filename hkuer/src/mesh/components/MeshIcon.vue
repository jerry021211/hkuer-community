<script setup lang="ts">
defineProps<{ name: string }>()
const paths: Record<string, string> = {
    dislike: 'M7 3H3v12h4M7 13l5 8a3 3 0 0 0 2-3l-1-4h6a2 2 0 0 0 2-2l-2-8a2 2 0 0 0-2-1H7Z',
    send: 'm22 2-7 20-4-9-9-4ZM22 2 11 13',
    user: 'M20 21v-2a7 7 0 0 0-14 0v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    home: 'm3 10 9-8 9 8M5 9v12h14V9M9 21v-8h6v8',
    document: 'M5 2h10l4 4v16H5ZM14 2v6h5M8 12h8M8 16h8',
    folder: 'M2 7V5a2 2 0 0 1 2-2h5l2 3h9v3H5l-3 11h17l3-11H5',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-3.9',
    edit: 'm16 3 5 5M4 16 17 3a2 2 0 0 1 4 4L8 20l-5 1Z',
    star: 'm12 2 3.1 6.3 7 .9-5.1 5 1.2 7-6.2-3.3L5.8 21l1.2-7L2 9.2l6.9-.9Z',
    empty: 'M20 16a9 9 0 0 0-13-12M3 7a9 9 0 0 0 1 10l-2 5 6-2a9 9 0 0 0 9-1M2 2l20 20',
    search: 'M21 21l-5-5 M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
    plus: 'M12 5v14M5 12h14',
    chat: 'M21 11a9 9 0 0 1-9 9H4l-3 2 1-6A9 9 0 1 1 21 11Z',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    bookmark: 'M6 3h12v19l-6-4-6 4Z',
    share: 'M4 7h13l-4-4m4 4-4 4M20 17H7l4 4m-4-4 4-4',
    image: 'M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M8 7h.01',
    close: 'm6 6 12 12M6 18 18 6',
    arrow: 'm15 5-7 7 7 7',
    pin: 'M8 3h8l-1 7 4 4H5l4-4-1-7M12 14v8',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3M10 21h4',
    more: 'M4 12h.01M12 12h.01M20 12h.01',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
}
</script>
<template>
    <svg
        class="mesh-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path :d="paths[name] || paths.more" />
    </svg>
</template>
