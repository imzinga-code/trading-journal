
import { GoogleGenAI } from "@google/genai";
import { MarketData } from "../types";

export interface StockSearchResult {
  name: string;
  ticker: string;
  price: number;
  currency: 'KRW' | 'USD';
  changePercent?: number;
  links?: { web: { uri: string; title: string } }[];
}

/**
 * Gemini API 인스턴스 생성 헬퍼
 * 보안 강화: Vite 환경변수 사용 (VITE_ 접두사)
 * Netlify 배포 시 Environment Variables에 VITE_API_KEY 설정 필요
 */
const getAiClient = () => {
  // Vite 환경변수는 import.meta.env로 접근
  const apiKey = import.meta.env.VITE_API_KEY || '';
  
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      "Gemini API 키가 설정되지 않았습니다.\n" +
      "1. .env.local 파일에 VITE_API_KEY를 설정하거나\n" +
      "2. Netlify Environment Variables에 등록해주세요.\n" +
      "API 키 발급: https://makersuite.google.com/app/apikey"
    );
  }
  
  return new GoogleGenAI({ apiKey });
};

export const searchStockInfo = async (query: string): Promise<StockSearchResult[]> => {
  try {
    const ai = getAiClient();
    const prompt = `주식 종목 '${query}'에 대한 정확한 종목명, 티커(종목코드), 실시간 현재가, 전일 대비 등락률을 검색해줘. 
    반드시 JSON 형식의 배열로 응답해줘. 예시: [{"name": "삼성전자", "ticker": "005930", "price": 75000, "currency": "KRW", "changePercent": 1.5}] 
    한국 주식은 KRW, 미국 주식은 USD로 표시해. 검색 도구를 사용하여 가장 최신 정보를 가져와야 해.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "[]";
    let results: any[] = [];
    
    try {
      const jsonMatch = text.match(/\[.*\]/s);
      results = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.warn("JSON 파싱 실패, 원문 사용 시도");
      results = [];
    }

    if (Array.isArray(results)) {
      return results.map(res => ({
        ...res,
        links: groundingChunks.filter((c: any) => c.web).map((c: any) => ({
          web: { uri: c.web.uri, title: c.web.title }
        }))
      }));
    }
    return [];
  } catch (error) {
    console.error("Stock Search Error:", error);
    return [];
  }
};

export const fetchMarketAnalysis = async (ticker: string, name: string): Promise<MarketData | null> => {
  try {
    const ai = getAiClient();
    const prompt = `종목 '${name}(${ticker})'의 최신 시장 데이터를 검색해줘.
    필요한 데이터: 현재가(currentPrice), 20일 이동평균선(ma20), 60일 이동평균선(ma60), 120일 이동평균선(ma120), 52주 최고가(high52w), 52주 최저가(low52w).
    결과는 반드시 다음 JSON 형식으로만 답변해줘. 숫자만 포함해.
    {"currentPrice": 0, "ma20": 0, "ma60": 0, "ma120": 0, "high52w": 0, "low52w": 0}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Market Analysis Search Error:", error);
    return null;
  }
};

export const getPortfolioAdvice = async (holdings: any[]): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `현재 나의 주식 포트폴리오 상태는 다음과 같아: ${JSON.stringify(holdings)}. 
    투자 전문가로서 나의 매매 기록을 분석하고 개선점을 제안해줘. 수익률을 극대화하기 위한 전략을 한국어로 상세히 설명해줘.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "조언을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini Portfolio Advice Error:", error);
    return "AI 조언을 가져오는 중 오류가 발생했습니다.";
  }
};
