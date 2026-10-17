// utils/screen-adapt.js
export default {
    // 初始化屏幕自适应
    init(options = {}) {
        const {
            designWidth = 1920,
            designHeight = 1080,
            maxScale = 1.5,
            minScale = 0.5,
            target = document.body
        } = options;

        // 计算缩放比例
        const calculateScale = () => {
            const clientWidth = window.innerWidth;
            const clientHeight = window.innerHeight;

            // 计算宽高比
            const widthRatio = clientWidth / designWidth;
            const heightRatio = clientHeight / designHeight;

            // 取较小的缩放比例，确保内容完整显示
            let scale = Math.min(widthRatio, heightRatio);

            // 限制最大和最小缩放比例
            scale = Math.min(scale, maxScale);
            scale = Math.max(scale, minScale);

            return scale;
        };

        // 应用缩放
        const applyScale = () => {
            const scale = calculateScale();
            target.style.transform = `scale(${scale})`;
            target.style.transformOrigin = 'top left';
            target.style.width = `${designWidth}px`;
            target.style.height = `${designHeight}px`;
            target.style.margin = '0 auto';

            // 存储缩放比例，方便组件使用
            document.documentElement.style.setProperty('--screen-scale', scale);

            return scale;
        };

        // 初始化应用缩放
        const currentScale = applyScale();

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            requestAnimationFrame(applyScale);
        });

        return currentScale;
    },

    // 获取当前缩放比例
    getScale() {
        return parseFloat(document.documentElement.style.getPropertyValue('--screen-scale')) || 1;
    }
};