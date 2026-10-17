import JSEncrypt from 'jsencrypt'

/**
 * 使用 RSA 公钥加密密码
 * @param password 明文密码
 * @param publicKey RSA 公钥（PEM 格式，包含 BEGIN/END 标签）
 * @returns 加密后的密码（Base64 编码）
 */
export function encryptPassword(password: string, publicKey: string): string {
    const encrypt = new JSEncrypt()

    // 确保公钥格式正确
    let formattedKey = publicKey.trim()
    if (!formattedKey.includes('BEGIN')) {
        formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`
    }

    encrypt.setPublicKey(formattedKey)
    const encrypted = encrypt.encrypt(password)

    if (!encrypted) {
        throw new Error('密码加密失败')
    }

    return encrypted
}

