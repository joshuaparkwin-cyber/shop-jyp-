// ── 인증 함수 ──
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

async function registerUser(id, password, info) {
  if (id === ADMIN_ID) return { success: false, message: '사용할 수 없는 아이디입니다.' };
  return await sbRegisterUser(id, password, info);
}

async function loginUser(id, password) {
  // 관리자 계정 처리
  if (id === ADMIN_ID) {
    if (password !== ADMIN_PW) return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    sessionStorage.setItem('currentUser', JSON.stringify({ id: ADMIN_ID, name: '관리자', role: 'admin' }));
    return { success: true };
  }
  return await sbLoginUser(id, password);
}

function logoutUser() {
  sessionStorage.removeItem('currentUser');
  location.href = 'index.html';
}

async function updateUserInfo(newInfo) {
  const user = getCurrentUser();
  return await sbUpdateUserInfo(user.id, newInfo);
}

async function changePassword(currentPw, newPw) {
  const user = getCurrentUser();
  return await sbChangePassword(user.id, currentPw, newPw);
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
      <a href="inquiry.html">문의 관리</a>
      <span class="nav-greeting">관리자</span>
      <a href="#" class="nav-logout" onclick="logoutUser(); return false;">로그아웃</a>
    `;
  } else if (user) {
    nav.innerHTML = `
      <a href="index.html">홈</a>
      <a href="cart.html">장바구니 <span id="cart-count"></span></a>
      <a href="orders.html">주문내역</a>
      <a href="inquiry.html">문의</a>
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
async function saveOrder() {
  const user = getCurrentUser();
  const cart = getCart();
  if (!user || cart.length === 0) return false;
  const ok = await sbSaveOrder(user, cart);
  if (ok) saveCart([]);
  return ok;
}

async function getOrders() {
  return await sbGetOrders();
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
