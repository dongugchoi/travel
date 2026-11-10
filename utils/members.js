// 누가 입력했는지 보여줄 이름
// 사이트 코드에 이메일을 그대로 넣지 않으려고, 이메일의 SHA-256 해시로 이름을 찾음
// (사람을 추가하려면: node -e "console.log(require('crypto').createHash('sha256').update('이메일'.toLowerCase()).digest('hex'))")
const MEMBERS = {
  '78a80547a697cc5f664da0567bb9aebd94260d8b3a72fea6957a1d689a9879a4': '동욱',
  '19f7718150e76d633d5e2bc066e72a50a8e887349469f17165d667455a84556c': '유나'
}

async function sha256 (text) {
  const data = new TextEncoder().encode(text.trim().toLowerCase())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// 이메일 → '동욱' / '유나' (목록에 없으면 null)
export async function memberName (email) {
  if (!email || typeof crypto === 'undefined' || !crypto.subtle) return null
  try {
    return MEMBERS[await sha256(email)] || null
  } catch (e) {
    return null
  }
}
