# 💡 기능 개선 제안서

## 📊 현재 상태 분석

### ✅ 잘 구현된 기능
1. **기본 매매 기록**: 매수/매도/입출금 완벽 지원
2. **계좌 관리**: 다중 계좌, 과세 유형별 분류
3. **손익 계산**: 실현/미실현 손익, ROI 계산
4. **세금 혜택**: 연금저축/IRP/ISA 한도 추적
5. **AI 통합**: Gemini 기반 종목 검색 및 조언
6. **클라우드 동기화**: Google Sheets 연동

### 🔧 개선 필요 영역
1. **데이터 분석**: 심화된 통계 및 차트 부족
2. **자동화**: 수동 입력 의존도가 높음
3. **알림**: 중요 이벤트 알림 없음
4. **모바일**: 완전한 반응형 최적화 부족
5. **협업**: 단일 사용자만 지원

## 🎯 우선순위별 개선 제안

---

## Priority 1: 필수 개선 사항 (1-2주)

### 1.1 종목별 상세 분석 페이지

**현재**: 종목 리스트만 표시
**개선**: 개별 종목 클릭 시 상세 페이지

```typescript
interface StockDetailPage {
  // 기본 정보
  basicInfo: {
    name: string;
    ticker: string;
    currentPrice: number;
    holdings: number;
    avgPrice: number;
  };
  
  // 수익률 차트
  performanceChart: {
    dates: string[];
    values: number[];
    benchmark: number[]; // KOSPI 비교
  };
  
  // 매매 이력
  transactions: Transaction[];
  
  // AI 분석
  aiInsight: {
    technicalAnalysis: string;
    newsAnalysis: string;
    recommendAction: 'BUY' | 'HOLD' | 'SELL';
  };
}
```

**구현 계획**:
1. 새 컴포넌트: `StockDetailPage.tsx`
2. 라우팅 추가 (React Router)
3. Gemini API로 종목 분석
4. Recharts로 시각화

### 1.2 기간별 수익률 비교

**현재**: 전체 수익률만 표시
**개선**: 일/주/월/분기/연 단위 수익률

```typescript
interface PeriodPerformance {
  period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';
  roi: number;
  profit: number;
  benchmark: number; // KOSPI 대비
}
```

**UI 디자인**:
```jsx
<div className="flex gap-2 overflow-x-auto">
  {['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'].map(period => (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-bold",
        selectedPeriod === period 
          ? "bg-indigo-600 text-white" 
          : "bg-slate-100 text-slate-600"
      )}
    >
      {period}
    </button>
  ))}
</div>
```

### 1.3 CSV 파일 Import/Export

**기능**:
- 증권사 거래 내역 CSV 일괄 업로드
- 전체 데이터 CSV 다운로드

**구현**:
```typescript
// CSV Import
import Papa from 'papaparse';

const handleCSVImport = (file: File) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      const transactions = results.data.map(row => ({
        date: parseDate(row['거래일자']),
        type: parseType(row['구분']),
        stockName: row['종목명'],
        quantity: Number(row['수량']),
        price: Number(row['단가']),
        amount: Number(row['거래금액'])
      }));
      
      setTransactions(prev => [...prev, ...transactions]);
    }
  });
};

// CSV Export
import { mkConfig, generateCsv, download } from 'export-to-csv';

const handleCSVExport = () => {
  const csvConfig = mkConfig({ 
    useKeysAsHeaders: true,
    filename: `trading_journal_${new Date().toISOString().slice(0,10)}`
  });
  
  const csv = generateCsv(csvConfig)(transactions);
  download(csvConfig)(csv);
};
```

### 1.4 배당 캘린더

**목적**: 예상 배당금 추적

```typescript
interface DividendCalendar {
  stockName: string;
  quantity: number;
  dividendPerShare: number;
  exDate: string;
  paymentDate: string;
  expectedAmount: number;
  status: 'UPCOMING' | 'PAID';
}
```

