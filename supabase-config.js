const SUPABASE_URL = 'https://yhixbsblmdvhnpqmrzei.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SRAhlecNA86RwPCoTG5GNA_Dow-Q63v';

const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ── 내부 헬퍼 ──
async function _sbGet(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { headers: SB_HEADERS });
  if (!res.ok) return null;
  return await res.json();
}

async function _sbPost(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: SB_HEADERS, body: JSON.stringify(data)
  });
  if (!res.ok) return null;
  return await res.json();
}

async function _sbPatch(table, query, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify(data)
  });
  return res.ok;
}

// ── 상품 ──
async function fetchProducts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=id`, { headers: SB_HEADERS });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('상품 로딩 실패:', e);
    return [];
  }
}

// ── 회원 ──
async function sbRegisterUser(id, password, info) {
  const existing = await _sbGet('users', `?id=eq.${encodeURIComponent(id)}&select=id`);
  if (existing && existing.length > 0) return { success: false, message: '이미 사용 중인 아이디입니다.' };
  const result = await _sbPost('users', { id, password, ...info });
  if (!result) return { success: false, message: '회원가입 중 오류가 발생했습니다.' };
  return { success: true };
}

async function sbLoginUser(id, password) {
  const rows = await _sbGet('users', `?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows || rows.length === 0) return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  if (rows[0].password !== password) return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  const { password: _pw, ...info } = rows[0];
  sessionStorage.setItem('currentUser', JSON.stringify(info));
  return { success: true };
}

async function sbUpdateUserInfo(userId, newInfo) {
  const ok = await _sbPatch('users', `?id=eq.${encodeURIComponent(userId)}`, newInfo);
  if (!ok) return { success: false, message: '저장 중 오류가 발생했습니다.' };
  const user = getCurrentUser();
  sessionStorage.setItem('currentUser', JSON.stringify({ ...user, ...newInfo }));
  return { success: true };
}

async function sbChangePassword(userId, currentPw, newPw) {
  const rows = await _sbGet('users', `?id=eq.${encodeURIComponent(userId)}&select=password`);
  if (!rows || rows.length === 0) return { success: false, message: '사용자를 찾을 수 없습니다.' };
  if (rows[0].password !== currentPw) return { success: false, message: '현재 비밀번호가 올바르지 않습니다.' };
  const ok = await _sbPatch('users', `?id=eq.${encodeURIComponent(userId)}`, { password: newPw });
  if (!ok) return { success: false, message: '변경 중 오류가 발생했습니다.' };
  return { success: true };
}

// ── 주문 ──
async function sbSaveOrder(user, cart) {
  const now = new Date();
  const dateStr = now.getFullYear() + '.' +
    String(now.getMonth() + 1).padStart(2, '0') + '.' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');
  const data = {
    user_id: user.id,
    user_name: user.name,
    items: cart.map(item => ({ name: item.name, price: item.price, qty: item.qty })),
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    date: dateStr
  };
  const result = await _sbPost('orders', data);
  return !!result;
}

async function sbGetOrders() {
  const rows = await _sbGet('orders', '?select=*&order=id.desc');
  return rows || [];
}

// ── 문의 ──
async function sbAddInquiry(userId, userName, title, content) {
  const result = await _sbPost('inquiries', { user_id: userId, user_name: userName, title, content });
  return !!result;
}

async function sbGetMyInquiries(userId) {
  const rows = await _sbGet('inquiries', `?user_id=eq.${encodeURIComponent(userId)}&order=id.desc`);
  return rows || [];
}

async function sbGetAllInquiries() {
  const rows = await _sbGet('inquiries', '?select=*&order=id.desc');
  return rows || [];
}

async function sbAddAnswer(inquiryId, answer) {
  return await _sbPatch('inquiries', `?id=eq.${inquiryId}`, { answer });
}
