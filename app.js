// ── 상품 데이터 ──
const products = [
  { id: 1, name: '상품 1', price: 12000, color: '#e8e8e8', desc: '깔끔하고 세련된 디자인의 상품입니다. 일상에서 편하게 사용할 수 있습니다.' },
  { id: 2, name: '상품 2', price: 18000, color: '#dcdcdc', desc: '고품질 소재로 제작된 상품입니다. 내구성이 뛰어나 오래 사용할 수 있습니다.' },
  { id: 3, name: '상품 3', price: 25000, color: '#d4d4d4', desc: '트렌디한 디자인의 상품입니다. 선물용으로도 훌륭합니다.' },
  { id: 4, name: '상품 4', price: 9000,  color: '#e0e0e0', desc: '합리적인 가격의 상품입니다. 가성비 최고입니다.' },
  { id: 5, name: '상품 5', price: 32000, color: '#d8d8d8', desc: '프리미엄 라인 상품입니다. 특별한 날을 위해 준비했습니다.' },
  { id: 6, name: '상품 6', price: 15000, color: '#e4e4e4', desc: '베스트셀러 상품입니다. 많은 분들이 선택하고 있습니다.' },
  { id: 7, name: '상품 7', price: 22000, color: '#d0d0d0', desc: '정성껏 만든 상품입니다. 품질을 직접 확인해보세요.' },
  { id: 8, name: '상품 8', price: 28000, color: '#cacaca', desc: '한정판 상품입니다. 수량이 제한되어 있으니 서두르세요.' },
];

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
      <span class="nav-greeting">${user.name}님</span>
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

function addToCart(productId) {
  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    const product = products.find(p => p.id === productId);
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
