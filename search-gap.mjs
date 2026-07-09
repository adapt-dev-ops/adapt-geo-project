const SERP_KEY = '0cd08d2fee4feadbd93c268a890cdfed4fc992015e511b24f8431c175cecfd84';

const pairs = [
  {
    brand: '풀리',
    selfBrand: '풀리',
    competitorBrand: '조선미녀',
    categoryQuery: '쌀 선크림 추천 수분감 백탁 없는',
  },
  {
    brand: '오브제',
    selfBrand: '오브제',
    competitorBrand: '메이크업포에버',
    categoryQuery: '메이크업 유분 잡는 피니셔 추천',
  },
  {
    brand: '푸드올로지',
    selfBrand: '푸드올로지',
    competitorBrand: '비에날씬',
    categoryQuery: '다이어트 유산균 추천',
  },
  {
    brand: '에이페',
    selfBrand: '에이페',
    competitorBrand: '라보에이치',
    categoryQuery: '두피 앰플 추천 탈모 예방',
  },
];

function categorize(domain) {
  if (domain.includes('youtube.com'))       return 'YouTube';
  if (domain.includes('blog.naver.com'))    return '네이버 블로그';
  if (domain.includes('cafe.naver.com'))    return '네이버 카페';
  if (domain.includes('shopping.naver.com'))return '네이버 쇼핑';
  if (domain.includes('tistory.com'))       return '티스토리';
  if (['instagram','twitter','x.com','facebook','kakaostory','tiktok'].some(k => domain.includes(k))) return 'SNS';
  if (['glowpick','chicor','oliveyoung','hwahae','powderm'].some(k => domain.includes(k))) return '뷰티 플랫폼';
  if (['musinsa','29cm','ably'].some(k => domain.includes(k))) return '패션 플랫폼';
  if (['coupang','kurly','gmarket','11st','hmall','lotteon','auction','interpark','gsshop','wemakeprice','ssg','shinsegae','lotte','costco'].some(k => domain.includes(k))) return '유통/쇼핑몰';
  if (['dfs','airdf','zetta','chicshop'].some(k => domain.includes(k))) return '면세/백화점';
  if (domain.includes('danawa') || domain.includes('enuri')) return '가격비교';
  if (['allure','cosmopolitan','elle','vogue','marieclaire','bntnews','cosinkorea','beautynury','fashionbiz','acrofan'].some(k => domain.includes(k))) return '뷰티/IT 미디어';
  if (['chosun','joins','joongang','donga','hani','ytn','mbn','jtbc','sbs.co','kbs.co','mbc.co','newsis','newspim','herald','kyunghyang','zdnet','mt.co','edaily','mk.co'].some(k => domain.includes(k))) return '뉴스';
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

function checkBrandMentions(results, brand) {
  return results.filter(r => {
    const text = ((r.title || '') + ' ' + (r.snippet || '')).toLowerCase();
    return text.includes(brand.toLowerCase());
  });
}

async function main() {
  console.log('\n=== GEO 카테고리 쿼리 분석 (Google 검색 결과 상위 10건) ===\n');

  const allResults = [];

  for (const pair of pairs) {
    const results = await getResults(pair.categoryQuery);
    const counts = countByChannel(results);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const selfMentions  = checkBrandMentions(results, pair.selfBrand);
    const compMentions  = checkBrandMentions(results, pair.competitorBrand);

    console.log(`━━━ [${pair.brand}] 쿼리: "${pair.categoryQuery}"`);
    console.log(`  채널 분포 — 총 ${results.length}건`);
    for (const [ch, n] of sorted) {
      console.log(`    ${ch.padEnd(14)} ${'█'.repeat(n)} ${n}건`);
    }
    console.log(`  자사(${pair.selfBrand}) 언급: ${selfMentions.length}건`);
    if (selfMentions.length) selfMentions.forEach(r => console.log(`    → ${r.title}`));
    console.log(`  타사(${pair.competitorBrand}) 언급: ${compMentions.length}건`);
    if (compMentions.length) compMentions.forEach(r => console.log(`    → ${r.title}`));
    console.log();

    allResults.push({ pair, results, counts: sorted, selfMentions, compMentions });
  }

  return allResults;
}

main();
