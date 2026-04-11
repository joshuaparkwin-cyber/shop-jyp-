// ── 상품 데이터는 products-data.js 에서 로드됨 ──

// ── 인증 함수 ──
function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '{}');
}

function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem('currentUser') || 'null');
}

// 관리자 계정 (고정)
const ADMIN_ID = 'admin';
const ADMIN_PW = 'admin1234';

function isAdmin() {
  const user = getCurrentUser();
  return user && user.id === ADMIN_ID;
}

function registerUser(id, password, info) {
  if (id === ADMIN_ID) return { success: false, message: '사용할 수 없는 아이디입니다.' };
  const users = getUsers();
  if (users[id]) return { success: false, message: '이미 사용 중인 아이디입니다.' };
  users[id] = { password, ...info };
  localStorage.setItem('users', JSON.stringify(users));
  return { success: true };
}

function loginUser(id, password) {
  // 관리자 계정 처리
  if (id === ADMIN_ID) {
    if (password !== ADMIN_PW) return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    sessionStorage.setItem('currentUser', JSON.stringify({ id: ADMIN_ID, name: '관리자', role: 'admin' }));
    return { success: true };
  }
  const users = getUsers();
  if (!users[id] || users[id].password !== password) {
    return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }
  const { password: _pw, ...info } = users[id];
  sessionStorage.setItem('currentUser', JSON.stringify({ id, ...info }));
  return { success: true };
}

function logoutUser() {
  sessionStorage.removeItem('currentUser');
  location.href = 'index.html';
}

function updateUserInfo(newInfo) {
  const user = getCurrentUser();
  const users = getUsers();
  if (!users[user.id]) return { success: false, message: '사용자를 찾을 수 없습니다.' };
  users[user.id] = { ...users[user.id], ...newInfo };
  localStorage.setItem('users', JSON.stringify(users));
  const { password: _pw, ...info } = users[user.id];
  sessionStorage.setItem('currentUser', JSON.stringify({ id: user.id, ...info }));
  return { success: true };
}

function changePassword(currentPw, newPw) {
  const user = getCurrentUser();
  const users = getUsers();
  if (!users[user.id]) return { success: false, message: '사용자를 찾을 수 없습니다.' };
  if (users[user.id].password !== currentPw) return { success: false, message: '현재 비밀번호가 올바르지 않습니다.' };
  users[user.id].password = newPw;
  localStorage.setItem('users', JSON.stringify(users));
  return { success: true };
}

// ── 헤더 네비게이션 렌더링 ──
function renderNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const user = getCurrentUser();
  if (user && user.role === 'admin') {
    nav.innerHTML = `
      <a href="index.html">홈</a>
      <a href="admin.html">구매 목록</a>
      <span class="nav-greeting">관리자</span>
      <a href="#" class="nav-logout" onclick="logoutUser(); return false;">로그아웃</a>
    `;
  } else if (user) {
    nav.innerHTML = `
      <a href="index.html">홈</a>
      <a href="cart.html">장바구니 <span id="cart-count"></span></a>
      <a href="mypage.html">${user.name}님</a>
      <a href="#" class="nav-logout" onclick="logoutUser(); return false;">로그아웃</a>
    `;
  } else {
    nav.innerHTML = `
      <a href="index.html">홈</a>
      <a href="cart.html">장바구니 <span id="cart-count"></span></a>
      <a href="login.html">로그인</a>
    `;
  }
  updateCartCount();
}

// ── 주문 함수 ──
function getOrders() {
  return JSON.parse(localStorage.getItem('orders') || '[]');
}

function saveOrder() {
  const user = getCurrentUser();
  const cart = getCart();
  if (!user || cart.length === 0) return false;

  const orders = getOrders();
  const now = new Date();
  const dateStr = now.getFullYear() + '.' +
    String(now.getMonth() + 1).padStart(2, '0') + '.' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');

  orders.push({
    orderId: now.getTime(),
    userId: user.id,
    userName: user.name,
    items: cart.map(item => ({ name: item.name, price: item.price, qty: item.qty })),
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    date: dateStr,
  });

  localStorage.setItem('orders', JSON.stringify(orders));
  saveCart([]);
  return true;
}

// ── 장바구니 함수 ──
function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart(cart);
  updateCartCount();
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (!el) return;
  const total = getCart().reduce((sum, item) => sum + item.qty, 0);
  el.textContent = total;
  el.style.display = total > 0 ? 'inline-block' : 'none';
}
