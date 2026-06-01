import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { ArrowDownRight, ArrowUpRight, Wallet, BrainCircuit, Target, Sparkles, RefreshCw, CreditCard, Banknote, Landmark, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { AccountType } from '../types';

export default function Dashboard() {
  const { transactions, goals, insights, refreshInsights, initialBalances, setInitialBalances } = useAppStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isEditingBalances, setIsEditingBalances] = useState(false);
  
  const [tempBalances, setTempBalances] = useState({
    cash: initialBalances.cash.toString(),
    card: initialBalances.card.toString(),
    debt: initialBalances.debt.toString()
  });

  const handleRefreshInsights = async () => {
    setIsRefreshing(true);
    await refreshInsights();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSaveBalances = () => {
    const targetCash = Number(tempBalances.cash) || 0;
    const targetCard = Number(tempBalances.card) || 0;
    const targetDebt = Number(tempBalances.debt) || 0;

    let cashTxEffect = 0;
    let cardTxEffect = 0;
    let debtTxEffect = 0;

    transactions.forEach(t => {
      const amount = t.amount;
      if (t.type === 'income') {
        if (t.accountId === 'debt') {
          debtTxEffect -= amount;
        } else if (t.accountId === 'cash') {
          cashTxEffect += amount;
        } else {
          cardTxEffect += amount;
        }
      } else {
        if (t.accountId === 'debt') {
          debtTxEffect += amount;
        } else if (t.accountId === 'cash') {
          cashTxEffect -= amount;
        } else {
          cardTxEffect -= amount;
        }
      }
    });

    setInitialBalances({
      cash: targetCash - cashTxEffect,
      card: targetCard - cardTxEffect,
      debt: targetDebt - debtTxEffect,
    });
    setIsEditingBalances(false);
  };

  const balances = useMemo(() => {
    const current = {
      cash: initialBalances.cash,
      card: initialBalances.card,
      debt: initialBalances.debt
    };

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        if (t.accountId === 'debt') {
          current.debt -= t.amount;
        } else {
          current[t.accountId || 'card'] += t.amount;
        }
      } else {
        totalExpense += t.amount;
        if (t.accountId === 'debt') {
          current.debt += t.amount;
        } else {
          current[t.accountId || 'card'] -= t.amount;
        }
      }
    });

    const savingsGoalsSum = goals.filter(g => g.type !== 'debt').reduce((acc, g) => acc + g.currentAmount, 0);
    
    const debtPayoffsSum = goals.filter(g => g.type === 'debt').reduce((acc, g) => acc + g.currentAmount, 0);
    
    const adjustedDebt = Math.max(0, current.debt - debtPayoffsSum);
    const netValue = current.cash + current.card + savingsGoalsSum - adjustedDebt;

    return { ...current, debt: adjustedDebt, netValue, totalIncome, totalExpense, savingsGoalsSum };
  }, [transactions, goals, initialBalances]);

  const recentTransactions = transactions.slice(0, 4);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your complete financial footprint.</p>
        </div>
        <button 
          onClick={() => {
            setTempBalances({
              cash: balances.cash.toFixed(2),
              card: balances.card.toFixed(2),
              debt: balances.debt.toFixed(2)
            });
            setIsEditingBalances(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200 cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
          Setup Wallets
        </button>
      </header>
      
      {isEditingBalances && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
             <Landmark className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Initial Balances Setup</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your CURRENT real-time balances to configure your wallets. The active transaction history will be preserved.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-500"/> Cash</label>
                <input type="number" step="0.01" value={tempBalances.cash} onChange={e => setTempBalances(p => ({...p, cash: e.target.value}))} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500"/> Card</label>
                <input type="number" step="0.01" value={tempBalances.card} onChange={e => setTempBalances(p => ({...p, card: e.target.value}))} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Wallet className="w-4 h-4 text-rose-500"/> Debt</label>
                <input type="number" step="0.01" value={tempBalances.debt} onChange={e => setTempBalances(p => ({...p, debt: e.target.value}))} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsEditingBalances(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleSaveBalances} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">Save Balances</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-800 text-white relative overflow-hidden group col-span-2 md:col-span-1 flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Landmark className="w-20 h-20" /></div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider relative z-10 mb-1">Net Worth</p>
            <p className="text-2xl lg:text-3xl font-bold tracking-tight relative z-10 text-emerald-400">${balances.netValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 z-10 font-mono leading-tight">
            Card + Cash + Goals - Debt
          </div>
        </div>
        <MetricCard 
          title="Card Balance" 
          value={balances.card} 
          icon={<CreditCard className="text-indigo-500" />} 
        />
        <MetricCard 
          title="Cash in Hand" 
          value={balances.cash} 
          icon={<Banknote className="text-emerald-500" />} 
        />
        <MetricCard 
          title="Goal Savings" 
          value={balances.savingsGoalsSum} 
          icon={<Target className="text-violet-500" />} 
        />
        <MetricCard 
          title="Total Debt" 
          value={balances.debt} 
          icon={<Wallet className="text-rose-500" />} 
          isNegative
        />
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group border border-slate-700/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110 pointer-events-none">
          <BrainCircuit className="text-indigo-400 w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Strategic AI Advisor
            </div>
            
            <button 
              onClick={() => handleRefreshInsights()} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-sm border border-white/15 transition-all active:scale-95 cursor-pointer"
              disabled={isRefreshing}
              id="refresh-advisor-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Analyze Data</span>
            </button>
          </div>
          <p className="text-[17px] md:text-[19px] font-medium leading-relaxed max-w-3xl mt-1 drop-shadow-sm text-slate-100">
            {insights || "Calibrating strategic recommendations based on your transaction habits and active savings goals..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
            <div className="text-xs font-medium bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
               In: <span className="text-emerald-600">${balances.totalIncome.toFixed(0)}</span> / Out: <span className="text-rose-600">${balances.totalExpense.toFixed(0)}</span>
            </div>
          </div>
          <div className="space-y-4">
            {recentTransactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{t.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2 items-center">
                      <span className="capitalize px-1.5 py-0.5 bg-slate-100 rounded-md">{t.accountId || 'card'}</span>
                      {t.category} • {format(new Date(t.date), 'MMM d')}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                </span>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-center py-8">
                 <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3"><Wallet/></div>
                 <p className="text-slate-500 font-medium text-sm">No recent transactions.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Active Goals</h2>
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-6 mt-4">
            {goals.filter(g => g.currentAmount < g.targetAmount).slice(0, 3).map(g => {
              const p = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{g.title}</span>
                    <span className="text-slate-500">${g.currentAmount.toLocaleString()} / ${g.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${g.type === 'charity' ? 'bg-rose-400' : g.type === 'debt' ? 'bg-amber-400' : 'bg-indigo-500'}`} 
                      style={{ width: `${p}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
            {goals.filter(g => g.currentAmount < g.targetAmount).length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No active goals or debts.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, isNegative }: { title: string, value: number, icon: React.ReactNode, isNegative?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-xl">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className={`text-2xl font-bold tracking-tight ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    </div>
  )
}
