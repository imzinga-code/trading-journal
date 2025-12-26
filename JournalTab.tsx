
import React, { useState, useMemo } from 'react';
import { Transaction, Account } from './types';
import { formatCurrency } from './utils/calculations';
import { Search, Edit2, Trash2, BrainCircuit } from 'lucide-react';
import { cn } from './utils/ui';

interface JournalTabProps {
  transactions: Transaction[];
  accounts: Account[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAskAi: () => void;
}

/**
 * 성능 최적화를 위한 개별 거래 행 컴포넌트
 */
const TransactionRow = React.memo(({ 
  tx, 
  accountName, 
  onEdit, 
  onDelete 
}: { 
  tx: Transaction; 
  accountName: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}) => {
  const getTransactionBadge = (type: string) => {
    switch(type) {
      case 'BUY': return <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded-md text-[10px] font-black whitespace-nowrap">매수</span>;
      case 'SELL': return <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded-md text-[10px] font-black whitespace-nowrap">매도</span>;
      case 'DIVIDEND': return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-500 rounded-md text-[10px] font-black whitespace-nowrap">배당</span>;
      default: return <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[10px] font-black whitespace-nowrap">{type}</span>;
    }
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50">
      <td className="px-4 sm:px-8 py-6 text-[11px] sm:text-xs font-black text-slate-500">{tx.date}</td>
      <td className="px-4 sm:px-8 py-6">{getTransactionBadge(tx.type)}</td>
      <td className="px-4 sm:px-8 py-6 font-black text-slate-800 text-sm">{tx.stockName || '-'}</td>
      <td className="px-4 sm:px-8 py-6 text-right">
        <div className="text-xs font-bold text-slate-600">{tx.quantity ? `${tx.quantity.toLocaleString()}주` : '-'}</div>
        <div className="text-[10px] text-slate-400 font-medium">{tx.price ? `₩${formatCurrency(tx.price)}` : ''}</div>
      </td>
      <td className="px-4 sm:px-8 py-6 text-right">
        <span className={cn("font-black tracking-tighter text-sm", tx.type === 'BUY' || tx.type === 'WITHDRAWAL' ? "text-slate-800" : "text-indigo-600")}>
          ₩{formatCurrency(tx.amount)}
        </span>
      </td>
      <td className="px-4 sm:px-8 py-6 hidden md:table-cell">
        <p className="text-xs font-medium text-slate-400 truncate max-w-[150px]" title={tx.memo}>{tx.memo || '-'}</p>
      </td>
      <td className="px-4 sm:px-8 py-6">
        <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(tx)}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={() => { if(confirm('이 거래 기록을 삭제하시겠습니까?')) onDelete(tx.id); }}
            className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export const JournalTab: React.FC<JournalTabProps> = ({
  transactions,
  accounts,
  onEditTransaction,
  onDeleteTransaction,
  onAskAi
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');

  // 필터링된 거래 내역 (메모이제이션)
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.stockName?.toLowerCase().includes(query) ||
        tx.memo?.toLowerCase().includes(query)
      );
    }

    if (filterType !== 'ALL') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    if (filterAccount !== 'ALL') {
      filtered = filtered.filter(tx => tx.accountId === filterAccount);
    }

    if (dateRange !== 'ALL') {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === 'WEEK') cutoff.setDate(now.getDate() - 7);
      else if (dateRange === 'MONTH') cutoff.setMonth(now.getMonth() - 1);
      else if (dateRange === 'YEAR') cutoff.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(tx => new Date(tx.date) >= cutoff);
    }

    return filtered;
  }, [transactions, searchQuery, filterType, filterAccount, dateRange]);

  // 통계 데이터 (메모이제이션)
  const stats = useMemo(() => {
    const buyTxs = filteredTransactions.filter(t => t.type === 'BUY');
    const sellTxs = filteredTransactions.filter(t => t.type === 'SELL');
    return {
      totalBuy: buyTxs.reduce((acc, t) => acc + t.amount, 0),
      totalSell: sellTxs.reduce((acc, t) => acc + t.amount, 0),
      buyCount: buyTxs.length,
      sellCount: sellTxs.length,
    };
  }, [filteredTransactions]);

  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach(acc => { map[acc.id] = acc.name; });
    return map;
  }, [accounts]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-modal pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">매매일지</h2>
          <p className="text-sm text-slate-400 font-medium">나의 투자 발자취를 관리하고 분석합니다.</p>
        </div>
        <button 
          onClick={onAskAi}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <BrainCircuit size={18} />
          AI 매매 분석
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">총 매수</p>
          <p className="text-lg sm:text-xl font-black text-rose-500 tracking-tighter truncate">₩{formatCurrency(stats.totalBuy)}</p>
          <p className="text-[10px] text-slate-300 font-bold mt-1">{stats.buyCount}건</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">총 매도</p>
          <p className="text-lg sm:text-xl font-black text-blue-500 tracking-tighter truncate">₩{formatCurrency(stats.totalSell)}</p>
          <p className="text-[10px] text-slate-300 font-bold mt-1">{stats.sellCount}건</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">실현 손익</p>
          <p className={`text-lg sm:text-xl font-black tracking-tighter truncate ${stats.totalSell - stats.totalBuy >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
            {stats.totalSell - stats.totalBuy >= 0 ? '+' : ''}₩{formatCurrency(stats.totalSell - stats.totalBuy)}
          </p>
          <p className="text-[10px] text-slate-300 font-bold mt-1">차익 기준</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">거래수</p>
          <p className="text-lg sm:text-xl font-black text-indigo-600 tracking-tighter">{filteredTransactions.length}건</p>
          <p className="text-[10px] text-slate-300 font-bold mt-1">입출금 포함</p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="종목명 또는 메모 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all border-none"
          />
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 sm:px-4 py-3.5 bg-slate-50 rounded-2xl font-bold text-[11px] sm:text-xs border-none outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="ALL">전체 유형</option>
            <option value="BUY">매수</option>
            <option value="SELL">매도</option>
            <option value="DIVIDEND">배당</option>
            <option value="DEPOSIT">입금</option>
            <option value="WITHDRAWAL">출금</option>
          </select>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="px-3 sm:px-4 py-3.5 bg-slate-50 rounded-2xl font-bold text-[11px] sm:text-xs border-none outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="ALL">모든 계좌</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 sm:px-4 py-3.5 bg-slate-50 rounded-2xl font-bold text-[11px] sm:text-xs border-none outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="ALL">전체 기간</option>
            <option value="WEEK">최근 1주</option>
            <option value="MONTH">최근 1달</option>
            <option value="YEAR">최근 1년</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">날짜</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">유형</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">종목명</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">수량 / 단가</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">거래금액</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">메모</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <p className="text-sm font-bold text-slate-300">표시할 거래 내역이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <TransactionRow 
                    key={tx.id} 
                    tx={tx} 
                    accountName={accountMap[tx.accountId] || '알 수 없음'}
                    onEdit={onEditTransaction}
                    onDelete={onDeleteTransaction}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
