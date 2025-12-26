
import React, { useMemo } from 'react';
import { Account, Transaction, TaxType } from './types';
import { formatCurrency } from './utils/calculations';
import { Briefcase, Plus, Edit2, Trash2, Shield } from 'lucide-react';

interface AccountsTabProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
}

/**
 * 성능 최적화를 위한 개별 계좌 카드 컴포넌트
 */
const AccountCard = React.memo(({ 
  account, 
  stats, 
  onEdit, 
  onDelete 
}: { 
  account: Account; 
  stats: any;
  onEdit: (acc: Account) => void;
  onDelete: (id: string) => void;
}) => {
  const getTaxTypeLabel = (taxType: TaxType) => {
    const labels: Record<TaxType, string> = {
      GENERAL: '일반 위탁',
      PENSION: '연금저축',
      IRP: 'IRP',
      ISA: 'ISA',
    };
    return labels[taxType];
  };

  const getTaxTypeBadgeColor = (taxType: TaxType) => {
    const colors: Record<TaxType, string> = {
      GENERAL: 'bg-slate-100 text-slate-600',
      PENSION: 'bg-emerald-50 text-emerald-600',
      IRP: 'bg-blue-50 text-blue-600',
      ISA: 'bg-purple-50 text-purple-600',
    };
    return colors[taxType];
  };

  return (
    <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
      <div className="p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 ${account.color || 'bg-indigo-600'} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0`}>
              <Briefcase size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{account.name}</h3>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black whitespace-nowrap ${getTaxTypeBadgeColor(account.taxType)}`}>
                  {getTaxTypeLabel(account.taxType)}
                </span>
              </div>
              <p className="text-sm text-slate-400 font-bold mt-1">{account.broker}</p>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-start lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(account)}
              className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => {
                if (confirm(`'${account.name}' 계좌를 삭제하시겠습니까? 관련된 모든 거래 내역도 삭제됩니다.`)) {
                  onDelete(account.id);
                }
              }}
              className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-slate-50 p-4 sm:p-6 rounded-3xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">총 자산</p>
            <p className="text-lg sm:text-xl font-black text-indigo-600 tracking-tighter">₩{formatCurrency(stats.totalAssets)}</p>
          </div>
          <div className="bg-slate-50 p-4 sm:p-6 rounded-3xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">현금 잔고</p>
            <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tighter">₩{formatCurrency(stats.cashBalance)}</p>
          </div>
          <div className="bg-slate-50 p-4 sm:p-6 rounded-3xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">평가 수익</p>
            <p className={`text-lg sm:text-xl font-black tracking-tighter ${stats.totalProfit >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
              {stats.totalProfit >= 0 ? '+' : ''}₩{formatCurrency(stats.totalProfit)}
            </p>
          </div>
          <div className="bg-slate-50 p-4 sm:p-6 rounded-3xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">수익률</p>
            <p className={`text-lg sm:text-xl font-black tracking-tighter ${stats.roi >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-y-4 gap-x-8 pt-6 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">보유 종목</span>
            <span className="text-xs sm:text-sm font-black text-slate-600">{stats.holdingsCount}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">거래 횟수</span>
            <span className="text-xs sm:text-sm font-black text-slate-600">{stats.txCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">누적 순입금</span>
            <span className="text-xs sm:text-sm font-black text-slate-600">₩{formatCurrency(stats.netInvested)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export const AccountsTab: React.FC<AccountsTabProps> = ({
  accounts,
  transactions,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}) => {
  // 계좌별 통계 계산 (메모이제이션)
  const accountStats = useMemo(() => {
    return accounts.map(account => {
      const accountTxs = transactions.filter(tx => tx.accountId === account.id);
      
      const deposits = accountTxs.filter(t => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
      const withdrawals = accountTxs.filter(t => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);
      const buys = accountTxs.filter(t => t.type === 'BUY').reduce((acc, t) => acc + t.amount, 0);
      const sells = accountTxs.filter(t => t.type === 'SELL').reduce((acc, t) => acc + t.amount, 0);
      const dividends = accountTxs.filter(t => t.type === 'DIVIDEND').reduce((acc, t) => acc + t.amount, 0);

      const cashBalance = deposits - withdrawals - buys + sells + dividends;
      const netInvested = deposits - withdrawals;
      
      const holdingsMap = new Map<string, { qty: number, invested: number }>();
      [...accountTxs]
        .filter(tx => tx.type === 'BUY' || tx.type === 'SELL')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(tx => {
          if (!tx.stockName) return;
          const current = holdingsMap.get(tx.stockName) || { qty: 0, invested: 0 };
          
          if (tx.type === 'BUY') {
            current.qty += tx.quantity || 0;
            current.invested += tx.amount;
          } else if (tx.type === 'SELL') {
            const avgPrice = current.qty > 0 ? current.invested / current.qty : 0;
            const sellQty = Math.min(tx.quantity || 0, current.qty);
            current.qty -= sellQty;
            current.invested -= avgPrice * sellQty;
          }
          
          if (current.qty > 0) holdingsMap.set(tx.stockName, current);
          else holdingsMap.delete(tx.stockName);
        });

      const stockValue = Array.from(holdingsMap.values()).reduce((acc, h) => acc + h.invested, 0);
      const totalAssets = cashBalance + stockValue;
      const totalProfit = totalAssets - netInvested;
      const roi = netInvested > 0 ? (totalProfit / netInvested) * 100 : 0;

      return {
        account,
        stats: {
          cashBalance,
          stockValue,
          totalAssets,
          netInvested,
          totalProfit,
          roi,
          holdingsCount: holdingsMap.size,
          txCount: accountTxs.length,
        }
      };
    });
  }, [accounts, transactions]);

  const summary = useMemo(() => {
    const totalAssetsSum = accountStats.reduce((acc, s) => acc + s.stats.totalAssets, 0);
    const totalProfitSum = accountStats.reduce((acc, s) => acc + s.stats.totalProfit, 0);
    const avgRoi = accounts.length > 0 ? accountStats.reduce((acc, s) => acc + s.stats.roi, 0) / accounts.length : 0;
    return { totalAssetsSum, totalProfitSum, avgRoi };
  }, [accountStats, accounts.length]);

  return (
    <div className="space-y-8 animate-modal pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">계좌 관리</h2>
          <p className="text-sm text-slate-400 font-medium">다양한 투자 계좌의 성과를 한눈에 비교하고 관리하세요.</p>
        </div>
        <button
          onClick={onAddAccount}
          className="px-6 py-3.5 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 w-full sm:w-auto justify-center"
        >
          <Plus size={18} /> 계좌 추가
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">총 계좌 수</p>
          <p className="text-xl font-black text-slate-800 tracking-tighter">{accounts.length}개</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">전체 자산</p>
          <p className="text-xl font-black text-indigo-600 tracking-tighter truncate">₩{formatCurrency(summary.totalAssetsSum)}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">전체 수익</p>
          <p className={`text-xl font-black tracking-tighter truncate ${summary.totalProfitSum >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
            {summary.totalProfitSum >= 0 ? '+' : ''}₩{formatCurrency(summary.totalProfitSum)}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">평균 수익률</p>
          <p className={`text-xl font-black tracking-tighter ${summary.avgRoi >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
            {summary.avgRoi >= 0 ? '+' : ''}{summary.avgRoi.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {accountStats.map(({ account, stats }) => (
          <AccountCard 
            key={account.id} 
            account={account} 
            stats={stats} 
            onEdit={onEditAccount} 
            onDelete={onDeleteAccount} 
          />
        ))}

        {accounts.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-16 sm:p-20 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Briefcase size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-400 mb-2">등록된 계좌가 없습니다</h3>
            <p className="text-sm text-slate-400 font-medium mb-10 leading-relaxed">첫 번째 투자 계좌를 추가하고<br className="hidden sm:block"/> 스마트한 매매 관리를 시작해보세요.</p>
            <button
              onClick={onAddAccount}
              className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100"
            >
              지금 계좌 추가하기
            </button>
          </div>
        )}
      </div>

      {accounts.some(a => a.taxType !== 'GENERAL') && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Shield size={28} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-800 mb-4 tracking-tight">세금 혜택 계좌 가이드</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">연금저축/IRP:</strong> 연 최대 900만원 세액공제 가능. 13.2% ~ 16.5%의 환급 혜택을 받을 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">ISA:</strong> 배당소득 비과세 및 저율과세 혜택. 일반형 200만원, 서민형 400만원까지 비과세됩니다.
                    </p>
                  </div>
                </div>
                <div className="bg-white/60 rounded-2xl p-6 border border-indigo-100/50 hidden sm:block">
                  <p className="text-xs font-black text-indigo-600 mb-2 uppercase tracking-widest">TIP</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    자산배분 투자 시 세금 혜택 계좌를 우선 활용하면 복리 효과를 극대화할 수 있습니다. 각 계좌 납입 한도를 확인하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
