module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body;
  const GEMINI_KEY = process.env.GEMINI_KEY;

  if (!GEMINI_KEY) {
    return res.status(500).json({ reply: 'API 키가 설정되지 않았습니다.' });
  }

  // ═══════════════════════════════════════════════
  // 여기를 수정해서 챗봇이 아는 정보를 바꿀 수 있어요
  // ═══════════════════════════════════════════════
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
`;
  // ═══════════════════════════════════════════════

  try {
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: '네, 안내해 드리겠습니다.' }] },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(200).json({ reply: '죄송합니다. 잠시 후 다시 시도해주세요.' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || '죄송합니다. 잠시 후 다시 시도해주세요.';

    res.status(200).json({ reply });
  } catch (e) {
    console.error('Chat error:', e);
    res.status(500).json({ reply: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
};
