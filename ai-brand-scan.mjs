// ai-brand-scan.mjs
// 각 AI에 카테고리 쿼리를 날려서 브랜드 노출 여부와 순위를 스캔

const OPENAI_KEY     = process.env.OPENAI_KEY     || '';
const GEMINI_KEY     = process.env.GEMINI_KEY     || '';
const PERPLEXITY_KEY = process.env.PERPLEXITY_KEY || '';

const SB_URL = 'https://zsznmjvmbzqxtssqfrpj.supabase.co';
const SB_KEY = 'sb_publishable_Dqx5699n2fgzAr3ijiiNCQ_WXavoaaD';

// ── 쿼리 목록 ──────────────────────────────────────────────────
const QUERIES = [
  { brand:'풀리',       self:'풀리',       rival:'조선미녀',       q:'쌀 선크림 추천해줘 수분감 있고 백탁 없는 거' },
  { brand:'오브제',     self:'오브제',     rival:'메이크업포에버',  q:'메이크업 후 유분 잡는 피니셔 추천해줘' },
  { brand:'푸드올로지', self:'푸드올로지', rival:'비에날씬',        q:'다이어트 유산균 추천해줘 효과 좋은 거' },
  { brand:'에이페',     self:'에이페',     rival:'라보에이치',      q:'두피 앰플 추천해줘 탈모 예방에 좋은 거' },
  { brand:'95P',        self:'95프로블럼', rival:'세라젬',          q:'가정용 EMS 벨트 추천해줘 복부용' },
];

// ── AI 응답에서 브랜드 감지 ─────────────────────────────────────
function detectMention(text, brand) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(brand.toLowerCase());
  if (idx === -1) return null;
  const rank = (lower.slice(0, idx).match(/(?:^|\n)\s*\d+[.)]/gm) || []).length + 1;
  const excerpt = text.slice(Math.max(0, idx - 15), idx + brand.length + 60).replace(/\n+/g, ' ').trim();
  return { rank, excerpt };
}

// ── API 호출 함수들 ─────────────────────────────────────────────
const PROMPT_SUFFIX = ' 한국 브랜드 위주로 구체적으로 추천해줘.';

async function askOpenAI(q) {
  if (!OPENAI_KEY) return null;
  const d = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 800,
      messages: [{ role: 'user', content: q + PROMPT_SUFFIX }] }),
  }).then(r => r.json());
  if (d.error) { console.error('  OpenAI error:', d.error.message); return null; }
  return d.choices?.[0]?.message?.content || null;
}

async function askGemini(q) {
  if (!GEMINI_KEY) return null;
  const d = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: q + PROMPT_SUFFIX }] }] }) },
  ).then(r => r.json());
  if (d.error) { console.error('  Gemini error:', d.error.message); return null; }
  return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function askPerplexity(q) {
  if (!PERPLEXITY_KEY) return null;
  const d = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'sonar',
      messages: [{ role: 'user', content: q + PROMPT_SUFFIX }] }),
  }).then(r => r.json());
  if (d.error) { console.error('  Perplexity error:', d.error?.message); return null; }
  return d.choices?.[0]?.message?.content || null;
}

// ── Supabase 저장 ──────────────────────────────────────────────
async function saveToSupabase(rows) {
  const res = await fetch(`${SB_URL}/rest/v1/geo_brand_scans`, {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error('Supabase 저장 실패:', await res.text()); }
  else { console.log(`✅ Supabase 저장 완료 (${rows.length}건)\n`); }
}

// ── 메인 ──────────────────────────────────────────────────────
async function main() {
  const keys = [
    OPENAI_KEY     ? '✅ OpenAI'     : '❌ OpenAI (OPENAI_KEY 없음)',
    GEMINI_KEY     ? '✅ Gemini'     : '❌ Gemini (GEMINI_KEY 없음)',
    PERPLEXITY_KEY ? '✅ Perplexity' : '❌ Perplexity (PERPLEXITY_KEY 없음)',
  ];
  console.log('\n=== AI 브랜드 노출 스캔 ===');
  console.log('API 키 상태:', keys.join(' | '), '\n');

  const rows = [];
  const summary = [];

  for (const pair of QUERIES) {
    console.log(`━━━ [${pair.brand}] 쿼리: "${pair.q}"`);

    const [chatgpt, gemini, perplexity] = await Promise.all([
      askOpenAI(pair.q), askGemini(pair.q), askPerplexity(pair.q),
    ]);

    const engResults = { ChatGPT: chatgpt, Gemini: gemini, Perplexity: perplexity };
    const sumRow = { brand: pair.brand, q: pair.q, chatgpt: null, gemini: null, perplexity: null };

    for (const [name, text] of Object.entries(engResults)) {
      if (text === null) {
        console.log(`  ${name.padEnd(13)} [KEY 없음 — 스킵]`);
        continue;
      }
      const selfRes  = detectMention(text, pair.self);
      const rivalRes = detectMention(text, pair.rival);

      // 콘솔 출력
      const selfTag  = selfRes  ? `✅ ${selfRes.rank}순위` : '❌ 미노출';
      const rivalTag = rivalRes ? `✅ ${rivalRes.rank}순위` : '❌';
      console.log(`  ${name.padEnd(13)} 자사(${pair.self}) ${selfTag.padEnd(12)}  경쟁사(${pair.rival}) ${rivalTag}`);
      if (selfRes)  console.log(`    └ "...${selfRes.excerpt}..."`);
      if (!selfRes) console.log(`    └ 응답 일부: "${text.slice(0, 120).replace(/\n/g,' ')}..."`);

      // rows & summary 누적
      rows.push({
        brand: pair.brand, query: pair.q, ai_engine: name,
        mentioned: !!selfRes, rank: selfRes?.rank ?? null, excerpt: selfRes?.excerpt ?? null,
        rival_brand: pair.rival, rival_mentioned: !!rivalRes, rival_rank: rivalRes?.rank ?? null,
      });
      sumRow[name.toLowerCase()] = !!selfRes;
    }

    summary.push(sumRow);
    console.log();
  }

  if (rows.length) await saveToSupabase(rows);

  // 요약 테이블
  console.log('═══ 요약 ════════════════════════════════════');
  console.log('브랜드'.padEnd(14) + 'ChatGPT  Gemini   Perplexity');
  for (const r of summary) {
    const c = r.chatgpt    === null ? '—' : r.chatgpt    ? '✅' : '❌';
    const g = r.gemini     === null ? '—' : r.gemini     ? '✅' : '❌';
    const p = r.perplexity === null ? '—' : r.perplexity ? '✅' : '❌';
    console.log(r.brand.padEnd(14) + `${c}        ${g}        ${p}`);
  }
  console.log();
}

main().catch(console.error);
