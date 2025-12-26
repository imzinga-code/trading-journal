
import { Transaction, Account, TaxStats } from "../types";

export const calculateTaxStats = (transactions: Transaction[], accounts: Account[]): TaxStats => {
  const currentYear = new Date().getFullYear().toString();
  const stats: TaxStats = {
    pensionUsed: 0,
    pensionLimit: 6000000,
    irpUsed: 0,
    irpLimit: 9000000,
    isaUsed: 0,
    isaLimit: 20000000,
    combinedPensionIRPUsed: 0,
    combinedLimit: 9000000,
  };

  transactions.forEach(tx => {
    if (tx.type !== 'DEPOSIT' || !tx.date.startsWith(currentYear)) return;
    
    const acc = accounts.find(a => a.id === tx.accountId);
    if (!acc) return;

    if (acc.taxType === 'PENSION') {
      stats.pensionUsed += tx.amount;
    } else if (acc.taxType === 'IRP') {
      stats.irpUsed += tx.amount;
    } else if (acc.taxType === 'ISA') {
      stats.isaUsed += tx.amount;
    }
  });

  stats.combinedPensionIRPUsed = stats.pensionUsed + stats.irpUsed;
  return stats;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(value);
};

export const getHoldings = (transactions: Transaction[]) => {
  const holdingsMap = new Map<string, { name: string, quantity: number, invested: number, avgPrice: number }>();

  // Sort by date to calculate average price correctly
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sorted.forEach(tx => {
    if (tx.type !== 'BUY' && tx.type !== 'SELL') return;
    if (!tx.stockName) return;

    const current = holdingsMap.get(tx.stockName) || { name: tx.stockName, quantity: 0, invested: 0, avgPrice: 0 };
    
    if (tx.type === 'BUY') {
      current.quantity += tx.quantity || 0;
      current.invested += tx.amount;
      current.avgPrice = current.quantity > 0 ? current.invested / current.quantity : 0;
    } else if (tx.type === 'SELL') {
      const sellQty = Math.min(tx.quantity || 0, current.quantity);
      const costBasis = current.avgPrice * sellQty;
      current.quantity -= sellQty;
      current.invested -= costBasis;
    }
    
    if (current.quantity > 0) {
      holdingsMap.set(tx.stockName, current);
    } else {
      holdingsMap.delete(tx.stockName);
    }
  });

  return Array.from(holdingsMap.values());
};

export const calculateSummary = (transactions: Transaction[], holdings: any[]) => {
  // 1. 현금 잔고 계산
  const cashBalance = transactions.reduce((acc, tx) => {
    if (tx.type === 'DEPOSIT' || tx.type === 'SELL' || tx.type === 'DIVIDEND') return acc + tx.amount;
    if (tx.type === 'WITHDRAWAL' || tx.type === 'BUY') return acc - tx.amount;
    return acc;
  }, 0);

  // 2. 주식 평가금액 (매수 원가 기준)
  const stockValue = holdings.reduce((acc, h) => acc + h.invested, 0);
  const totalAssets = cashBalance + stockValue;

  // 3. 누적 순입금액 계산 (입금 총액 - 출금 총액)
  const totalDeposits = transactions
    .filter(t => t.type === 'DEPOSIT')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawals = transactions
    .filter(t => t.type === 'WITHDRAWAL')
    .reduce((acc, t) => acc + t.amount, 0);
  const netInvested = totalDeposits - totalWithdrawals;

  // 4. 전체 수익금 및 수익률 (MWRR 기반)
  const totalProfit = totalAssets - netInvested;
  const roi = netInvested > 0 ? (totalProfit / netInvested) * 100 : 0;
  
  // 5. 실현 손익 계산
  let totalRealized = 0;
  const tempHoldings = new Map<string, { qty: number, avg: number }>();
  
  [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(tx => {
    if (!tx.stockName) {
      if (tx.type === 'DIVIDEND') totalRealized += tx.amount;
      return;
    }
    const h = tempHoldings.get(tx.stockName) || { qty: 0, avg: 0 };
    
    if (tx.type === 'BUY') {
      const newQty = h.qty + (tx.quantity || 0);
      const newTotal = (h.qty * h.avg) + tx.amount;
      h.avg = newQty > 0 ? newTotal / newQty : 0;
      h.qty = newQty;
      tempHoldings.set(tx.stockName, h);
    } else if (tx.type === 'SELL') {
      const sellQty = tx.quantity || 0;
      const profit = tx.amount - (h.avg * sellQty);
      totalRealized += profit;
      h.qty -= sellQty;
      tempHoldings.set(tx.stockName, h);
    } else if (tx.type === 'DIVIDEND') {
      totalRealized += tx.amount;
    }
  });

  return {
    totalAssets,
    cashBalance,
    netInvested,
    totalProfit,
    roi,
    totalRealized
  };
};
