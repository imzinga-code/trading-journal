
import React, { useState } from 'react';
import { Upload, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { Transaction } from './types';

interface HoldingInput {
  tempId: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
}

interface BulkImportProps {
  accountId: string;
  onComplete: (transactions: Transaction[]) => void;
  onCancel: () => void;
}

export const BulkHoldingsImport: React.FC<BulkImportProps> = ({
  accountId,
  onComplete,
  onCancel,
}) => {
  const [holdings, setHoldings] = useState<HoldingInput[]>([]);
  const [importMethod, setImportMethod] = useState<'manual' | 'csv'>('manual');

  // CSV 파일 업로드 처리
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // CSV 파싱 (종목명, 수량, 평단가)
        const parsed = lines.slice(1).map((line, idx) => {
          const [stockName, quantity, avgPrice] = line.split(',').map(s => s.trim());
          return {
            tempId: `temp_${idx}`,
            stockName: stockName || '',
            quantity: Number(quantity) || 0,
            avgPrice: Number(avgPrice) || 0,
          };
        }).filter(h => h.stockName && h.quantity > 0 && h.avgPrice > 0);

        setHoldings(parsed);
        alert(`${parsed.length}개 종목을 불러왔습니다.`);
      } catch (err) {
        alert('CSV 파일 형식이 올바르지 않습니다.');
      }
    };
    reader.readAsText(file);
  };

  // 수동 입력 행 추가
  const addManualRow = () => {
    setHoldings([
      ...holdings,
      {
        tempId: `temp_${Date.now()}`,
        stockName: '',
        quantity: 0,
        avgPrice: 0,
      },
    ]);
  };

  // 행 삭제
  const removeRow = (tempId: string) => {
    setHoldings(holdings.filter(h => h.tempId !== tempId));
  };

  // 입력값 변경
  const updateHolding = (tempId: string, field: keyof HoldingInput, value: any) => {
    setHoldings(holdings.map(h =>
      h.tempId === tempId ? { ...h, [field]: value } : h
    ));
  };

  // 완료 처리 - Transaction으로 변환
  const handleComplete = () => {
    if (holdings.length === 0) {
      alert('보유 종목을 입력해주세요.');
      return;
    }

    const invalidRows = holdings.filter(h => 
      !h.stockName || h.quantity <= 0 || h.avgPrice <= 0
    );

    if (invalidRows.length > 0) {
      alert('모든 항목을 올바르게 입력해주세요.');
      return;
    }

    // 각 보유 종목을 BUY 거래로 변환
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 1); // 어제 날짜로 설정

    const transactions: Transaction[] = holdings.map((h, idx) => ({
      id: Math.random().toString(36).substr(2, 9),
      accountId: accountId,
      date: new Date(baseDate.getTime() - idx * 1000).toISOString().slice(0, 10), // 순차적으로 이전 날짜
      type: 'BUY' as const,
      stockName: h.stockName,
      amount: h.quantity * h.avgPrice,
      price: h.avgPrice,
      quantity: h.quantity,
      memo: '기존 보유 종목 일괄 등록',
    }));

    onComplete(transactions);
  };

  return (
    <div className="space-y-6 text-left animate-modal">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">기존 보유 종목 등록</h3>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setImportMethod('manual')}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all ${
              importMethod === 'manual'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            수동 입력
          </button>
          <button
            onClick={() => setImportMethod('csv')}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all ${
              importMethod === 'csv'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            파일 업로드
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 font-medium leading-relaxed">
        계좌 개설 전에 이미 보유하고 있던 종목들을 한꺼번에 등록할 수 있습니다. 
        입력된 정보는 '매수' 기록으로 자동 생성됩니다.
      </p>

      {importMethod === 'csv' ? (
        <div className="space-y-4">
          <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-colors group">
            <label className="flex flex-col items-center gap-4 cursor-pointer">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                <FileSpreadsheet size={32} />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-700">CSV 파일 업로드</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  종목명, 수량, 평단가 형식의 CSV 파일
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <span className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                파일 선택하기
              </span>
            </label>
          </div>
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <p className="text-[10px] font-black text-blue-600 mb-2 flex items-center gap-1.5">
              <div className="w-1 h-1 bg-blue-600 rounded-full" /> CSV 작성 가이드
            </p>
            <pre className="text-[9px] text-blue-800 font-mono bg-white/60 p-3 rounded-xl overflow-x-auto">
{`종목명,수량,평단가
삼성전자,100,75000
SK하이닉스,50,120000`}
            </pre>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
          {holdings.length === 0 && (
            <div className="py-10 text-center bg-slate-50 rounded-3xl border border-slate-100">
               <p className="text-xs text-slate-400 font-bold">등록된 종목이 없습니다.<br/>아래 버튼을 눌러 종목을 추가하세요.</p>
            </div>
          )}
          {holdings.map((holding) => (
            <div
              key={holding.tempId}
              className="flex gap-2 items-center bg-white border border-slate-100 p-2 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <input
                type="text"
                placeholder="종목명"
                value={holding.stockName}
                onChange={(e) =>
                  updateHolding(holding.tempId, 'stockName', e.target.value)
                }
                className="flex-[2] min-w-0 p-3 bg-slate-50 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <input
                type="number"
                placeholder="수량"
                value={holding.quantity || ''}
                onChange={(e) =>
                  updateHolding(holding.tempId, 'quantity', Number(e.target.value))
                }
                className="flex-1 min-w-0 p-3 bg-slate-50 rounded-xl font-black text-xs text-right outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <input
                type="number"
                placeholder="평단가"
                value={holding.avgPrice || ''}
                onChange={(e) =>
                  updateHolding(holding.tempId, 'avgPrice', Number(e.target.value))
                }
                className="flex-[1.5] min-w-0 p-3 bg-slate-50 rounded-xl font-black text-xs text-right outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                onClick={() => removeRow(holding.tempId)}
                className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addManualRow}
            className="w-full py-4 border-2 border-dashed border-slate-100 text-slate-400 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-slate-600 transition-all text-xs"
          >
            <Plus size={16} /> 종목 추가하기
          </button>
        </div>
      )}

      {holdings.length > 0 && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">총 등록 종목</p>
            <p className="text-sm font-black">{holdings.length}개</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">총 투자 자산</p>
            <p className="text-lg font-black text-emerald-400">
              ₩{holdings
                .reduce((acc, h) => acc + h.quantity * h.avgPrice, 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-sm"
        >
          나중에 하기
        </button>
        <button
          onClick={handleComplete}
          className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-sm"
        >
          데이터 등록 완료
        </button>
      </div>
    </div>
  );
};
