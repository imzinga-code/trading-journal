
import React, { useMemo } from 'react';
import { Transaction, Account } from './types';
import { getHoldings, calculateSummary } from './utils/calculations';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, Target } from 'lucide-react';
import { formatCurrency } from './utils/calculations';
// Fix: Import 'cn' utility for conditional class names
import { cn } from './utils/ui';

interface PortfolioStatsTabProps {
  transactions: Transaction[];
  accounts: Account[];
}

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const PortfolioStatsTab: React.FC<PortfolioStatsTabProps> = ({
  transactions,
  accounts,
}) => {
  const holdings = useMemo(() => getHoldings(transactions), [transactions]);
  const summary = useMemo(() => calculateSummary(transactions, holdings), [transactions, holdings]);

  // 자산 비중 데이터 (파이 차트용)
  const assetAllocation = useMemo(() => {
    const data = holdings.map(h => ({
      name: h.name,
      value: h.invested
    })).sort((a, b) => b.value - a.value);

    // 현금 비중 추가
    if (summary.cashBalance > 0) {
      data.push({ name: '현금', value: summary.cashBalance });
    }
    
    return data;
  }, [holdings, summary.cashBalance]);

  // 계좌별 자산 현황 (바 차트용)
  const accountDistribution = useMemo(() => {
    return accounts.map(acc => {
      const accTxs = transactions.filter(t => t.accountId === acc.id);
      const accHoldings = getHoldings(accTxs);
      const accSummary = calculateSummary(accTxs, accHoldings);
      return {
        name: acc.name,
        value: accSummary.totalAssets
      };
    }).sort((a, b) => b.value - a.value);
  }, [accounts, transactions]);

  return (
    <div className="space-y-8 animate-modal pb-20">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-800">분석 리포트</h2>
        <p className="text-sm text-slate-400 font-medium">나의 투자 포트폴리오를 시각적으로 분석합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 자산 비중 차트 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <PieIcon size={20} />
            </div>
            <h3 className="font-black text-lg text-slate-800">자산 비중 분석</h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `₩${formatCurrency(value)}`}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 계좌별 분포 차트 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <h3 className="font-black text-lg text-slate-800">계좌별 자산 분포</h3>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => `₩${formatCurrency(value)}`}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 투자 현황 요약 */}
      <div className="bg-slate-900 text-white p-8 sm:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <TrendingUp size={240} strokeWidth={3} />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-8">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={14} className="text-indigo-400" /> 총 투자 금액
            </p>
            <h4 className="text-3xl font-black tracking-tighter">₩{formatCurrency(summary.netInvested)}</h4>
            <p className="text-xs text-slate-500 font-bold mt-2">순입금액 기준</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-rose-400" /> 전체 평가 손익
            </p>
            {/* Fix: use imported cn utility */}
            <h4 className={cn("text-3xl font-black tracking-tighter", summary.totalProfit >= 0 ? "text-rose-400" : "text-blue-400")}>
              {summary.totalProfit >= 0 ? '+' : ''}₩{formatCurrency(summary.totalProfit)}
            </h4>
            <p className="text-xs text-slate-500 font-bold mt-2">수익률: {summary.roi.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-emerald-400" /> 누적 실현 수익
            </p>
            {/* Fix: use imported cn utility */}
            <h4 className={cn("text-3xl font-black tracking-tighter", summary.totalRealized >= 0 ? "text-emerald-400" : "text-blue-400")}>
              {summary.totalRealized >= 0 ? '+' : ''}₩{formatCurrency(summary.totalRealized)}
            </h4>
            <p className="text-xs text-slate-500 font-bold mt-2">매도 확정 금액</p>
          </div>
        </div>
      </div>
    </div>
  );
};
