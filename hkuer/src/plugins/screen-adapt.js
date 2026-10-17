// plugins/screen-adapt.js
import screenAdapt from '../utils/screen-adapt';

export const ScreenAdaptPlugin = {
    install(app, options) {
        // 初始化屏幕适配
        const scale = screenAdapt.init(options);

        // 全局注册屏幕适配工具
        app.config.globalProperties.$screenAdapt = screenAdapt;

        // 提供全局计算属性
        app.provide('screenScale', scale);

        // 添加指令
        app.directive('adapt-font', {
            mounted(el, binding) {
                const fontSize = binding.value || 14;
                const scale = screenAdapt.getScale();
                el.style.fontSize = `${fontSize * scale}px`;
            },
            updated(el, binding) {
                const fontSize = binding.value || 14;
                const scale = screenAdapt.getScale();
                el.style.fontSize = `${fontSize * scale}px`;
            }
        });
    }
};