**UI**: 
- 월별 캘린더 뷰
- 예상 배당 합계 표시
- 과거 배당 이력

---

## Priority 2: 사용자 경험 개선 (2-3주)

### 2.1 다크 모드

**구현**:
```typescript
const [theme, setTheme] = useState<'light' | 'dark'>(() => 
  localStorage.getItem('theme') || 'light'
);

useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
}, [theme]);
```

**Tailwind 설정**:
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          text: '#e2e8f0'
        }
      }
    }
  }
}
```

### 2.2 PWA (Progressive Web App)

**목적**: 
- 오프라인 사용
- 홈 화면 추가
- 푸시 알림

**구현**:
```bash
npm install vite-plugin-pwa -D
```

```javascript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '나의 매매일지',
        short_name: '매매일지',
        description: '개인 투자 포트폴리오 관리',
        theme_color: '#4f46e5',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
}
```

### 2.3 키보드 단축키

```typescript
const shortcuts = {
  'Ctrl+N': () => setIsTxModalOpen(true),    // 새 거래
  'Ctrl+S': () => handleExportData(),        // 저장
  'Ctrl+F': () => setSearchFocused(true),    // 검색
  '/': () => setSearchFocused(true),         // 검색 (단축)
  'Escape': () => setIsTxModalOpen(false)    // 닫기
};

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = `${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`;
    shortcuts[key]?.();
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 2.4 토스트 알림 고도화

**현재**: 단순 텍스트만 표시
**개선**: 액션 버튼, 진행 바, 스택

```typescript
interface ToastAdvanced extends Toast {
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  progress?: boolean;
}

const addAdvancedToast = (
  message: string, 
  options: Partial<ToastAdvanced>
) => {
  const id = Date.now();
  setToasts(prev => [...prev, { id, message, ...options }]);
  
  if (options.progress) {
    // 진행 바 애니메이션
  }
};
```

---

## Priority 3: 고급 분석 기능 (3-4주)

### 3.1 포트폴리오 리밸런싱 추천

**알고리즘**:
```typescript
interface RebalanceRecommendation {
  current: { [stockName: string]: number }; // 현재 비중
  target: { [stockName: string]: number };  // 목표 비중
  actions: {
    stockName: string;
    action: 'BUY' | 'SELL';
    shares: number;
    amount: number;
  }[];
}

const calculateRebalance = (
  holdings: Holding[],
  targetAllocation: { [stockName: string]: number }
): RebalanceRecommendation => {
  const totalValue = holdings.reduce((sum, h) => sum + h.invested, 0);
  
  const actions = Object.entries(targetAllocation).map(([name, target]) => {
    const current = holdings.find(h => h.name === name);
    const currentValue = current?.invested || 0;
    const targetValue = totalValue * target;
    const diff = targetValue - currentValue;
    
    return {
      stockName: name,
      action: diff > 0 ? 'BUY' : 'SELL',
      shares: Math.abs(diff / (current?.avgPrice || 1)),
      amount: Math.abs(diff)
    };
  });
  
  return { current, target: targetAllocation, actions };
};
```

### 3.2 세금 최적화 시뮬레이터

**기능**: 연말 세금 절감 전략

```typescript
interface TaxOptimization {
  currentYear: {
    realizedGain: number;
    taxEstimate: number;
  };
  
  recommendations: {
    type: 'LOSS_HARVESTING' | 'PENSION_CONTRIBUTION';
    description: string;
    expectedSavings: number;
    actions: {
      stockName: string;
      action: 'SELL';
      shares: number;
      lossAmount: number;
    }[];
  }[];
}

const analyzeTaxOptimization = (
  holdings: Holding[],
  transactions: Transaction[]
): TaxOptimization => {
  // 손실 종목 찾기
  const lossHoldings = holdings.filter(h => 
    h.invested > calculateCurrentValue(h)
  );
  
  // Tax Loss Harvesting 전략
  const recommendations = lossHoldings.map(h => ({
    type: 'LOSS_HARVESTING',
    description: `${h.name} 매도로 ${formatCurrency(h.loss)}원 손실 실현`,
    expectedSavings: h.loss * 0.22, // 22% 세율 가정
    actions: [...]
  }));
  
  return { currentYear, recommendations };
};
```

