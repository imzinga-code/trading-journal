
export type TaxType = 'GENERAL' | 'PENSION' | 'IRP' | 'ISA';
export type TxType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND';
export type StrategyGroup = 'Routine' | 'Active' | 'Event';
export type Emotion = 'Calm' | 'Excited' | 'Fear' | 'Greed';

export interface Account {
  id: string;
  name: string;
  broker: string;
  taxType: TaxType;
  initialBudget: number;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  type: TxType;
  stockName?: string;
  amount: number;
  price?: number;
  quantity?: number;
  memo?: string;
  strategy?: StrategyGroup;
  emotion?: Emotion;
}

export interface MarketData {
  currentPrice: number;
  high52w: number;
  low52w: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
}

export interface TaxStats {
  pensionUsed: number;
  pensionLimit: number;
  irpUsed: number;
  irpLimit: number;
  isaUsed: number;
  isaLimit: number;
  combinedPensionIRPUsed: number;
  combinedLimit: number;
}
