import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Target, Heart, CreditCard, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Goals() {
  const { goals, addGoal, allocateToGoal, initialBalances, transactions } = useAppStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [type, setType] = useState<'savings'|'charity'|'debt'>('savings');
  const [deadline, setDeadline] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeAllocateId, setActiveAllocateId] = useState<string|null>(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateSource, setAllocateSource] = useState<'card' | 'cash'>('card');

  const balances = React.useMemo(() => {
    const current = {
      cash: initialBalances.cash,
      card: initialBalances.card,
      debt: initialBalances.debt
    };

    transactions.forEach(t => {
      const amt = t.amount;
      if (t.type === 'income') {
        if (t.accountId === 'debt') {
          current.debt -= amt;
        } else {
          current[t.accountId || 'card'] += amt;
        }
      } else {
        if (t.accountId === 'debt') {
          current.debt += amt;
        } else {
          current[t.accountId || 'card'] -= amt;
        }
      }
    });

    return current;
  }, [transactions, initialBalances]);

  const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount);
  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;
    setErrorMsg(null);
    
    const res = await addGoal({
      title,
      type,
      targetAmount: parseFloat(targetAmount),
      deadline: deadline ? new Date(deadline).toISOString() : undefined
    });

    if (res?.error) {
       setErrorMsg(`Error: ${res.error}`);
       return;
    }

    setTitle('');
    setTargetAmount('');
    setDeadline('');
    setIsAdding(false);
  };

  const handleAllocate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!allocateAmount) return;
    await allocateToGoal(id, parseFloat(allocateAmount), allocateSource);
    setAllocateAmount('');
    setActiveAllocateId(null);
  };

  const renderGoal = (g: any, isCompletedSection: boolean) => {
    const isCharity = g.type === 'charity';
    const isDebt = g.type === 'debt';
    const percent = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
    const isCompleted = g.currentAmount >= g.targetAmount;
    
    return (
      <div key={g.id} className={`bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col ${isCompletedSection ? 'opacity-80 grayscale-[30%]' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${isDebt ? 'bg-amber-50 text-amber-500' : isCharity ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
              {isDebt ? <CreditCard className="w-6 h-6" /> : isCharity ? <Heart className="w-6 h-6" /> : <Target className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{g.title}</h3>
              {!isCompleted && g.deadline && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Target date: {format(new Date(g.deadline), 'MMM d, yyyy')}
                </p>
              )}
              {isCompleted && (
                <p className="text-xs text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed {g.deadline ? `(by ${format(new Date(g.deadline), 'MMM d, yyyy')})` : ''}
                </p>
              )}
            </div>
          </div>
          <span className={`text-sm font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-400'}`}>
            {percent.toFixed(0)}%
          </span>
        </div>
        
        <div className="mt-auto">
          <div className="flex justify-between text-sm mb-2 text-slate-600">
            <span>${g.currentAmount.toLocaleString()} {isDebt ? 'paid' : 'saved'}</span>
            <span>{isDebt ? 'Debt' : 'Goal'}: ${g.targetAmount.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500' : isDebt ? 'bg-amber-400' : isCharity ? 'bg-rose-400' : 'bg-indigo-500'}`} 
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {!isCompletedSection && activeAllocateId === g.id ? (
          <form onSubmit={(e) => handleAllocate(e, g.id)} className="mt-4 space-y-3 animate-in fade-in bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex gap-2">
              <input 
                type="number" 
                step="1"
                placeholder={isDebt ? 'Amount to pay' : 'Amount to add'}
                value={allocateAmount}
                onChange={e => setAllocateAmount(e.target.value)}
                className={`flex-1 p-2 bg-white border rounded-md focus:ring-2 outline-none text-sm font-semibold ${
                  (parseFloat(allocateAmount) || 0) > Math.min(balances[allocateSource], g.targetAmount - g.currentAmount)
                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50 text-rose-900'
                    : 'border-slate-300 focus:ring-indigo-500 text-slate-800'
                }`}
                autoFocus
              />
              <select
                value={allocateSource}
                onChange={e => setAllocateSource(e.target.value as 'card' | 'cash')}
                className="p-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="card">💳 Card</option>
                <option value="cash">💵 Cash</option>
              </select>
            </div>

            <div className="flex justify-between items-center px-1 text-[11px]">
              <span className="text-slate-500 font-medium">Available: ${balances[allocateSource].toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <button 
                type="button" 
                onClick={() => setAllocateAmount(Math.min(balances[allocateSource], g.targetAmount - g.currentAmount).toString())} 
                className="text-indigo-600 hover:text-indigo-800 font-bold transition-all cursor-pointer text-xs"
              >
                Max: ${Math.min(balances[allocateSource], g.targetAmount - g.currentAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </button>
            </div>

            {(parseFloat(allocateAmount) || 0) > Math.min(balances[allocateSource], g.targetAmount - g.currentAmount) && (
              <p className="text-[10px] text-rose-500 font-bold bg-rose-55 p-1.5 rounded-md leading-relaxed border border-rose-250 animate-in fade-in">
                {(parseFloat(allocateAmount) || 0) > balances[allocateSource]
                  ? "⚠️ Yetersiz balans! Cüzdanda o qədər pul yoxdur." 
                  : "⚠️ Hədəfin qalan məbləğindən çox pul əlavə edilə bilməz."}
              </p>
            )}

            <div className="flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => { setActiveAllocateId(null); setAllocateAmount(''); }} className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 rounded-md transition-colors font-medium cursor-pointer">
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={!allocateAmount || (parseFloat(allocateAmount) || 0) <= 0 || (parseFloat(allocateAmount) || 0) > Math.min(balances[allocateSource], g.targetAmount - g.currentAmount)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </form>
        ) : !isCompletedSection && (
          <button 
            onClick={() => setActiveAllocateId(g.id)}
            disabled={isCompleted}
            className="mt-5 w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDebt ? 'Log Payment' : 'Allocate Funds'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Financial Goals</h1>
          <p className="text-slate-500 mt-1">Set targets for savings milestones or charitable donations.</p>
        </header>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Goal
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end flex-wrap">
            <div className="flex-[2] min-w-[200px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Goal Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Vacation Fund"
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div className="flex-1 min-w-[120px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as 'savings'|'charity'|'debt')}
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="savings">Savings</option>
                <option value="charity">Charity Contribution</option>
                <option value="debt">Debt Payoff</option>
              </select>
            </div>
            <div className="flex-1 min-w-[120px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Target ($)</label>
              <input 
                type="number" 
                step="1"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                placeholder="1000"
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div className="flex-1 min-w-[150px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Deadline (Optional)</label>
              <input 
                type="date" 
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
              />
            </div>
            <div className="w-full md:w-auto mt-2 md:mt-0">
              <button 
                type="submit" 
                className="w-full md:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </form>
          {errorMsg && (
            <p className="mt-3 text-sm text-rose-600 font-medium">{errorMsg}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeGoals.map((g) => renderGoal(g, false))}

        {activeGoals.length === 0 && (
          <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200 border-dashed">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No active goals or debts.</p>
            <p className="text-slate-400 text-sm mt-1">Start by setting a target.</p>
          </div>
        )}
      </div>

      {completedGoals.length > 0 && (
        <div className="mt-12 space-y-6 animate-in fade-in">
          <header>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Completed</h2>
            <p className="text-slate-500 mt-1">Your achieved targets and paid off debts.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedGoals.map((g) => renderGoal(g, true))}
          </div>
        </div>
      )}
    </div>
  );
}
