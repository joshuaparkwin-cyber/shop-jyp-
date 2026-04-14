import requests
import time
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── 환경변수 로드 ──
def load_env():
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return  # Railway에서는 환경변수가 직접 주입됨
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ[key.strip()] = value.strip()

load_env()
TOKEN      = os.environ.get("TELEGRAM_TOKEN", "")
SB_URL     = os.environ.get("SUPABASE_URL", "")
SB_KEY     = os.environ.get("SUPABASE_KEY", "")
SB_SVC_KEY = os.environ.get("SUPABASE_SERVICE_KEY", SB_KEY)
API_URL    = f"https://api.telegram.org/bot{TOKEN}"

DEFAULT_PRODUCTS = [
    {"name": "상품 1", "price": 12000, "color": "#e8e8e8", "desc": "깔끔하고 세련된 디자인의 상품입니다."},
    {"name": "상품 2", "price": 18000, "color": "#dcdcdc", "desc": "고품질 소재로 제작된 상품입니다."},
    {"name": "상품 3", "price": 25000, "color": "#d4d4d4", "desc": "트렌디한 디자인의 상품입니다."},
    {"name": "상품 4", "price": 9000,  "color": "#e0e0e0", "desc": "합리적인 가격의 상품입니다."},
    {"name": "상품 5", "price": 32000, "color": "#d8d8d8", "desc": "프리미엄 라인 상품입니다."},
    {"name": "상품 6", "price": 15000, "color": "#e4e4e4", "desc": "베스트셀러 상품입니다."},
    {"name": "상품 7", "price": 22000, "color": "#d0d0d0", "desc": "정성껏 만든 상품입니다."},
    {"name": "상품 8", "price": 28000, "color": "#cacaca", "desc": "한정판 상품입니다."},
]

# ── Supabase API ──

