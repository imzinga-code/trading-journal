
import { Transaction } from "../types";

/**
 * 거래 내역 입력값의 유효성을 검증합니다.
 * @param tx 검증할 거래 데이터
 * @returns 에러 메시지 배열 (에러가 없으면 빈 배열)
 */
export const validateTransaction = (tx: Partial<Transaction>): string[] => {
  const errors: string[] = [];
  
  if (!tx.date) {
    errors.push('거래 날짜를 입력해주세요.');
  }
  
  if (!tx.accountId) {
    errors.push('계좌를 선택해주세요.');
  }
  
  if (tx.type === 'BUY' || tx.type === 'SELL') {
    if (!tx.stockName || tx.stockName.trim() === '') {
      errors.push('종목명을 입력해주세요.');
    }
    
    // amount는 price * quantity로 계산되므로 개별 필드를 체크합니다.
    if (tx.price === undefined || tx.price <= 0) {
      errors.push('단가는 0보다 커야 합니다.');
    }
    
    if (tx.quantity === undefined || tx.quantity <= 0) {
      errors.push('수량은 0보다 커야 합니다.');
    }
  } else {
    // DEPOSIT, WITHDRAWAL, DIVIDEND 등 자금 관련 거래
    if (tx.amount === undefined || tx.amount <= 0) {
      errors.push('금액은 0보다 커야 합니다.');
    }
  }
  
  return errors;
};
