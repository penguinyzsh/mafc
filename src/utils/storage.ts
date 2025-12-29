/** LocalStorage 存储键名常量 */
export const STORAGE_KEYS = {
    API_KEY: 'mafc_api_key',
    MODEL: 'mafc_model',
    THEME: 'mafc_theme',
    MESSAGES: 'mafc_messages'
};

/**
 * 保存数据到 LocalStorage
 * @param key - 存储键名
 * @param value - 要保存的值（会被 JSON 序列化）
 */
export const saveToStorage = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('LocalStorage save failed', e);
    }
};

/**
 * 从 LocalStorage 加载数据
 * @param key - 存储键名
 * @param _default - 默认值（加载失败时返回）
 * @returns 解析后的数据或默认值
 */
export const loadFromStorage = <T>(key: string, _default: T): T => {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : _default;
    } catch {
        return _default;
    }
};
