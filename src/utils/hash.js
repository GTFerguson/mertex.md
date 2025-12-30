/**
 * Hash utility functions for mertex.md
 */

export function hashCode(str) {
    if (!str) return '0';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return (hash >>> 0).toString(16);
}

export function hashBase36(str) {
    if (!str) return '0';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return (hash >>> 0).toString(36);
}

export function encodeBase64(str) {
    if (typeof btoa === 'undefined') {
        return Buffer.from(str, 'utf-8').toString('base64');
    }
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return btoa(str);
    }
}

export function decodeBase64(str) {
    if (typeof atob === 'undefined') {
        return Buffer.from(str, 'base64').toString('utf-8');
    }
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        return atob(str);
    }
}

export default { hashCode, hashBase36, encodeBase64, decodeBase64 };
