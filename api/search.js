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
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `你是專業的台灣不動產行情分析師。請用網路搜尋找出指定社區的最新實價登錄資訊。搜尋策略：1.先搜尋「[社區名稱] 實價登錄 成交」找最新成交資料 2.再搜尋「[社區名稱] 行情 均價」確認均價 3.確保資料來自5168實價登錄、樂屋網、永慶、信義等可靠來源。只回傳一個合法 JSON 物件，絕對不要有任何說明文字、Markdown 格式或程式碼區塊，直接從 { 開始：{"name":"社區正確全名","addr":"完整門牌地址","units":"總戶數（如：423戶）","age":"屋齡（如：約19年）","floors":"總樓層（如：地上28層）","builder":"建設公司名稱","mrt":"最近捷運站及步行時間（如：捷運秀朗橋站步行約8分鐘）","avg":"近一年均價，只填數字（如：70.9）","last":"最新一筆成交單價，只填數字","nego":"議價空間百分比，只填數字","high":"歷史最高成交單價，只填數字","analysis":"3句專業市場分析，包含：1.社區特色定位 2.交通與生活機能 3.價格趨勢展望","rows":[{"l":"棟別+樓層+格局（如：A棟15F・3房2廳）","s":"建坪數字","u":"成交單價數字","t":"成交總價數字","date":"成交年月（如：114年10月）"}]}。rows必須提供4-5筆最新真實成交資料，日期由新到舊排列。所有數值欄位只填阿拉伯數字，不加萬、坪等單位。`,
        messages: [{ role: 'user', content: `請搜尋並分析這個台灣不動產社區的完整行情資訊：${query}` }]
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
