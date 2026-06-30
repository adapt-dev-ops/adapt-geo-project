const SERP_KEY = '0cd08d2fee4feadbd93c268a890cdfed4fc992015e511b24f8431c175cecfd84';

const pairs = [
  {
    brand: '풀리',
    self: '풀리 쌀 세라 수분 선크림',
    competitor: '조선미녀 맑은 쌀 선크림',
    competitorBrand: '조선미녀',
  },
  {
    brand: '오브제',
    self: '오브제 오일 컨트롤 피니셔',
    competitor: '메이크업포에버 HD SKIN 파우더',
    competitorBrand: '메이크업포에버',
  },
  {
    brand: '푸드올로지',
    self: '푸드올로지 콜레올로지 컷 다이어트 유산균',
    competitor: '비에날씬 BNR17',
    competitorBrand: '비에날씬',
  },
  {
    brand: '에이페',
    self: '에이페 스칼프 부스팅 앰플',
    competitor: '라보에이치 두피 앰플 토닉',
    competitorBrand: '라보에이치',
  },
];

function categorize(domain) {
  if (domain.includes('youtube.com'))       return 'YouTube';
  if (domain.includes('blog.naver.com'))    return '네이버 블로그';
  if (domain.includes('cafe.naver.com'))    return '네이버 카페';
  if (domain.includes('shopping.naver.com'))return '네이버 쇼핑';
  if (domain.includes('tistory.com'))       return '티스토리';
  if (['instagram','twitter','x.com','facebook','kakaostory','tiktok'].some(k => domain.includes(k))) return 'SNS';
  // 뷰티 전문 플랫폼
  if (['glowpick','chicor','oliveyoung','hwahae','powderm'].some(k => domain.includes(k))) return '뷰티 플랫폼';
  // 패션 플랫폼
  if (['musinsa','29cm','ably'].some(k => domain.includes(k))) return '패션 플랫폼';
  // 종합 쇼핑몰/유통
  if (['coupang','kurly','gmarket','11st','hmall','lotteon','auction','interpark','gsshop','wemakeprice','ssg','shinsegae','lotte'].some(k => domain.includes(k))) return '유통/쇼핑몰';
  // 백화점/면세점
  if (['dfs','airdf','zetta','chicshop'].some(k => domain.includes(k))) return '면세/백화점';
  // 코스트코, 창고형
  if (domain.includes('costco')) return '유통/쇼핑몰';
  // 가격비교
  if (domain.includes('danawa') || domain.includes('enuri')) return '가격비교';
  // 뷰티 미디어
  if (['allure','cosmopolitan','elle','vogue','marieclaire','bntnews','cosinkorea','beautynury','fashionbiz','acrofan'].some(k => domain.includes(k))) return '뷰티/IT 미디어';
  // 뉴스
  if (['chosun','joins','joongang','donga','hani','ytn','mbn','jtbc','sbs.co','kbs.co','mbc.co','newsis','newspim','herald','kyunghyang','zdnet','mt.co','edaily','mk.co'].some(k => domain.includes(k))) return '뉴스';
  // 해외 유통
  if (['wooltari','amazon','rakuten'].some(k => domain.includes(k))) return '해외 유통';
  if (domain.includes('naver.com')) return '네이버 기타';
  return '자사몰/브랜드몰';
}

async function getResults(query) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&gl=kr&hl=ko&num=10&api_key=${SERP_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) { console.error(`API 오류: ${data.error}`); return []; }
  return data.organic_results ?? [];
}

function countByChannel(results) {
  const counts = {};
  for (const r of results) {
    const domain = new URL(r.link).hostname.replace('www.', '');
    const cat = categorize(domain);
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
}

function printCounts(label, counts, total, results) {
  console.log(`  [${label}] — 총 ${total}건`);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [ch, n] of sorted) {
    const bar = '█'.repeat(n);
    console.log(`    ${ch.padEnd(14)} ${bar} ${n}건`);
  }
  // 기타 도메인 상세 출력
  const etcDomains = results
    .map(r => { try { return new URL(r.link).hostname.replace('www.',''); } catch { return '?'; } })
    .filter(d => categorize(d) === '기타');
  if (etcDomains.length) console.log(`    └ 기타 도메인: ${etcDomains.join(', ')}`);
}

async function main() {
  console.log('\n=== GEO 외부 채널 비중 분석 (Google 검색 결과 상위 10건) ===\n');

  for (const pair of pairs) {
    const selfResults = await getResults(pair.self);
    const compResults = await getResults(pair.competitor);

    const selfCounts = countByChannel(selfResults);
    const compCounts = countByChannel(compResults);

    console.log(`━━━ [${pair.brand}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    printCounts(`자사 — ${pair.self}`, selfCounts, selfResults.length, selfResults);
    console.log();
    printCounts(`타사 — ${pair.competitorBrand}`, compCounts, compResults.length, compResults);
    console.log();
  }
}

main();
