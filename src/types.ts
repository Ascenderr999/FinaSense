import { Session } from '@supabase/supabase-js';

export type TransactionType = 'income' | 'expense';
export type AccountType = 'cash' | 'card' | 'debt';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  accountId?: AccountType;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
}

export type GoalType = 'savings' | 'charity' | 'debt';

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

export interface AppState {
  session: Session | null;
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  initialBalances: Record<AccountType, number>;
  setInitialBalances: (balances: Record<AccountType, number>) => void;
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => Promise<{error?: string} | void>;
  deleteTransaction: (id: string) => Promise<{error?: string} | void>;
  addBudget: (b: Omit<Budget, 'id' | 'spent'>) => Promise<{error?: string} | void>;
  addGoal: (g: Omit<Goal, 'id' | 'currentAmount'>) => Promise<{error?: string} | void>;
  allocateToGoal: (goalId: string, amount: number, sourceAccount: AccountType) => Promise<{error?: string} | void>;
  insights: string | null;
  refreshInsights: () => Promise<void>;
  signOut: () => Promise<void>;
}

