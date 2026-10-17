const locks = new Set<symbol>()
let originalOverflow = ''
export function lockDialog(key: symbol) {
    if (locks.has(key)) return
    if (!locks.size) originalOverflow = document.body.style.overflow
    locks.add(key)
    document.body.style.overflow = 'hidden'
}
export function unlockDialog(key: symbol) {
    if (!locks.delete(key)) return
    if (!locks.size) document.body.style.overflow = originalOverflow
}
