# 📈 나의 매매일지 (My Trading Journal)

개인 투자자를 위한 종합 자산 관리 및 매매 기록 웹 애플리케이션입니다.

## ✨ 주요 기능

### 📊 포트폴리오 관리
- 실시간 수익률 계산 (전체/계좌별/종목별)
- 보유 종목 현황 및 평가손익
- 계좌별 자산 배분 차트
- 입출금 내역 추적

### 📝 매매일지
- 매수/매도 거래 기록
- 감정 및 전략 태그
- 메모 및 복기 기능
- 실현/미실현 손익 계산

### 💰 세금 최적화
- 연금저축/IRP/ISA 한도 관리
- 세액공제 혜택 추적
- 연간 납입액 시각화

### 🤖 AI 기능
- Gemini AI 기반 종목 검색
- 포트폴리오 분석 및 조언
- 실시간 시세 정보 (Google Search 연동)

### ☁️ 클라우드 동기화
- Google Sheets 자동 동기화
- 일일 자동 백업
- JSON 파일 내보내기/가져오기

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone <repository-url>
cd trading-journal
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 아래 내용을 입력하세요:

```env
# Gemini API Key (필수)
VITE_API_KEY=your_gemini_api_key_here

# Google Sheets API (선택사항)
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

**API 키 발급 방법:**
- Gemini API: https://makersuite.google.com/app/apikey
- Google Cloud Console: https://console.cloud.google.com/

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:5173 접속

### 5. 프로덕션 빌드
```bash
npm run build
npm run preview  # 빌드 결과 미리보기
```

## 📦 Netlify 배포

### 배포 방법 1: Git 연동 (권장)
1. GitHub/GitLab에 저장소 푸시
2. Netlify에서 "New site from Git" 선택
3. 저장소 연결
4. 빌드 설정 확인:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Environment variables 설정:
   - `VITE_API_KEY`: Gemini API 키
   - `VITE_GOOGLE_API_KEY`: Google API 키 (선택)
   - `VITE_GOOGLE_CLIENT_ID`: Google Client ID (선택)

### 배포 방법 2: 수동 배포
```bash
npm run build
# dist 폴더를 Netlify에 드래그 앤 드롭
```

### 배포 후 설정
Netlify Dashboard에서 Environment Variables 설정:
- Settings > Build & deploy > Environment
- 위 API 키들을 추가

## 🛠️ 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS (inline)
- **Charts**: Recharts 3
- **Icons**: Lucide React
- **AI**: Google Gemini API
- **Cloud**: Google Sheets API

## 📂 프로젝트 구조

```
src/
├── App.tsx              # 메인 애플리케이션
├── index.tsx           # 엔트리 포인트
├── ErrorBoundary.tsx   # 에러 처리
├── types.ts            # TypeScript 타입 정의
├── components/
│   ├── AccountsTab.tsx
│   ├── JournalTab.tsx
│   ├── PortfolioStatsTab.tsx
│   └── BulkHoldingsImport.tsx
├── services/
│   ├── geminiService.ts      # AI 서비스
│   └── googleSheetsService.ts # 클라우드 동기화
└── utils/
    ├── calculations.ts  # 재무 계산
    ├── validation.ts   # 입력 검증
    └── ui.ts          # UI 유틸리티
```

## 🔒 보안

### 주의사항
1. **절대 API 키를 Git에 커밋하지 마세요**
2. `.env.local` 파일은 `.gitignore`에 포함됨
3. 프로덕션 배포 시 환경 변수는 Netlify Dashboard에서 설정

### CSP (Content Security Policy)
`_headers` 파일에 보안 헤더가 설정되어 있습니다:
- XSS 방어
- Clickjacking 방어
- MIME 타입 스니핑 방지

## 🐛 문제 해결

### "현재 가용 투자 잔금" 입력이 안 돼요
✅ **수정 완료**: 입력 필드 레이아웃을 개선하여 모든 브라우저에서 정상 작동합니다.

### API 키 오류
```
Gemini API 키가 설정되지 않았습니다
```
→ `.env.local` 파일에 `VITE_API_KEY`를 설정하세요.

### 빌드 에러
```bash
# 캐시 삭제 후 재시도
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📈 업데이트 계획

### Phase 1: 안정성 (완료)
- ✅ 입력 필드 버그 수정
- ✅ 보안 강화 (환경 변수)
- ✅ 에러 바운더리 추가
- ✅ Netlify 배포 설정

### Phase 2: 성능 최적화
- [ ] 번들 사이즈 최적화 (Code Splitting)
- [ ] IndexedDB 마이그레이션
- [ ] 반응형 디자인 개선
- [ ] PWA 지원

### Phase 3: 기능 확장
- [ ] 종목별 수익률 차트
- [ ] 배당 캘린더
- [ ] CSV Import/Export
- [ ] 증권사 API 연동

## 📄 라이선스

이 프로젝트는 개인 사용을 위한 것입니다.

## 🤝 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.

---

**Made with ❤️ for Korean Investors**
