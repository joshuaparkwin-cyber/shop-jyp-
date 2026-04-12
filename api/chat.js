module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body;
  const GEMINI_KEY = process.env.GEMINI_KEY;

  if (!GEMINI_KEY) {
    return res.status(200).json({ reply: '[오류] API 키 없음' });
  }

  const systemPrompt = `당신은 SHOP 쇼핑몰의 친절한 AI 상담원입니다.
아래 정보를 바탕으로 고객 문의에 짧고 친절하게 답변해주세요.
이 정보 외의 질문은 "해당 내용은 문의 게시판을 이용해 주세요." 라고 안내하세요.
답변은 3문장 이내로 간결하게 해주세요.

=== 쇼핑몰 정보 ===
- 쇼핑몰 이름: SHOP
- 운영시간: 평일 09:00 ~ 18:00 (주말, 공휴일 휴무)
- 배송: 주문 후 2~3일 이내 출고, 배송비 무료
- 반품/교환: 수령 후 7일 이내 가능, 단순 변심은 왕복 배송비 고객 부담
- 결제수단: 신용카드, 계좌이체
- 문의: 홈페이지 문의 게시판 이용
- 자주 묻는 질문:
  Q. 해외 배송 되나요? A. 현재 국내만 가능합니다.
  Q. 교환은 어떻게 하나요? A. 문의 게시판에 남겨주세요.
  Q. 주문 취소는 어떻게 하나요? A. 출고 전에는 문의 게시판에 남겨주세요.
`;

  try {
    // 사용 가능한 모델 목록 조회
    const modelsRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`
    );
    const modelsData = await modelsRes.json();

    if (!modelsRes.ok) {
      return res.status(200).json({ reply: '[키 오류] ' + (modelsData.error?.message || '키를 확인해주세요.') });
    }

    // generateContent 지원 모델 중 첫 번째 선택
    const available = (modelsData.models || []).filter(m =>
      m.supportedGenerationMethods?.includes('generateContent')
    );

    if (available.length === 0) {
      return res.status(200).json({ reply: '[오류] 사용 가능한 모델이 없습니다.' });
    }

    const modelName = available[0].name; // 예: models/gemini-xxx

    const lastMessage = messages[messages.length - 1]?.content || '';
    const prompt = systemPrompt + '\n\n고객 질문: ' + lastMessage;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({ reply: '[에러] ' + (data.error?.message || response.status) });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || '죄송합니다. 잠시 후 다시 시도해주세요.';

    res.status(200).json({ reply });
  } catch (e) {
    res.status(200).json({ reply: '[예외] ' + e.message });
  }
};
