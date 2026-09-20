export const blogCategories = [
  {
    key: "Market",
    slug: "market",
    label: "Market",
    description: "온타리오와 주요 도시의 거래량, 가격, 재고 흐름을 데이터 중심으로 정리한 글입니다.",
    journey: {
      href: "/buy/",
      label: "Plan your next move",
      description: "Put the current market in context for your home search or next purchase.",
    },
  },
  {
    key: "Buy & Sell",
    slug: "buy-sell",
    label: "Buy & Sell",
    description: "첫 주택 구매, 매도 준비, 다운사이징, 계약 절차 등 실제 거래에 필요한 정보를 모았습니다.",
    journey: {
      href: "/buy/",
      label: "Explore the buying journey",
      description: "Turn the ideas in this guide into a clear plan for your next home.",
    },
  },
  {
    key: "Rent",
    slug: "rent",
    label: "Rent",
    description: "온타리오 임대차 규정, 세입자와 임대인이 알아야 할 절차와 서류를 설명합니다.",
    journey: {
      href: "/rent/",
      label: "Get rental guidance",
      description: "Review your rental situation and decide on the right next step.",
    },
  },
  {
    key: "Invest",
    slug: "invest",
    label: "Invest",
    description: "장기 보유, 은퇴 설계, 투자 관점에서 부동산 결정을 바라보는 글입니다.",
    journey: {
      href: "/invest/",
      label: "Explore investment planning",
      description: "Compare your goals, timing and options with a longer-term view.",
    },
  },
  {
    key: "New to Ontario",
    slug: "new-to-ontario",
    label: "New to Ontario",
    description: "신규 이민자, 유학생, 한인 가정을 위한 생활 정보와 정착 관련 글입니다.",
    journey: {
      href: "/buy/",
      label: "Start your Ontario home plan",
      description: "Build a practical housing plan for your first steps in Ontario.",
    },
  },
  {
    key: "Living in Ontario",
    slug: "living-in-ontario",
    label: "Living in Ontario",
    description: "온타리오에서의 일상, 지역 생활, 주거 환경을 이해하는 데 도움이 되는 글입니다.",
    journey: {
      href: "/rent/",
      label: "Plan your move to Ontario",
      description: "Get practical support as you compare areas, homes and next steps.",
    },
  },
];

export const categoryByKey = Object.fromEntries(
  blogCategories.map((category) => [category.key, category]),
);
