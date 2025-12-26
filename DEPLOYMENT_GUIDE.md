# 🚀 Netlify 배포 완벽 가이드

## 📋 배포 전 체크리스트

### 1. API 키 준비
- [ ] Gemini API Key 발급 완료
  - 발급: https://makersuite.google.com/app/apikey
  - 무료 한도: 분당 60회 요청
- [ ] (선택) Google Sheets API 설정
  - Console: https://console.cloud.google.com/
  - Sheets API 활성화
  - OAuth 2.0 Client ID 생성

### 2. 로컬 테스트
```bash
# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 실제 API 키 입력

# 개발 서버 테스트
npm run dev

# 프로덕션 빌드 테스트
npm run build
npm run preview
```

### 3. Git 저장소 준비
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repository-url>
git push -u origin main
```

## 🌐 Netlify 배포 방법

### Option 1: Git 연동 배포 (권장)

#### Step 1: Netlify 계정 생성
1. https://netlify.com 접속
2. GitHub/GitLab 계정으로 로그인

#### Step 2: 새 사이트 생성
1. "Add new site" > "Import an existing project" 클릭
2. Git 공급자 선택 (GitHub/GitLab/Bitbucket)
3. 저장소 선택

#### Step 3: 빌드 설정 확인
자동으로 `netlify.toml` 파일을 감지합니다:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

변경 없이 "Deploy site" 클릭

#### Step 4: 환경 변수 설정
1. Site settings > Environment variables
2. "Add a variable" 클릭
3. 다음 변수들을 추가:

| Key | Value | 설명 |
|-----|-------|------|
| `VITE_API_KEY` | `your_gemini_api_key` | Gemini AI (필수) |
| `VITE_GOOGLE_API_KEY` | `your_google_api_key` | Google Sheets (선택) |
| `VITE_GOOGLE_CLIENT_ID` | `your_client_id.apps.googleusercontent.com` | Google OAuth (선택) |

4. "Save" 클릭
5. Deploys > Trigger deploy > Clear cache and deploy

#### Step 5: 배포 완료
- 배포 URL: `https://your-site-name.netlify.app`
- 커스텀 도메인 설정: Site settings > Domain management

### Option 2: 수동 배포

#### Step 1: 빌드
```bash
npm run build
```

#### Step 2: Netlify 수동 업로드
1. https://app.netlify.com/drop 접속
2. `dist` 폴더를 드래그 앤 드롭
3. 배포 완료

#### Step 3: 환경 변수 설정
- Site settings > Environment variables에서 위와 동일하게 설정
- 재배포 필요

## 🔧 배포 후 설정

### 커스텀 도메인 연결
1. Site settings > Domain management
2. "Add custom domain" 클릭
3. 도메인 입력 (예: mytradingjournal.com)
4. DNS 설정:
   - A 레코드: `75.2.60.5`
   - 또는 CNAME: `your-site.netlify.app`

### HTTPS 활성화
- 자동으로 Let's Encrypt 인증서 발급됨
- 강제 HTTPS: Site settings > Domain management > HTTPS > Force HTTPS

### 빌드 훅 설정 (자동 배포)
1. Site settings > Build & deploy > Build hooks
2. "Add build hook" 클릭
3. Hook name 입력 (예: "Auto Deploy")
4. 생성된 URL로 POST 요청 시 자동 배포

## 📊 모니터링

### Analytics 설정
1. Site settings > Analytics
2. "Enable analytics" 클릭
3. 트래픽, 성능 모니터링 가능

### 에러 로깅
배포 후 Functions > Logs에서 실시간 로그 확인

## 🐛 배포 트러블슈팅

### 문제 1: 빌드 실패
```
Error: Cannot find module 'xyz'
```
**해결**:
```bash
# package.json 확인
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### 문제 2: 환경 변수 오류
```
API_KEY가 설정되지 않았습니다
```
**해결**:
1. Netlify Dashboard > Site settings > Environment variables
2. `VITE_` 접두사 확인 (중요!)
3. Deploy settings > Trigger deploy > Clear cache and deploy

### 문제 3: 404 에러 (SPA 라우팅)
**해결**: `netlify.toml`에 이미 설정됨
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 문제 4: 느린 로딩
**해결**:
1. Vite 번들 최적화:
```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts']
        }
      }
    }
  }
}
```

2. Netlify CDN 캐싱 확인 (자동 적용됨)

## 🔄 업데이트 배포

### Git 연동 배포
```bash
git add .
git commit -m "Update feature"
git push
# 자동으로 배포 시작
```

### 수동 배포
```bash
npm run build
# dist 폴더를 다시 드래그 앤 드롭
```

## 📈 성능 최적화

### Lighthouse 점수 개선
1. Chrome DevTools > Lighthouse
2. "Generate report" 실행
3. 권장사항 적용

### 이미지 최적화
```bash
# 이미지 압축 도구
npm install -D vite-plugin-imagemin
```

### 폰트 최적화
- 시스템 폰트 우선 사용 (현재 설정됨)
- 필요시 Google Fonts 최적화

## 🔐 보안 체크리스트

- [x] `.env.local` 파일 Git ignore됨
- [x] API 키 환경 변수로 관리
- [x] CSP 헤더 설정됨 (`_headers`)
- [x] HTTPS 강제 적용
- [ ] (선택) Netlify Identity 인증 추가
- [ ] (선택) Rate limiting 설정

## 💡 팁

### 1. 프리뷰 배포
- Pull Request 생성 시 자동으로 프리뷰 URL 생성
- Settings > Build & deploy > Deploy notifications

### 2. 롤백
- Deploys 탭에서 이전 버전 선택
- "Publish deploy" 클릭

### 3. 성능 모니터링
```javascript
// Performance API 활용
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  console.log('Page Load Time:', perfData.loadEventEnd);
});
```

## 📞 지원

- Netlify Docs: https://docs.netlify.com/
- Community Forum: https://answers.netlify.com/
- Status: https://www.netlifystatus.com/

---

**배포 성공을 기원합니다! 🎉**
