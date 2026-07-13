export const blogCategories = [
  {
    key: "Market",
    slug: "market",
    label: "시장 분석",
    description: "온타리오와 주요 도시의 거래량, 가격, 재고 흐름을 데이터 중심으로 정리한 글입니다.",
  },
  {
    key: "Buying/Selling",
    slug: "buying-selling",
    label: "매매 팁",
    description: "첫 주택 구매, 매도 준비, 다운사이징, 계약 절차 등 실제 거래에 필요한 정보를 모았습니다.",
  },
  {
    key: "Rental Guide",
    slug: "rental-guide",
    label: "임대 가이드",
    description: "온타리오 임대차 규정, 세입자와 임대인이 알아야 할 절차와 서류를 설명합니다.",
  },
  {
    key: "Mortgage",
    slug: "mortgage",
    label: "모기지 정보",
    description: "금리, 은퇴자금, 현금흐름 등 부동산 결정과 연결되는 재정 정보를 다룹니다.",
  },
  {
    key: "Investment",
    slug: "investment",
    label: "투자 전략",
    description: "장기 보유, 은퇴 설계, 투자 관점에서 부동산 결정을 바라보는 글입니다.",
  },
  {
    key: "Newcomer",
    slug: "newcomer",
    label: "캐나다 이민·생활",
    description: "신규 이민자, 유학생, 한인 가정을 위한 생활 정보와 정착 관련 글입니다.",
  },
  {
    key: "Uncategorized",
    slug: "uncategorized",
    label: "기타",
    description: "공지와 별도 분류가 필요한 글입니다.",
  },
];

export const categoryByKey = Object.fromEntries(
  blogCategories.map((category) => [category.key, category]),
);
