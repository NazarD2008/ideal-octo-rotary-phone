const MIME_MAP = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.bin': 'application/octet-stream',
};
export function getMimeType(fileName) {
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop().toLowerCase() : '';
    return MIME_MAP[ext] || 'application/octet-stream';
}
export function validatePasswordStrength(password) {
    if (password.length < 8)
        return { valid: false, message: 'Password must be at least 8 characters' };
    if (password.length > 128)
        return { valid: false, message: 'Password must be at most 128 characters' };
    if (!/[A-Z]/.test(password))
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    if (!/[0-9]/.test(password))
        return { valid: false, message: 'Password must contain at least one digit' };
    if (!/[^A-Za-z0-9]/.test(password))
        return { valid: false, message: 'Password must contain at least one special character' };
    return { valid: true };
}
export function validateUsername(username) {
    if (username.length < 3)
        return { valid: false, message: 'Username must be at least 3 characters' };
    if (username.length > 30)
        return { valid: false, message: 'Username must be at most 30 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(username))
        return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    return { valid: true };
}
export function validateEmail(email) {
    if (!email || email.trim().length === 0)
        return { valid: false, message: 'Email is required' };
    if (email.length > 254)
        return { valid: false, message: 'Email must be at most 254 characters' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
        return { valid: false, message: 'Invalid email format' };
    return { valid: true };
}
export function parseSizeString(str) {
    if (!str || typeof str !== 'string')
        return 0;
    const match = str.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)$/i);
    if (!match)
        return 0;
    const num = parseFloat(match[1]);
    if (!isFinite(num))
        return 0;
    const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5 };
    const unit = match[2].toUpperCase();
    return num * (units[unit] || 1);
}
export function normalizePermissions(data) {
    let rawPerms = [];
    if (Array.isArray(data)) {
        rawPerms = data;
    }
    else if (data && Array.isArray(data.permissions)) {
        rawPerms = data.permissions;
    }
    return rawPerms.map((item) => {
        if (typeof item === 'string') {
            return { permission: item, allowed: true };
        }
        const obj = item;
        return {
            permission: (obj.permission || obj.name || String(item)),
            allowed: obj.allowed !== undefined ? !!obj.allowed : true,
        };
    });
}
function normalizePhoneList(data, listKey) {
    let list = [];
    if (Array.isArray(data)) {
        list = data;
    }
    else if (data && Array.isArray(data[listKey])) {
        list = data[listKey];
    }
    return list.map((item) => {
        const obj = item;
        return {
            ...obj,
            number: obj.number || obj.phone || obj.phoneNo || '',
            phone: obj.phone || obj.number || obj.phoneNo || '',
        };
    });
}
export function normalizeCalls(data) {
    return normalizePhoneList(data, 'callsList');
}
export function normalizeContacts(data) {
    return normalizePhoneList(data, 'contactsList');
}
export function normalizeFileList(data) {
    let list = [];
    if (Array.isArray(data)) {
        list = data;
    }
    else if (data && Array.isArray(data.list)) {
        list = data.list;
    }
    return list.map((item) => {
        const normalized = { ...item };
        if (normalized.isDirectory === undefined && normalized.isDir !== undefined) {
            normalized.isDirectory = !!normalized.isDir;
        }
        if (normalized.isDirectory === undefined) {
            normalized.isDirectory = false;
        }
        if (normalized.lastModified && typeof normalized.lastModified === 'number') {
            normalized.date = new Date(normalized.lastModified).toLocaleString();
        }
        else if (normalized.lastModified) {
            normalized.date = String(normalized.lastModified);
        }
        return normalized;
    });
}
export function normalizeDeviceInfo(data) {
    if (!data || typeof data !== 'object')
        return data;
    const info = { ...data };
    if (info.storage && typeof info.storage === 'object') {
        const s = { ...info.storage };
        if (s.internalTotal !== undefined && s.total === undefined) {
            s.total = parseSizeString(s.internalTotal);
            s.used = parseSizeString(s.internalUsed);
            s.free = parseSizeString(s.internalFree);
        }
        info.storage = s;
    }
    if (info.memory && typeof info.memory === 'object') {
        const m = { ...info.memory };
        if (typeof m.total === 'string')
            m.total = parseSizeString(m.total);
        if (typeof m.used === 'string')
            m.used = parseSizeString(m.used);
        if (m.free === undefined && m.available !== undefined) {
            m.free = typeof m.available === 'string' ? parseSizeString(m.available) : m.available;
        }
        info.memory = m;
    }
    if (info.battery && typeof info.battery === 'object') {
        const b = { ...info.battery };
        if (b.health === undefined && b.status !== undefined) {
            b.health = b.status;
        }
        info.battery = b;
    }
    if (info.network && typeof info.network === 'object') {
        const n = { ...info.network };
        if (!n.carrier && n.networkOperatorName)
            n.carrier = n.networkOperatorName;
        if (!n.subtype && n.subtypeName)
            n.subtype = n.subtypeName;
        info.network = n;
    }
    if (info.phone && typeof info.phone === 'object') {
        const p = { ...info.phone };
        if (!p.number && p.networkOperatorName)
            p.number = p.networkOperatorName;
        if (!p.network && p.networkType)
            p.network = p.networkType;
        info.phone = p;
    }
    return info;
}
//# sourceMappingURL=helpers.js.map