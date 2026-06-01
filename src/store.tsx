import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { AppState, Transaction, Budget, Goal, AccountType } from './types.ts';
import { supabase } from './lib/supabase.ts';

const AppContext = createContext<AppState | undefined>(undefined);

const encodeDesc = (desc: string, accountId: AccountType) => {
  return `${desc} |__|${accountId}`;
};

const decodeDesc = (raw: string): { description: string, accountId: AccountType } => {
  const parts = raw.split(' |__|');
  if (parts.length > 1) {
    return { description: parts[0], accountId: parts[1] as AccountType };
  }
  return { description: raw, accountId: 'card' };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  
  const [initialBalances, setInitialBalancesState] = useState<Record<AccountType, number>>({
    cash: 0,
    card: 0,
    debt: 0
  });

  const setInitialBalances = async (balances: Record<AccountType, number>) => {
    setInitialBalancesState(balances);
    if (session) {
      const { data, error } = await supabase.auth.updateUser({
        data: { initial_balances: balances }
      });
      if (error) {
      } else if (data?.user) {
        setSession(prev => prev ? { ...prev, user: data.user } : null);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        supabase.auth.signOut();
      }
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setTransactions([]);
        setBudgets([]);
        setGoals([]);
        setInsights(null);
        setInitialBalancesState({ cash: 0, card: 0, debt: 0 });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session) return;
    
    const userMetadata = session.user?.user_metadata;
    if (userMetadata && userMetadata.initial_balances) {
      setInitialBalancesState(userMetadata.initial_balances);
    } else {
      const savedBalances = localStorage.getItem(`fina_balances_${session.user.id}`);
      if (savedBalances) {
        try {
          const parsed = JSON.parse(savedBalances);
          setInitialBalancesState(parsed);
          const { error: updError } = await supabase.auth.updateUser({
            data: { initial_balances: parsed }
          });
          if (updError) {
             console.warn("Failed to update user balances:", updError.message);
          }
        } catch (e) {
          setInitialBalancesState({ cash: 0, card: 0, debt: 0 });
        }
      } else {
        setInitialBalancesState({ cash: 0, card: 0, debt: 0 });
      }
    }

    try {
      const [txRes, glRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('goals').select('*').order('created_at', { ascending: true })
      ]);

      if (txRes.error) throw txRes.error;
      if (glRes.error) throw glRes.error;

      setTransactions((txRes.data || []).map(t => {
        const decoded = decodeDesc(t.description);
        return {
          ...t,
          description: decoded.description,
          accountId: decoded.accountId
        };
      }));
      
      setBudgets([]);
      setGoals((glRes.data || []).map(g => ({
        id: g.id,
        title: g.title,
        type: g.type,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount,
        deadline: g.deadline,
      })));
    } catch (e) {
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const addTransaction = async (t: Omit<Transaction, 'id' | 'date'>) => {
    if (!session?.user) return { error: 'Not logged in' };
    
    let finalCategory = t.category;

    if (!finalCategory || finalCategory.trim() === '') {
      try {
        const res = await fetch('/api/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: t.description, amount: t.amount }),
        });
        const data = await res.json();
        if (data.category) finalCategory = data.category;
      } catch (e) {
      }
    }

    if (!finalCategory || finalCategory.trim() === '') {
      finalCategory = 'Other';
    }

    const rawDescription = encodeDesc(t.description, t.accountId || 'card');

    const { data, error } = await supabase.from('transactions').insert([{
      user_id: session.user.id,
      type: t.type,
      amount: t.amount,
      description: rawDescription,
      category: finalCategory,
      date: new Date().toISOString()
    }]).select().single();

    if (error) {
       return { error: error.message };
    }
    
    if (data) {
      const decoded = decodeDesc(data.description);
      const modeled: Transaction = {
        ...data,
        description: decoded.description,
        accountId: decoded.accountId
      };
      setTransactions(prev => [modeled, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    } else {
      return { error: error.message };
    }
  };

  const addBudget = async (b: Omit<Budget, 'id' | 'spent'>) => {
    setBudgets(prev => [...prev, { id: Math.random().toString(), category: b.category, amount: b.amount, spent: 0 }]);
  };

  const addGoal = async (g: Omit<Goal, 'id' | 'currentAmount'>) => {
    if (!session?.user) return { error: 'Not logged in' };
    const { data, error } = await supabase.from('goals').insert([{
      user_id: session.user.id,
      title: g.title,
      type: g.type,
      target_amount: g.targetAmount,
      current_amount: 0,
      deadline: g.deadline,
    }]).select().single();

    if (error) {
      return { error: error.message };
    }

    if (data) {
      setGoals(prev => [...prev, {
        id: data.id,
        title: data.title,
        type: data.type,
        targetAmount: data.target_amount,
        currentAmount: data.current_amount,
        deadline: data.deadline
      }]);
    }
  };

  const allocateToGoal = async (goalId: string, amount: number, sourceAccount: AccountType) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const actualAdded = Math.max(0, Math.min(amount, goal.targetAmount - goal.currentAmount));
    if (actualAdded <= 0) return;

    const newAmount = goal.currentAmount + actualAdded;
    
    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', goalId);
    
    if (!error) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: newAmount } : g));
      
      await addTransaction({
        type: 'expense',
        amount: actualAdded,
        description: goal.type === 'debt' ? `Debt payment: ${goal.title}` : `Allocated to goal: ${goal.title}`,
        category: goal.type === 'debt' ? 'Debt Payment' : 'Goal Allocation',
        accountId: sourceAccount
      });
    }
  };

  const refreshInsights = async () => {
    if (!session) return;
    try {
      const recentTransactions = transactions.slice(0, 50).map(t => ({
        type: t.type,
        amount: t.amount,
        category: t.category,
        date: t.date,
        description: t.description
      }));
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: recentTransactions, goals }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.insights) setInsights(data.insights);
      } else {
        const errData = await res.json().catch(() => ({}));
        setInsights(`Insight generation mostly paused: ${errData.error || res.statusText}`);
      }
    } catch (e: any) {
      setInsights(`Insights temporarily unavailable.`);
    }
  };

  const goalsHash = JSON.stringify(goals.map(g => ({ id: g.id, current: g.currentAmount })));

  useEffect(() => {
    if (session && transactions.length > 0) {
      refreshInsights();
    }
  }, [session, transactions.length, goalsHash]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AppContext.Provider value={{
      session, transactions, budgets, goals, initialBalances, setInitialBalances, addTransaction, deleteTransaction, 
      addBudget, addGoal, allocateToGoal, insights, refreshInsights, signOut
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};