### 3.3 백테스팅 도구

**목적**: 과거 매매 전략 성과 분석

```typescript
interface BacktestResult {
  strategy: {
    name: string;
    rules: string[];
  };
  
  performance: {
    totalReturn: number;
    cagr: number; // 연평균 수익률
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  
  trades: {
    date: string;
    action: 'BUY' | 'SELL';
    price: number;
    profit: number;
  }[];
}
```

---

## Priority 4: 자동화 및 통합 (4-6주)

### 4.1 증권사 API 연동

**지원 증권사**:
- 한국투자증권
- 키움증권
- NH투자증권
- 삼성증권

**기능**:
```typescript
interface BrokerageAPI {
  // 인증
  authenticate(apiKey: string, secretKey: string): Promise<void>;
  
  // 잔고 조회
  getBalance(): Promise<{
    cash: number;
    holdings: { ticker: string; quantity: number; avgPrice: number }[];
  }>;
  
  // 거래 내역
  getTransactions(startDate: string, endDate: string): Promise<Transaction[]>;
  
  // 실시간 시세
  subscribeQuote(ticker: string, callback: (quote: Quote) => void): void;
}
```

### 4.2 자동 거래 내역 동기화

**워크플로우**:
1. 매일 자정에 증권사 API 호출
2. 신규 거래 내역 가져오기
3. 중복 체크 후 DB에 추가
4. 사용자에게 알림

```typescript
const scheduleDailySync = () => {
  const schedule = require('node-cron');
  
  schedule.schedule('0 0 * * *', async () => {
    const newTransactions = await brokerageAPI.getTransactions(
      getYesterday(),
      getToday()
    );
    
    const filtered = newTransactions.filter(tx => 
      !transactions.some(existing => existing.id === tx.id)
    );
    
    setTransactions(prev => [...prev, ...filtered]);
    addToast(`${filtered.length}개의 새 거래가 동기화되었습니다.`);
  });
};
```

### 4.3 가격 알림

```typescript
interface PriceAlert {
  id: string;
  stockName: string;
  condition: 'ABOVE' | 'BELOW';
  targetPrice: number;
  notifyEmail?: boolean;
  notifyPush?: boolean;
}

const checkPriceAlerts = async (alerts: PriceAlert[]) => {
  for (const alert of alerts) {
    const currentPrice = await fetchCurrentPrice(alert.stockName);
    
    const triggered = 
      (alert.condition === 'ABOVE' && currentPrice > alert.targetPrice) ||
      (alert.condition === 'BELOW' && currentPrice < alert.targetPrice);
    
    if (triggered) {
      if (alert.notifyPush) {
        sendPushNotification(`${alert.stockName}이(가) ${formatCurrency(currentPrice)}원에 도달했습니다!`);
      }
    }
  }
};
```

### 4.4 뉴스 및 공시 알림

**데이터 소스**:
- 네이버 금융
- 금융감독원 전자공시시스템 (DART)
- AI 뉴스 요약 (Gemini)

```typescript
interface NewsAlert {
  stockName: string;
  title: string;
  summary: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  source: string;
  url: string;
  publishedAt: string;
}

const fetchStockNews = async (stockName: string): Promise<NewsAlert[]> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${stockName}에 관한 최신 뉴스를 검색하고 요약해줘. 긍정/중립/부정으로 감성을 분석해줘.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  
  return parseNewsResponse(response);
};
```

---

## Priority 5: 소셜 및 협업 (선택사항)

### 5.1 공유 기능