def sb_headers():
    return {
        "apikey": SB_SVC_KEY,
        "Authorization": f"Bearer {SB_SVC_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

def load_products():
    res = requests.get(f"{SB_URL}/rest/v1/products?select=*&order=id", headers=sb_headers())
    return res.json() if res.ok else []

def add_product(name, price, desc, color="#e0e0e0", category="카테고리 1", image_url=None):
    data = {"name": name, "price": price, "desc": desc, "color": color, "category": category}
    if image_url:
        data["image_url"] = image_url
    res = requests.post(f"{SB_URL}/rest/v1/products", headers=sb_headers(), json=data)
    if res.ok:
        result = res.json()
        if result:
            return result[0]
        print(f"상품 추가 응답 비어있음: {res.text}")
        return None
    print(f"상품 추가 실패: {res.status_code} {res.text}")
    return None

def delete_product(product_id):
    res = requests.delete(f"{SB_URL}/rest/v1/products?id=eq.{product_id}", headers=sb_headers())
    return res.ok

def upload_image(file_bytes, filename):
    url = f"{SB_URL}/storage/v1/object/product-images/{filename}"
    headers = {
        "apikey": SB_SVC_KEY,
        "Authorization": f"Bearer {SB_SVC_KEY}",
        "Content-Type": "image/jpeg"
    }
    res = requests.post(url, headers=headers, data=file_bytes)
    if res.ok:
        return f"{SB_URL}/storage/v1/object/public/product-images/{filename}"
    print(f"업로드 실패: {res.status_code} {res.text}")
    return None

def seed_defaults():
    existing = load_products()
    if existing:
        return
    for p in DEFAULT_PRODUCTS:
        requests.post(f"{SB_URL}/rest/v1/products", headers=sb_headers(), json=p)
    print("기본 상품 8개 Supabase에 삽입 완료")

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

def get_file_url(file_id):
    res = requests.get(f"{API_URL}/getFile", params={"file_id": file_id})
    if res.ok:
        file_path = res.json()["result"]["file_path"]
        return f"https://api.telegram.org/file/bot{TOKEN}/{file_path}"
    return None

# ── 명령어 처리 ──

def parse_product_caption(caption):
    """캡션에서 이름, 가격, 설명, 카테고리 파싱"""
    parts = caption.strip().split(" ", 3)
    if len(parts) < 2:
        return None
    name = parts[0]
    try:
        price = int(parts[1])
    except ValueError:
        return None
    rest = " ".join(parts[2:]) if len(parts) > 2 else f"{name}입니다."
    rest_parts = rest.rsplit(" ", 1)
    if len(rest_parts) == 2 and rest_parts[1] in ["1", "2", "3", "4"]:
        desc = rest_parts[0]
        category = f"카테고리 {rest_parts[1]}"
    else:
        desc = rest
        category = "카테고리 1"
    return {"name": name, "price": price, "desc": desc, "category": category}

def handle(message):
    chat_id = message["chat"]["id"]
    text = message.get("text", "").strip()

    # ── 사진 메시지 처리 ──
    if "photo" in message:
        caption = message.get("caption", "").strip()
        if not caption:
            send(chat_id,
                "사진과 함께 상품 정보를 캡션으로 입력해주세요.\n"
                "형식: 이름 가격 설명 카테고리번호\n"
                "예: 에코백 25000 친환경 소재입니다 2"
            )
            return

        info = parse_product_caption(caption)
        if not info:
            send(chat_id, "형식이 맞지 않습니다.\n예: 에코백 25000 친환경 소재입니다 2")
            return

        # 가장 큰 사진 선택
        photo = message["photo"][-1]
        file_url = get_file_url(photo["file_id"])
        if not file_url:
            send(chat_id, "사진을 가져오는 데 실패했습니다.")
            return

        # 사진 다운로드
        img_res = requests.get(file_url)
        if not img_res.ok:
            send(chat_id, "사진 다운로드 실패.")
            return

        # Supabase Storage에 업로드
        filename = f"product_{int(time.time())}.jpg"
        image_url = upload_image(img_res.content, filename)
        if not image_url:
            send(chat_id, "사진 업로드 실패. 텍스트 상품으로 등록하려면 /추가 명령어를 사용하세요.")
            return

        result = add_product(info["name"], info["price"], info["desc"],
                             category=info["category"], image_url=image_url)
        if result:
            send(chat_id,
                f"✅ '{info['name']}' 상품 추가 완료! [{info['category']}]\n"
                f"사진도 함께 등록되었습니다.\n"
                f"웹사이트 새로고침하면 바로 반영됩니다."
            )
        else:
            send(chat_id, "상품 추가 중 오류가 발생했습니다.")
        return

    # ── 텍스트 명령어 처리 ──
    if text in ["/start", "/도움말"]:
        send(chat_id,
            "🛍 <b>쇼핑몰 관리 봇</b>\n\n"
            "<b>📷 사진으로 상품 등록</b>\n"
            "  사진 전송 + 캡션: 이름 가격 설명 카테고리번호\n"
            "  예: 에코백 25000 친환경 에코백입니다 2\n\n"
            "<b>/목록</b>\n"
            "  전체 상품 보기\n\n"
            "<b>/추가 이름 가격 설명 카테고리번호</b>\n"
            "  예: /추가 에코백 25000 친환경 에코백 2\n\n"
            "<b>/삭제 번호</b>\n"
            "  예: /삭제 3"
        )

    elif text.startswith("/목록"):
        products = load_products()
        if not products:
            send(chat_id, "등록된 상품이 없습니다.")
            return
        lines = [f"{p['id']}. <b>{p['name']}</b> — {p['price']:,}원 [{p.get('category','카테고리 1')}]" for p in products]
        send(chat_id, "\n".join(lines))

    elif text.startswith("/추가"):
        parts = text.split(" ", 4)
        if len(parts) < 3:
            send(chat_id, "사용법: /추가 이름 가격 설명 카테고리번호\n예: /추가 에코백 25000 친환경 소재입니다 2")
            return
        name = parts[1]
        try:
            price = int(parts[2])
        except ValueError:
            send(chat_id, "가격은 숫자만 입력하세요. 예: 25000")
            return

        rest = parts[3] if len(parts) > 3 else f"{name}입니다."
        rest_parts = rest.rsplit(" ", 1)
        if len(rest_parts) == 2 and rest_parts[1] in ["1", "2", "3", "4"]:
            desc = rest_parts[0]
            category = f"카테고리 {rest_parts[1]}"
        else:
            desc = rest
            category = "카테고리 1"

        result = add_product(name, price, desc, category=category)
        if result:
            send(chat_id, f"✅ '{name}' 상품 추가 완료! [{category}]\n웹사이트 새로고침하면 바로 반영됩니다.")
        else:
            send(chat_id, "상품 추가 중 오류가 발생했습니다.")

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
        if delete_product(del_id):
            send(chat_id, f"✅ '{target['name']}' 삭제 완료!\n웹사이트 새로고침하면 바로 반영됩니다.")
        else:
            send(chat_id, "삭제 중 오류가 발생했습니다.")

    else:
        send(chat_id, "/도움말 을 입력하면 사용법을 볼 수 있습니다.")

# ── 메인 루프 ──

def main():
    print("=" * 40)
    print("봇 시작됨! (Supabase 연동)")
    print("텔레그램에서 /start 를 입력하세요.")
    print("종료하려면 Ctrl+C")
    print("=" * 40)
    seed_defaults()
    updates = get_updates()
    if updates.get("result"):
        offset = updates["result"][-1]["update_id"] + 1
    else:
        offset = None
    print("준비 완료! 메시지 대기 중...")
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
