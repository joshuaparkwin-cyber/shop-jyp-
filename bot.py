import requests
import json
import time
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# .env 파일에서 토큰 읽기
def load_env():
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        raise FileNotFoundError(".env 파일이 없습니다. .env 파일에 TELEGRAM_TOKEN을 입력해주세요.")
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ[key.strip()] = value.strip()

load_env()
TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
API_URL = f"https://api.telegram.org/bot{TOKEN}"
PRODUCTS_JSON = os.path.join(BASE_DIR, "products.json")
PRODUCTS_JS   = os.path.join(BASE_DIR, "products-data.js")

DEFAULT_PRODUCTS = [
    {"id": 1, "name": "상품 1", "price": 12000, "color": "#e8e8e8", "desc": "깔끔하고 세련된 디자인의 상품입니다."},
    {"id": 2, "name": "상품 2", "price": 18000, "color": "#dcdcdc", "desc": "고품질 소재로 제작된 상품입니다."},
    {"id": 3, "name": "상품 3", "price": 25000, "color": "#d4d4d4", "desc": "트렌디한 디자인의 상품입니다."},
    {"id": 4, "name": "상품 4", "price": 9000,  "color": "#e0e0e0", "desc": "합리적인 가격의 상품입니다."},
    {"id": 5, "name": "상품 5", "price": 32000, "color": "#d8d8d8", "desc": "프리미엄 라인 상품입니다."},
    {"id": 6, "name": "상품 6", "price": 15000, "color": "#e4e4e4", "desc": "베스트셀러 상품입니다."},
    {"id": 7, "name": "상품 7", "price": 22000, "color": "#d0d0d0", "desc": "정성껏 만든 상품입니다."},
    {"id": 8, "name": "상품 8", "price": 28000, "color": "#cacaca", "desc": "한정판 상품입니다."},
]

# ── 상품 데이터 읽기/쓰기 ──

def load_products():
    if not os.path.exists(PRODUCTS_JSON):
        save_products(DEFAULT_PRODUCTS)
        return DEFAULT_PRODUCTS
    with open(PRODUCTS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)

def save_products(products):
    # products.json 저장
    with open(PRODUCTS_JSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    # 웹사이트용 products-data.js 자동 재생성
    js_lines = ["const products = ["]
    for p in products:
        js_lines.append(
            f"  {{ id: {p['id']}, name: '{p['name']}', price: {p['price']}, "
            f"color: '{p['color']}', desc: '{p['desc']}' }},"
        )
    js_lines.append("];\n")
    with open(PRODUCTS_JS, "w", encoding="utf-8") as f:
        f.write("\n".join(js_lines))

# ── 텔레그램 API ──

def get_updates(offset=None):
    try:
        res = requests.get(
            f"{API_URL}/getUpdates",
            params={"timeout": 30, "offset": offset},
            timeout=35
        )
        return res.json()
    except Exception as e:
        print(f"업데이트 수신 오류: {e}")
        return {"result": []}

def send(chat_id, text):
    requests.post(
        f"{API_URL}/sendMessage",
        json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    )

# ── 명령어 처리 ──

def handle(message):
    chat_id = message["chat"]["id"]
    text = message.get("text", "").strip()

    # /start 또는 /도움말
    if text in ["/start", "/도움말"]:
        send(chat_id,
            "🛍 <b>쇼핑몰 관리 봇</b>\n\n"
            "<b>/목록</b>\n"
            "  전체 상품 보기\n\n"
            "<b>/추가 이름 가격 설명</b>\n"
            "  예: /추가 에코백 25000 친환경 소재의 에코백\n\n"
            "<b>/삭제 번호</b>\n"
            "  예: /삭제 3"
        )

    # /목록
    elif text.startswith("/목록"):
        products = load_products()
        if not products:
            send(chat_id, "등록된 상품이 없습니다.")
            return
        lines = [f"{p['id']}. <b>{p['name']}</b> — {p['price']:,}원" for p in products]
        send(chat_id, "\n".join(lines))

    # /추가 이름 가격 설명
    elif text.startswith("/추가"):
        parts = text.split(" ", 3)
        if len(parts) < 3:
            send(chat_id, "사용법: /추가 이름 가격 설명\n예: /추가 에코백 25000 친환경 소재입니다")
            return
        name = parts[1]
        try:
            price = int(parts[2])
        except ValueError:
            send(chat_id, "가격은 숫자만 입력하세요. 예: 25000")
            return
        desc = parts[3] if len(parts) > 3 else f"{name}입니다."
        products = load_products()
        new_id = max((p["id"] for p in products), default=0) + 1
        products.append({"id": new_id, "name": name, "price": price, "color": "#e0e0e0", "desc": desc})
        save_products(products)
        send(chat_id, f"✅ '{name}' 상품 추가 완료! (번호: {new_id})\n웹사이트 새로고침하면 반영됩니다.")

    # /삭제 번호
    elif text.startswith("/삭제"):
        parts = text.split()
        if len(parts) < 2:
            send(chat_id, "사용법: /삭제 번호\n예: /삭제 3")
            return
        try:
            del_id = int(parts[1])
        except ValueError:
            send(chat_id, "번호는 숫자로 입력하세요. 예: /삭제 3")
            return
        products = load_products()
        target = next((p for p in products if p["id"] == del_id), None)
        if not target:
            send(chat_id, f"번호 {del_id}인 상품이 없습니다.\n/목록 으로 번호를 확인하세요.")
            return
        save_products([p for p in products if p["id"] != del_id])
        send(chat_id, f"✅ '{target['name']}' 삭제 완료!\n웹사이트 새로고침하면 반영됩니다.")

    else:
        send(chat_id, "/도움말 을 입력하면 사용법을 볼 수 있습니다.")

# ── 메인 루프 ──

def main():
    print("=" * 40)
    print("봇 시작됨!")
    print("텔레그램에서 /start 를 입력하세요.")
    print("종료하려면 Ctrl+C")
    print("=" * 40)
    load_products()  # products.json 없으면 기본 데이터로 초기화
    offset = None
    while True:
        updates = get_updates(offset)
        for update in updates.get("result", []):
            offset = update["update_id"] + 1
            if "message" in update:
                try:
                    handle(update["message"])
                except Exception as e:
                    print(f"처리 오류: {e}")
        time.sleep(1)

if __name__ == "__main__":
    main()