```typescript
// 포트폴리오 스냅샷 공유
const sharePortfolio = async () => {
  const snapshot = {
    date: new Date().toISOString(),
    totalAssets: summary.totalAssets,
    roi: summary.roi,
    holdings: holdings.map(h => ({
      name: h.name,
      quantity: h.quantity,
      percentage: (h.invested / summary.totalAssets) * 100
    }))
  };
  
  // 이미지 생성
  const canvas = await html2canvas(portfolioRef.current);
  const blob = await canvas.toBlob();
  
  // 공유
  if (navigator.share) {
    navigator.share({
      title: '나의 포트폴리오',
      text: `총 자산: ${formatCurrency(snapshot.totalAssets)}원 (수익률: ${snapshot.roi.toFixed(2)}%)`,
      files: [new File([blob], 'portfolio.png', { type: 'image/png' })]
    });
  }
};
```

### 5.2 커뮤니티 (선택)

**기능**:
- 익명 수익률 비교
- 전략 공유 게시판
- 종목 토론

---

## 🛠️ 기술 스택 추가 제안

### 추천 라이브러리

```json
{
  "dependencies": {
    // 차트 고도화
    "lightweight-charts": "^4.1.0",
    
    // CSV 처리
    "papaparse": "^5.4.1",
    "export-to-csv": "^1.2.4",
    
    // 날짜 처리
    "date-fns": "^3.0.0",
    
    // 상태 관리 (대규모 확장 시)
    "zustand": "^4.5.0",
    
    // DB (로컬 스토리지 대체)
    "dexie": "^3.2.4",
    
    // 폼 관리
    "react-hook-form": "^7.49.0",
    
    // 유효성 검사
    "zod": "^3.22.0",
    
    // 라우팅
    "react-router-dom": "^6.21.0",
    
    // PWA
    "vite-plugin-pwa": "^0.17.0",
    
    // HTML to Image
    "html2canvas": "^1.4.1"
  }
}
```

---

## 📈 구현 로드맵 (12주)

### Week 1-2: Phase 1 (필수)
- [x] 버그 수정
- [ ] 종목별 상세 페이지
- [ ] 기간별 수익률
- [ ] CSV Import/Export

### Week 3-4: Phase 2 (UX)
- [ ] 다크 모드
- [ ] PWA 설정
- [ ] 키보드 단축키
- [ ] 배당 캘린더

### Week 5-7: Phase 3 (분석)
- [ ] 리밸런싱 추천
- [ ] 세금 최적화
- [ ] 백테스팅
- [ ] 벤치마크 비교

### Week 8-10: Phase 4 (자동화)
- [ ] 증권사 API 연동
- [ ] 자동 동기화
- [ ] 가격 알림
- [ ] 뉴스 알림

### Week 11-12: Phase 5 (선택)
- [ ] 공유 기능
- [ ] 성능 최적화
- [ ] 최종 테스트

---

## 💰 비용 추정

### API 사용료
- **Gemini API**: 무료 (분당 60회)
- **Google Sheets API**: 무료 (일일 100회)
- **증권사 API**: 월 1-5만원
- **Push 알림**: Firebase 무료 (Spark Plan)

### 호스팅
- **Netlify**: 무료 (월 100GB 트래픽)
- **Vercel**: 무료 (대안)

### 총 예상 비용
- **개발 단계**: 무료
- **운영 (소규모)**: 무료 - 월 5만원
- **운영 (확장 시)**: 월 10-20만원

---

## 🎯 성공 지표 (KPI)

1. **사용자 참여**
   - DAU (일일 활성 사용자)
   - 평균 세션 시간
   - 거래 기록 수

2. **기능 사용률**
   - AI 조언 클릭률
   - CSV Import 사용 비율
   - 클라우드 동기화 활성화 비율

3. **성능**
   - 페이지 로드 시간 < 2초
   - Lighthouse 점수 > 90
   - 에러율 < 0.1%

4. **유지 보수**
   - 월간 버그 발생 수 < 5개
   - 사용자 피드백 응답 시간 < 24시간

---

이상 제안드립니다! 우선순위와 일정에 맞춰 단계적으로 구현하시면 됩니다. 🚀
