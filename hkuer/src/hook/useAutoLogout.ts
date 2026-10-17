// src/hooks/useAutoLogout.tss
import { onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { logout } from '@/api/user';

// 配置常量
// 如果你想让“关浏览器后的有效期”和“开着网页发呆的有效期”不一样
// 可以在这里单独定义一个 OFFLINE_TIMEOUT
const TIMEOUT = 120 * 60 * 1000;
const OFFLINE_TIMEOUT = 300 * 60 * 1000;
const CHECK_INTERVAL = 2000;
const LAST_ACTIVE_KEY = 'last_active_time';

export function useAutoLogout() {
    const router = useRouter();
    const route = useRoute();

    let timer: ReturnType<typeof setInterval> | null = null;
    let lastWriteTime = 0;

    // 核心修改点 1：增加 force 参数，用于强制写入（忽略节流）
    const updateActiveTime = (e?: Event, force = false) => {
        const now = Date.now();
        // 只有在非强制模式下，才检查 1秒 的节流限制
        if (!force && now - lastWriteTime < 1000) return;
        localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
        lastWriteTime = now;
    };

    // 核心修改点 2：新增页面关闭/刷新时的监听函数
    const onBeforeUnload = () => {
        // 强制记录最后这一瞬间的时间
        updateActiveTime(undefined, true);
    };

    const doLogout = async () => {
        if (route.path === '/login') return;
        console.log('⏳ 超时自动登出，正在请求后端清除Cookie...');
        try {
            // ✅ 核心修复：调用后端接口清除 HttpOnly Cookie
            // 这个函数里已经包含了清理 userInfo 缓存的逻辑
            await logout();
        } catch (error) {
            console.error('自动登出请求失败，强制跳转', error);
        } finally {
            localStorage.removeItem(LAST_ACTIVE_KEY);
            router.push({
                path: '/login',
                query: { redirect: route.fullPath }
            });
        }
    };

    const checkTimeout = () => {
        if (route.path === '/login') return;
        const now = Date.now();
        const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0');

        if (!lastActive) {
            updateActiveTime();
            return;
        }

        if (now - lastActive > TIMEOUT) {
            doLogout();
        }
    };

    const stopDetecting = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        window.removeEventListener('click', updateActiveTime, true);
        window.removeEventListener('keydown', updateActiveTime, true);
        window.removeEventListener('mousemove', updateActiveTime, true);
        window.removeEventListener('scroll', updateActiveTime, true);

        // 记得移除 beforeunload 监听
        window.removeEventListener('beforeunload', onBeforeUnload);

        console.log('🛑 停止防发呆检测');
    };

    const startDetecting = () => {
        stopDetecting();
        updateActiveTime();
        window.addEventListener('click', updateActiveTime, true);
        window.addEventListener('keydown', updateActiveTime, true);
        window.addEventListener('mousemove', updateActiveTime, true);
        window.addEventListener('scroll', updateActiveTime, true);

        // 核心修改点 2 (续)：添加 beforeunload 监听
        // 这样用户关浏览器那一刻，时间会被记下来
        window.addEventListener('beforeunload', onBeforeUnload);

        timer = setInterval(checkTimeout, CHECK_INTERVAL);
        console.log('✅ 启动防发呆检测');
    };

    watch(
        () => route.path,
        (newPath) => {
            if (route.meta.requiresAuth === false || newPath === '/login' || newPath === '/register') {
                stopDetecting();
            } else {
                startDetecting();
            }
        },
        { immediate: true }
    );

    onUnmounted(() => {
        stopDetecting();
    });
}

// 导出检查函数 (逻辑不变，只是把 OFFLINE_TIMEOUT 用上了)
export function checkStartupTimeout(): boolean {
    const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0');
    if (!lastActive) return true;

    const now = Date.now();
    // 如果离线时间太长，返回 false
    if (now - lastActive > OFFLINE_TIMEOUT) {
        return false;
    }
    return true;
}
