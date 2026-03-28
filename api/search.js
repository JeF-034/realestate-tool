export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: '請輸入社區名稱' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `你是台灣不動產行情助理。用戶給你一個社區名稱或地址，請用網路搜尋找出該社區最新實價登錄資訊。只回傳一個合法 JSON 物件，不要有任何說明文字或 Markdown，格式如下：{"name":"社區全名","addr":"完整地址","units":"總戶數如300戶","age":"屋齡如約14年","avg":"近一年均價數字只填數字如81.2","last":"最新一筆成交單價數字","nego":"議價空間百分比數字","analysis":"2到3句市場分析包含交通特色價格趨勢","rows":[{"l":"棟別樓層格局","s":"坪數","u":"萬坪","t":"總價萬"}]}rows 請提供 3 到 5 筆真實最新成交資料。所有數值欄位只填數字不要加單位。`,
        messages: [{ role: 'user', content: `搜尋這個台灣不動產社區的行情：${query}` }]
      })
    });

    const data = await response.json();
    const textBlock = data.content && data.content.find(b => b.type === 'text');
    if (!textBlock) throw new Error('AI 未回傳文字');

    let raw = textBlock.text.trim().replace(/```json|```/g, '').trim();
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('格式錯誤');
    const json = JSON.parse(raw.slice(start, end + 1));

    res.status(200).json({ success: true, data: json });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
