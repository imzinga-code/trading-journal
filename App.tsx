import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, LayoutDashboard, List, TrendingUp, 
  Settings, X, Menu, RefreshCw, Sparkles,
  Zap, Info, Briefcase, Search, LogOut, 
  PieChart as PieIcon, Layers, Download, Upload,
  Cloud, CloudLightning, Loader2, CheckCircle2,
  Lock, BrainCircuit, Smile, Frown, Activity,
  AlertCircle, CheckCircle, InfoIcon, ShieldCheck, Target, CreditCard, Lightbulb
} from 'lucide-react';
import { Transaction, Account, TxType, TaxType, Emotion, StrategyGroup, TaxStats } from './types';
import { formatCurrency, getHoldings, calculateSummary, calculateTaxStats } from './utils/calculations';
import { validateTransaction } from './utils/validation';
import { searchStockInfo, StockSearchResult, getPortfolioAdvice } from './services/geminiService';
import { sheetsService } from './services/googleSheetsService';
import { BulkHoldingsImport } from './BulkHoldingsImport';
import { JournalTab } from './JournalTab';
import { AccountsTab } from './AccountsTab';
import { PortfolioStatsTab } from './PortfolioStatsTab';
import { cn } from './utils/ui';

// --- Toast Types ---
type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const App: React.FC = () => {
  // --- States ---
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('af_accounts_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('af_tx_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => localStorage.getItem('af_spreadsheet_id') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'stats' | 'journal' | 'accounts' | 'settings'>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState(accounts.length === 0);
  const [migrationStep, setMigrationStep] = useState<'account' | 'holdings'>('account');
  const [onboardingAccountId, setOnboardingAccountId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Transaction Modal Specific States
  const [formTxType, setFormTxType] = useState<TxType>('BUY');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [modalPrice, setModalPrice] = useState<string>(''); 
  const [modalQuantity, setModalQuantity] = useState<string>('');
  const [modalAmount, setModalAmount] = useState<string>('');
  const [modalMemo, setModalMemo] = useState<string>('');
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [modalEmotion, setModalEmotion] = useState<Emotion>('Calm');
  const [modalStrategy, setModalStrategy] = useState<StrategyGroup>('Routine');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txValidationErrors, setTxValidationErrors] = useState<string[]>([]);

  // Account Modal Specific States
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accName, setAccName] = useState('');
  const [accBroker, setAccBroker] = useState('');
  const [accTaxType, setAccTaxType] = useState<TaxType>('GENERAL');
  const [accBudget, setAccBudget] = useState('');

  // Onboarding State - 개선된 초기화
  const [migrationBudget, setMigrationBudget] = useState('');     
  const [stockNameInput, setStockNameInput] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- Persistence ---
  useEffect(() => { localStorage.setItem('af_accounts_v2', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('af_tx_v2', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('af_spreadsheet_id', spreadsheetId); }, [spreadsheetId]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  // --- Toast Handler ---
  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // --- Data Export Handler ---
  const handleExportData = useCallback((isAuto = false) => {
    const blob = new Blob([JSON.stringify({ accounts, transactions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assetflow_${isAuto ? 'auto_' : ''}backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast(isAuto ? '일일 정기 백업이 완료되었습니다.' : '백업 파일 다운로드가 시작되었습니다.');
  }, [accounts, transactions, addToast]);

  // --- Automatic Backup Effect ---
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    const scheduleBackup = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      timerId = setTimeout(() => {
        handleExportData(true);
        scheduleBackup(); // 다음 백업 예약
      }, timeUntilMidnight);
    };
    
    scheduleBackup();
    return () => clearTimeout(timerId);
  }, [handleExportData]);

  // --- Cloud Sync Logic ---
  const handleGoogleAuth = async () => {
    try {
      await sheetsService.authorize();
      setIsAuthorized(true);
      addToast('Google 계정 인증에 성공했습니다.');
    } catch (err) {
      addToast('인증에 실패했습니다. 관리자에게 문의하세요.', 'error');
    }
  };

  const fetchDataFromCloud = async () => {
    if (!spreadsheetId) {
      addToast('Spreadsheet ID를 먼저 입력해주세요.', 'info');
      return;
    }
    if (!isAuthorized) await handleGoogleAuth();
    
    setIsLoading(true);
    try {
      sheetsService.setSpreadsheetId(spreadsheetId);
      const cloudAccounts = await sheetsService.fetchAccounts();
      const cloudTransactions = await sheetsService.fetchTransactions();
      setAccounts(cloudAccounts);
      setTransactions(cloudTransactions);
      addToast('클라우드 데이터 동기화가 완료되었습니다.');
    } catch (e) {
      addToast('데이터 로드에 실패했습니다. 설정을 확인하세요.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const syncToCloud = async (action: 'TX' | 'ACC', data: any) => {
    if (!spreadsheetId || !isAuthorized) return;
    setIsSyncing(true);
    try {
      sheetsService.setSpreadsheetId(spreadsheetId);
      if (action === 'TX') await sheetsService.addTransaction(data);
      if (action === 'ACC') await sheetsService.addAccount(data);
    } catch (e) {
      console.error("Cloud Sync Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Derived Calculations ---
  const holdings = useMemo(() => getHoldings(transactions), [transactions]);
  const summary = useMemo(() => calculateSummary(transactions, holdings), [transactions, holdings]);
  const taxStats = useMemo(() => calculateTaxStats(transactions, accounts), [transactions, accounts]);

  // --- Handlers ---
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.accounts && json.transactions) {
          setAccounts(json.accounts);
          setTransactions(json.transactions);
          addToast('데이터가 성공적으로 복구되었습니다.');
        }
      } catch (err) { addToast('올바르지 않은 파일 형식입니다.', 'error'); }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? 로컬 저장소가 초기화됩니다.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleAddAccount = (data: { name: string, broker: string, taxType: TaxType, budget: number }) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newAcc = { id: newId, ...data, initialBudget: data.budget, color: 'bg-indigo-600' };
    setAccounts(prev => [...prev, newAcc]);
    syncToCloud('ACC', newAcc);
    
    if (data.budget > 0) {
      const tx: Transaction = { id: Math.random().toString(36).substr(2, 9), accountId: newId, date: new Date().toISOString().slice(0, 10), type: 'DEPOSIT', amount: data.budget, memo: '초기 자본' };
      setTransactions(prev => [...prev, tx]);
      syncToCloud('TX', tx);
    }
    
    setOnboardingAccountId(newId);
    setMigrationStep('holdings');
    addToast('첫 계좌가 성공적으로 등록되었습니다.');
  };

  const handleBulkImportComplete = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);
    newTransactions.forEach(tx => syncToCloud('TX', tx));
    setIsMigrationOpen(false);
    addToast(`${newTransactions.length}개 종목 등록이 완료되었습니다.`);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    addToast('거래 기록이 삭제되었습니다.');
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setFormTxType(tx.type);
    setSelectedAccountId(tx.accountId);
    setModalDate(tx.date);
    setStockNameInput(tx.stockName || '');
    setModalPrice(tx.price ? formatNumberWithCommas(tx.price.toString()) : '');
    setModalQuantity(tx.quantity ? formatNumberWithCommas(tx.quantity.toString()) : '');
    setModalAmount(formatNumberWithCommas(tx.amount.toString()));
    setModalMemo(tx.memo || '');
    setModalEmotion(tx.emotion || 'Calm');
    setModalStrategy(tx.strategy || 'Routine');
    setTxValidationErrors([]);
    setIsTxModalOpen(true);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isTrading = ['BUY', 'SELL'].includes(formTxType);
    const price = Number(modalPrice.toString().replace(/,/g, ''));
    const qty = Number(modalQuantity.toString().replace(/,/g, ''));
    const amountVal = isTrading ? (price * qty) : Number(modalAmount.replace(/,/g, '') || 0);
    
    const txData: Transaction = {
      id: editingTxId || Math.random().toString(36).substr(2, 9),
      accountId: selectedAccountId,
      date: modalDate,
      type: formTxType,
      stockName: isTrading ? stockNameInput : undefined,
      amount: amountVal,
      price: isTrading ? price : undefined,
      quantity: isTrading ? qty : undefined,
      memo: modalMemo,
      emotion: isTrading ? modalEmotion : undefined,
      strategy: isTrading ? modalStrategy : undefined,
    };

    const errors = validateTransaction(txData);
    if (errors.length > 0) {
      setTxValidationErrors(errors);
      return;
    }

    if (editingTxId) {
      setTransactions(prev => prev.map(t => t.id === editingTxId ? txData : t));
      addToast('거래 기록이 수정되었습니다.');
    } else {
      setTransactions(prev => [...prev, txData]);
      syncToCloud('TX', txData);
      addToast('새로운 거래가 기록되었습니다.');
    }
    
    setIsTxModalOpen(false);
    resetModal();
  };

  const resetModal = () => { 
    setEditingTxId(null);
    setFormTxType('BUY'); 
    setModalPrice(''); 
    setModalQuantity(''); 
    setModalAmount(''); 
    setModalMemo('');
    setModalEmotion('Calm');
    setModalStrategy('Routine');
    setModalDate(new Date().toISOString().slice(0, 10));
    setStockNameInput(''); 
    setSearchResults([]); 
    setTxValidationErrors([]);
  };

  const handleOpenAccModal = (acc?: Account) => {
    if (acc) {
      setEditingAccountId(acc.id);
      setAccName(acc.name);
      setAccBroker(acc.broker);
      setAccTaxType(acc.taxType);
      setAccBudget(formatNumberWithCommas(acc.initialBudget.toString()));
    } else {
      setEditingAccountId(null);
      setAccName('');
      setAccBroker('');
      setAccTaxType('GENERAL');
      setAccBudget('');
    }
    setIsAccModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetValue = Number(accBudget.replace(/,/g, '')) || 0;
    
    if (editingAccountId) {
      setAccounts(prev => prev.map(a => a.id === editingAccountId ? { 
        ...a, name: accName, broker: accBroker, taxType: accTaxType, initialBudget: budgetValue 
      } : a));
      addToast('계좌 정보가 수정되었습니다.');
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      const newAcc: Account = {
        id: newId, name: accName, broker: accBroker, taxType: accTaxType, initialBudget: budgetValue, color: 'bg-indigo-600'
      };
      setAccounts(prev => [...prev, newAcc]);
      syncToCloud('ACC', newAcc);
      if (budgetValue > 0) {
        const tx: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          accountId: newId,
          date: new Date().toISOString().slice(0, 10),
          type: 'DEPOSIT',
          amount: budgetValue,
          memo: '초기 설정 자금'
        };
        setTransactions(prev => [...prev, tx]);
        syncToCloud('TX', tx);
      }
      addToast('새 계좌가 등록되었습니다.');
    }
    setIsAccModalOpen(false);
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTransactions(prev => prev.filter(t => t.accountId !== id));
    addToast('계좌와 관련된 모든 기록이 삭제되었습니다.', 'info');
  };

  const handleStockSearch = async () => {
    if (!stockNameInput.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchStockInfo(stockNameInput);
      setSearchResults(results);
      if (results.length === 0) addToast('검색 결과가 없습니다.', 'info');
    } catch (error) {
      console.error("Stock Search failed:", error);
      addToast('검색 중 오류가 발생했습니다.', 'error');
    } finally { setIsSearching(false); }
  };

  const handleGetAiAdvice = async () => {
    if (holdings.length === 0) {
      addToast("분석할 종목이 없습니다.", 'info');
      return;
    }
    setIsAiLoading(true);
    setAiAdvice('');
    try {
      const advice = await getPortfolioAdvice(holdings);
      setAiAdvice(advice);
    } catch (e) {
      addToast("AI 조언을 가져오는데 실패했습니다.", 'error');
    } finally { setIsAiLoading(false); }
  };

  const formatNumberWithCommas = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString();
  };

  // --- UI Components ---
  const SidebarItem = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button 
      onClick={() => { setActiveTab(id); setIsDrawerOpen(false); }} 
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all", 
        activeTab === id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      )}
    >
      <Icon size={20} /><span>{label}</span>
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><TrendingUp size={24} /></div>
        <h1 className="text-xl font-black tracking-tighter">AssetFlow</h1>
      </div>
      <nav className="flex-1 space-y-2">
        <SidebarItem id="dashboard" label="대시보드" icon={LayoutDashboard} />
        <SidebarItem id="journal" label="매매일지" icon={List} />
        <SidebarItem id="accounts" label="계좌관리" icon={Briefcase} />
        <SidebarItem id="stats" label="분석 리포트" icon={PieIcon} />
        <SidebarItem id="settings" label="환경 설정" icon={Settings} />
      </nav>
      <button onClick={handleReset} className="mt-auto flex items-center gap-4 p-4 rounded-2xl font-bold text-rose-400 hover:bg-rose-50 transition-colors"><LogOut size={20} /> 데이터 초기화</button>
    </div>
  );

  const TaxBenefitCard = ({ stats }: { stats: TaxStats }) => {
    const renderProgressBar = (label: string, used: number, limit: number, color: string) => {
      const percentage = Math.min((used / limit) * 100, 100);
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <p className="text-sm font-black text-slate-700">{label}</p>
            <p className="text-xs font-bold text-slate-400">
              <span className="text-slate-900 font-black">₩{formatCurrency(used)}</span> / ₩{formatCurrency(limit)}
            </p>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-1000", color)} 
              style={{ width: `${percentage}%` }} 
            />
          </div>
        </div>
      );
    };

    return (
      <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm animate-modal">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 className="text-[22px] font-black tracking-tighter text-slate-800">세액공제 한도 관리</h3>
            <p className="text-xs font-bold text-slate-400">올해 입금액 기준 혜택 현황</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {renderProgressBar('연금저축', stats.pensionUsed, stats.pensionLimit, 'bg-emerald-500')}
          {renderProgressBar('IRP (퇴직연금)', stats.irpUsed, stats.irpLimit, 'bg-blue-500')}
          {renderProgressBar('ISA (절세계좌)', stats.isaUsed, stats.isaLimit, 'bg-purple-500')}
          {renderProgressBar('연금+IRP 합산', stats.combinedPensionIRPUsed, stats.combinedLimit, 'bg-indigo-600')}
        </div>

        <div className="mt-12 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100/50 flex items-start gap-4">
          <InfoIcon size={20} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            <span className="font-black text-slate-800 underline decoration-indigo-200 underline-offset-4">연금저축과 IRP를 합산하여 연 최대 900만원</span>까지 세액공제 혜택을 받을 수 있습니다. ISA 계좌는 3년 이상 유지 시 비과세 및 저율과세 혜택이 적용됩니다.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex overflow-hidden">
      {/* Toast System */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-full max-w-sm px-4">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={cn(
              "p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-modal border border-white/20 backdrop-blur-md",
              toast.type === 'success' ? "bg-emerald-500 text-white" : 
              toast.type === 'error' ? "bg-rose-500 text-white" : 
              "bg-indigo-600 text-white"
            )}
          >
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'info' && <InfoIcon size={20} />}
            <p className="text-sm font-black flex-1">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              <X size={16} className="opacity-60" />
            </button>
          </div>
        ))}
      </div>

      <aside className="hidden lg:flex flex-col w-72 h-screen bg-white border-r border-slate-100 p-8 shadow-sm shrink-0">
        <SidebarContent />
      </aside>

      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/40 z-[60] lg:hidden backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] p-8 shadow-2xl lg:hidden animate-modal">
            <SidebarContent />
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 px-6 flex items-center justify-between">
          <div className="lg:hidden flex items-center gap-2 font-black text-indigo-600">
            <TrendingUp size={20}/> <span className="text-slate-900 tracking-tighter">AssetFlow</span>
          </div>
          <div className="flex items-center gap-3">
             {isSyncing && <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-[10px] font-black animate-pulse">저장 중...</div>}
             {isLoading && <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black"><Loader2 size={14} className="animate-spin"/></div>}
             {isAuthorized && <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black">Connected</div>}
             <button onClick={() => setIsDrawerOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"><Menu size={24} /></button>
          </div>
        </header>

        <main className="flex-1 pt-24 pb-32 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-modal">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">총 자산 가치</p>
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black", summary.roi >= 0 ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500")}>
                      {summary.roi >= 0 ? '▲' : '▼'} {summary.roi.toFixed(2)}%
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tighter mb-2">₩{formatCurrency(summary.totalAssets)}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span className={summary.totalProfit >= 0 ? "text-rose-500" : "text-blue-500"}>{summary.totalProfit >= 0 ? '+' : ''}₩{formatCurrency(summary.totalProfit)}</span>
                    <span>수익 (MWRR)</span>
                  </div>
                </div>
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">가용 예수금 / 순투자원금</p>
                   <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-emerald-500 mb-2">₩{formatCurrency(summary.cashBalance)}</h3>
                   <p className="text-xs font-bold text-slate-400">원금: ₩{formatCurrency(summary.netInvested)}</p>
                </div>
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">누적 실현 손익</p>
                   <h3 className={cn("text-2xl sm:text-3xl font-black tracking-tighter mb-2", summary.totalRealized >= 0 ? "text-rose-500" : "text-blue-500")}>
                     {summary.totalRealized >= 0 ? '+' : ''}₩{formatCurrency(summary.totalRealized)}
                   </h3>
                   <p className="text-xs font-bold text-slate-400">실현 수익 합계</p>
                </div>
              </div>
              
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 sm:px-10 py-7 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <h3 className="font-black text-lg text-slate-800">보유 종목 현황</h3>
                  <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-slate-400 border border-slate-100">{holdings.length}개</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50/50">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 sm:px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">종목명</th>
                        <th className="px-6 sm:px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">평단가</th>
                        <th className="px-6 sm:px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">수량</th>
                        <th className="px-6 sm:px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">투자금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {holdings.length === 0 && (
                        <tr><td colSpan={4} className="px-6 sm:px-10 py-20 text-center font-bold text-slate-300 italic">보유 중인 종목이 없습니다.</td></tr>
                      )}
                      {holdings.map(h => (
                        <tr key={h.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 sm:px-10 py-6 font-black text-slate-800">{h.name}</td>
                          <td className="px-6 sm:px-10 py-6 text-right font-bold text-slate-600">₩{formatCurrency(h.avgPrice)}</td>
                          <td className="px-6 sm:px-10 py-6 text-right font-bold text-slate-600">{h.quantity.toLocaleString()}주</td>
                          <td className="px-6 sm:px-10 py-6 text-right font-black text-indigo-600">₩{formatCurrency(h.invested)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'journal' && (
            <JournalTab 
              transactions={transactions} 
              accounts={accounts} 
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
              onAskAi={handleGetAiAdvice}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab 
              accounts={accounts} 
              transactions={transactions} 
              onAddAccount={() => handleOpenAccModal()} 
              onEditAccount={handleOpenAccModal} 
              onDeleteAccount={handleDeleteAccount} 
            />
          )}

          {activeTab === 'stats' && (
            <PortfolioStatsTab 
              transactions={transactions}
              accounts={accounts}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-10 animate-modal">
              <h2 className="text-2xl font-black tracking-tight text-slate-800">환경 설정</h2>
              
              <TaxBenefitCard stats={taxStats} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <Cloud size={20} className="text-indigo-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cloud Sync</p>
                  </div>
                  <div className="space-y-4">
                    {!isAuthorized ? (
                      <button onClick={handleGoogleAuth} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-700">
                        <Lock size={18}/> Google 계정 연결
                      </button>
                    ) : (
                      <div className="bg-emerald-50 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={20} className="text-emerald-500" />
                          <span className="text-xs font-black text-emerald-600 uppercase">Authenticated</span>
                        </div>
                        <button onClick={() => { sheetsService.logout(); setIsAuthorized(false); }} className="text-[10px] text-slate-400 underline font-black">LOGOUT</button>
                      </div>
                    )}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-transparent focus-within:border-indigo-100 transition-all">
                      <p className="text-[10px] text-slate-400 font-black mb-2 text-center uppercase tracking-widest">Spreadsheet ID</p>
                      <input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className="w-full bg-transparent font-mono text-center text-xs outline-none font-bold text-slate-600" placeholder="ID 입력" />
                    </div>
                    <button onClick={fetchDataFromCloud} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-800">
                      <RefreshCw size={18} /> 클라우드에서 불러오기
                    </button>
                  </div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <Download size={20} className="text-emerald-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Management</p>
                  </div>
                  <div className="space-y-4">
                    <button onClick={() => handleExportData()} className="w-full flex items-center justify-between p-6 bg-slate-50/50 hover:bg-indigo-50/50 rounded-2xl font-black group transition-all text-sm">
                      <div className="flex items-center gap-4">
                        <Download size={18} className="text-slate-300 group-hover:text-indigo-600"/>
                        <span>JSON 내보내기 (수동 백업)</span>
                      </div>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-6 bg-slate-50/50 hover:bg-emerald-50/50 rounded-2xl font-black group transition-all text-sm">
                      <div className="flex items-center gap-4">
                        <Upload size={18} className="text-slate-300 group-hover:text-emerald-600"/>
                        <span>JSON 불러오기 (데이터 복구)</span>
                      </div>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <button 
          onClick={() => { resetModal(); setIsTxModalOpen(true); }} 
          className="fixed bottom-10 right-6 sm:right-10 w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 text-white rounded-2xl sm:rounded-[2rem] shadow-2xl flex items-center justify-center active:scale-90 z-50 hover:bg-indigo-700 transition-all"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>

      {aiAdvice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
           <div className="absolute inset-0 bg-slate-950/60" onClick={() => setAiAdvice('')}></div>
           <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-6 sm:p-10 overflow-hidden animate-modal">
             <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><BrainCircuit size={24} /></div>
                 <h2 className="text-xl sm:text-2xl font-black">AI 분석 레포트</h2>
               </div>
               <button onClick={() => setAiAdvice('')} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} className="text-slate-300"/></button>
             </div>
             <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar text-slate-600 leading-relaxed font-medium text-sm sm:text-base whitespace-pre-wrap">
               {aiAdvice}
             </div>
             <button onClick={() => setAiAdvice('')} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl mt-8 active:scale-95 transition-all">확인 완료</button>
           </div>
        </div>
      )}

      {isAiLoading && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-sm bg-white/50">
           <div className="text-center space-y-6">
             <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center mx-auto animate-pulse"><BrainCircuit size={40} /></div>
             <p className="text-xl font-black tracking-tight">AI 분석 중...</p>
           </div>
        </div>
      )}

      {isAccModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setIsAccModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto animate-modal">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black">{editingAccountId ? '계좌 수정' : '새 계좌'}</h2>
              <button onClick={() => setIsAccModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} className="text-slate-300"/></button>
            </div>
            <form onSubmit={handleAccountSubmit} className="space-y-6">
              <input required value={accName} onChange={e => setAccName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-100" placeholder="계좌 명칭" />
              <div className="grid grid-cols-2 gap-4">
                <input required value={accBroker} onChange={e => setAccBroker(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-100" placeholder="증권사" />
                <select className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-100" value={accTaxType} onChange={e => setAccTaxType(e.target.value as TaxType)}>
                  <option value="GENERAL">일반</option>
                  <option value="PENSION">연금</option>
                  <option value="ISA">ISA</option>
                  <option value="IRP">IRP</option>
                </select>
              </div>
              {!editingAccountId && (
                <input value={accBudget} onChange={e => setAccBudget(formatNumberWithCommas(e.target.value))} className="w-full p-4 bg-slate-50 rounded-xl font-black text-xl text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100 text-center" placeholder="0" />
              )}
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xl">
                저장하기
              </button>
            </form>
          </div>
        </div>
      )}

      {isTxModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setIsTxModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-h-[95vh] overflow-y-auto animate-modal scrollbar-hide">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black">{editingTxId ? '수정' : '기록'}</h2>
              <button onClick={() => setIsTxModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} className="text-slate-300"/></button>
            </div>
            {txValidationErrors.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-6 flex items-start gap-3 animate-modal">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  {txValidationErrors.map((err, idx) => <p key={idx} className="text-xs font-bold text-rose-600">{err}</p>)}
                </div>
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-8 overflow-x-auto no-scrollbar gap-1">
              {['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND'].map(type => (
                <button key={type} type="button" onClick={() => { setFormTxType(type as any); setTxValidationErrors([]); }} className={cn("flex-1 px-3 py-2 text-[10px] font-black rounded-xl whitespace-nowrap transition-all", formTxType === type ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
                  {type === 'BUY' ? '매수' : type === 'SELL' ? '매도' : type === 'DEPOSIT' ? '입금' : type === 'WITHDRAWAL' ? '출금' : '배당'}
                </button>
              ))}
            </div>
            <form onSubmit={handleTransactionSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input required type="date" className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none" value={modalDate} onChange={e => setModalDate(e.target.value)} />
                <select className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {['BUY', 'SELL'].includes(formTxType) ? (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <input required value={stockNameInput} onChange={e => setStockNameInput(e.target.value)} className="flex-1 p-4 bg-slate-50 rounded-xl font-medium outline-none" placeholder="종목명" />
                    {!editingTxId && <button type="button" onClick={handleStockSearch} disabled={isSearching} className="px-5 bg-indigo-50 text-indigo-600 font-black rounded-xl">{isSearching ? '...' : '검색'}</button>}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      {searchResults.map((res, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-300 cursor-pointer transition-all"
                          onClick={() => { setStockNameInput(res.name); setModalPrice(formatNumberWithCommas(res.price.toString())); setSearchResults([]); }}>
                          <span className="font-black text-sm">{res.name} ({res.ticker})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <input required value={modalPrice} onChange={(e) => setModalPrice(formatNumberWithCommas(e.target.value))} className="w-full p-4 bg-slate-50 rounded-xl font-medium text-indigo-600" placeholder="단가" />
                    <input required value={modalQuantity} onChange={(e) => setModalQuantity(formatNumberWithCommas(e.target.value))} className="w-full p-4 bg-slate-50 rounded-xl font-medium" placeholder="수량" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex bg-slate-50 p-1.5 rounded-xl gap-1">
                      {(['Calm', 'Excited', 'Fear', 'Greed'] as Emotion[]).map(e => (
                        <button key={e} type="button" onClick={() => setModalEmotion(e)} className={cn("flex-1 p-2 rounded-lg flex items-center justify-center transition-all", modalEmotion === e ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}>
                          {e === 'Calm' && <Smile size={18} />}
                          {e === 'Excited' && <Zap size={18} />}
                          {e === 'Fear' && <Frown size={18} />}
                          {e === 'Greed' && <Activity size={18} />}
                        </button>
                      ))}
                    </div>
                    <select className="w-full p-4 bg-slate-50 rounded-xl font-medium text-xs outline-none" value={modalStrategy} onChange={e => setModalStrategy(e.target.value as StrategyGroup)}>
                      <option value="Routine">정기적 매수</option>
                      <option value="Active">기술적 분석</option>
                      <option value="Event">이벤트/뉴스</option>
                    </select>
                  </div>
                </div>
              ) : (
                <input required value={modalAmount} onChange={(e) => setModalAmount(formatNumberWithCommas(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl text-indigo-600 text-center" placeholder="0" />
              )}
              <textarea value={modalMemo} onChange={e => setModalMemo(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-medium text-sm min-h-[100px] outline-none" placeholder="매매 일지 작성..." />
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xl mt-4">기록 저장</button>
            </form>
          </div>
        </div>
      )}

      {/* 온보딩 화면 - 최종 개선 버전 */}
      {isMigrationOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white p-6 overflow-y-auto">
          <div className="w-full max-w-lg py-12 flex flex-col items-center">
             {migrationStep === 'account' ? (
               <div className="animate-modal w-full max-w-md mx-auto">
                <div className="w-20 h-20 bg-indigo-50/50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-sm">
                  <Briefcase size={40} strokeWidth={1.5} />
                </div>
                <h2 className="text-[32px] font-black mb-3 tracking-tighter text-slate-800 text-center">마이 매매일지 시작하기</h2>
                <p className="text-slate-400 font-bold mb-12 text-center">첫 번째 투자 계좌를 등록해주세요.</p>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const budgetVal = Number(migrationBudget.replace(/,/g, ''));
                  
                  // 유효성 검사 강화
                  if (migrationBudget === '' || isNaN(budgetVal) || budgetVal < 0) {
                    addToast('현재 가용 투자금액을 올바르게 입력해주세요', 'error');
                    return;
                  }
                  
                  const fd = new FormData(e.currentTarget as HTMLFormElement);
                  handleAddAccount({ 
                    name: fd.get('name') as string, 
                    broker: fd.get('broker') as string, 
                    taxType: fd.get('taxType') as TaxType, 
                    budget: budgetVal 
                  });
                }} className="space-y-8 text-left">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 ml-1">계좌 별칭 <span className="text-rose-500">*</span></label>
                    <input 
                      required 
                      name="name" 
                      className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border-2 border-transparent focus:border-indigo-100 focus:bg-white transition-all placeholder:text-slate-300" 
                      placeholder="예: 주식 메인 계좌" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700 ml-1">증권사 <span className="text-rose-500">*</span></label>
                      <input 
                        required 
                        name="broker" 
                        className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border-2 border-transparent focus:border-indigo-100 focus:bg-white transition-all placeholder:text-slate-300" 
                        placeholder="증권사 입력" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700 ml-1">유형 <span className="text-rose-500">*</span></label>
                      <select 
                        name="taxType" 
                        className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border-2 border-transparent focus:border-indigo-100 focus:bg-white transition-all"
                      >
                        <option value="GENERAL">일반 위탁</option>
                        <option value="PENSION">연금저축</option>
                        <option value="ISA">ISA</option>
                        <option value="IRP">IRP</option>
                      </select>
                    </div>
                  </div>

                  {/* 🎯 핵심 개선: 현재 가용 투자 잔금 입력 필드 - 버그 수정 버전 */}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 ml-1">
                      현재 가용 투자 잔금 <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-5 focus-within:bg-indigo-50 focus-within:ring-2 focus-within:ring-indigo-200 transition-all group">
                      <span className="text-xl font-black text-slate-400 select-none shrink-0 group-focus-within:text-indigo-400">
                        ₩
                      </span>
                      <input 
                        required 
                        name="budget"
                        type="text"
                        inputMode="numeric"
                        value={migrationBudget} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setMigrationBudget(val ? Number(val).toLocaleString() : '');
                        }} 
                        className="flex-1 bg-transparent outline-none font-black text-2xl text-indigo-600 placeholder:text-slate-300" 
                        placeholder="0"
                        autoComplete="off"
                      />
                    </div>
                    
                    {/* 입력 안내 가이드 */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4">
                      <p className="font-bold mb-1 text-blue-900 text-sm flex items-center gap-2">
                        <Lightbulb size={16} className="text-blue-500" /> 💡 입력 안내
                      </p>
                      <ul className="space-y-1">
                        <li className="text-xs text-blue-700">• 현재 계좌에 있는 투자 가능한 현금을 입력하세요</li>
                        <li className="text-xs text-blue-700">• 이미 주식을 보유 중이라면 매수 금액은 제외하세요</li>
                        <li className="text-xs text-blue-700">• 나중에 입출금으로 조정할 수 있습니다</li>
                      </ul>
                    </div>

                    {/* 보유 주식 안내 */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mt-4">
                      <p className="font-black text-emerald-900 text-sm">이미 주식을 보유 중이신가요?</p>
                      <p className="text-xs text-emerald-700 mt-1">계좌 등록 후 보유 종목을 일괄로 등록할 수 있습니다.</p>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-100 text-xl active:scale-95 transition-all mt-4 hover:bg-indigo-700"
                  >
                    시작하기
                  </button>
                </form>
               </div>
             ) : (
               <div className="animate-modal w-full">
                 <BulkHoldingsImport 
                   accountId={onboardingAccountId!} 
                   onComplete={handleBulkImportComplete} 
                   onCancel={() => setIsMigrationOpen(false)} 
                 />
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
