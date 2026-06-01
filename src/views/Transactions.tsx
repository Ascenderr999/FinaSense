import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Tag, AlertCircle, Wand2, Camera, Image as ImageIcon, Wallet, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { AccountType } from '../types';

const PREDEFINED_CATEGORIES = [
  'Salary', 'Groceries', 'Utilities', 'Transport', 'Healthcare', 
  'Education', 'Clothing', 'Entertainment', 'Dining', 'Family', 
  'Investment', 'Gifts', 'Home & Repair', 'Tech', 'Travel', 'Other'
];

export default function Transactions() {
  const { transactions, addTransaction, deleteTransaction, initialBalances } = useAppStore();
  
  const [isAdding, setIsAdding] = useState(false);
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState<AccountType>('card');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const numAmount = parseFloat(amount) || 0;
  const isOverLimit = type === 'expense' && accountId !== 'debt' && numAmount > balances[accountId || 'card'];
  const maxLimitValue = type === 'expense' && accountId !== 'debt' ? balances[accountId || 'card'] : Infinity;

  const [isSmartScan, setIsSmartScan] = useState(false);
  const [smartScanText, setSmartScanText] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredCategories = PREDEFINED_CATEGORIES.filter(c => 
    c.toLowerCase().includes(category.toLowerCase()) || 
    c.toLowerCase().includes(description.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await addTransaction({
      type,
      amount: parseFloat(amount),
      description,
      category,
      accountId
    });
    setIsSubmitting(false);

    if (res?.error) {
       setErrorMsg(`Error saving: ${res.error}`);
       return;
    }

    setAmount('');
    setDescription('');
    setCategory('');
    setIsAdding(false);
  };

  const handleSmartScan = async () => {
    if (!smartScanText.trim()) return;
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: smartScanText }),
      });
      
      let data: any;
      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Server error ${res.status}`;
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || errMsg;
        } catch (_) {
          if (text.startsWith('<!DOCTYPE') || text.startsWith('<html') || text.includes('A server error')) {
            errMsg = "A Vercel/Server deployment error occurred. Please check your Vercel Logs for details.";
          } else {
            errMsg = text.slice(0, 150) || errMsg;
          }
        }
        throw new Error(errMsg);
      } else {
        data = await res.json();
      }
      
      if (data.error) throw new Error(data.error);

      if (data.type) setType(data.type);
      if (data.amount) setAmount(data.amount.toString());
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      
      setIsSmartScan(false);
      setSmartScanText('');
    } catch (e: any) {
      setErrorMsg(`Smart Scan failed: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     const reader = new FileReader();
     reader.onloadend = async () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
           await handleSmartScanImage(base64String, file.type);
        }
     };
     reader.readAsDataURL(file);
  }

  const handleSmartScanImage = async (originalBase64: string, originalMimeType: string) => {
    setIsScanning(true);
    setErrorMsg("Analyzing receipt...");
    try {
      const resized = await new Promise<{base64: string, mime: string}>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 400;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.floor(height * (MAX_DIM / width));
              width = MAX_DIM;
            } else {
              width = Math.floor(width * (MAX_DIM / height));
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve({
            base64: dataUrl.split(',')[1],
            mime: dataUrl.split(';')[0].split(':')[1]
          });
        };
        img.onerror = () => reject(new Error("Failed to load image for resizing"));
        img.src = `data:${originalMimeType};base64,${originalBase64}`;
      });

      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: resized.base64, mimeType: resized.mime }),
      });
      
      let data: any;
      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Server error ${res.status}`;
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || errMsg;
        } catch (_) {
          if (text.startsWith('<!DOCTYPE') || text.startsWith('<html') || text.includes('A server error')) {
            errMsg = "A Vercel/Server deployment error occurred. Please check your Vercel Logs for details.";
          } else {
            errMsg = text.slice(0, 150) || errMsg;
          }
        }
        throw new Error(errMsg);
      } else {
        data = await res.json();
      }
      
      if (data.error) {
         throw new Error(data.error);
      }

      if (data.type) setType(data.type);
      if (data.amount) setAmount(data.amount.toString());
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      
      setIsSmartScan(false);
    } catch (e: any) {
      setErrorMsg(`Smart Scan failed: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1">Manage and track your income and expenses.</p>
        </header>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => { setIsAdding(true); setIsSmartScan(false); }}
            className="flex-1 sm:flex-none justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Manual</span>
          </button>
          <button 
            onClick={() => { setIsAdding(true); setIsSmartScan(!isSmartScan); }}
            className="flex-1 sm:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Wand2 className="w-5 h-5" />
            <span className="hidden sm:inline">Smart Scan (AI)</span>
          </button>
        </div>
      </div>

      {isAdding && !isSmartScan && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-lg mb-4">New Transaction</h3>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[120px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as 'income'|'expense')}
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="flex-1 min-w-[140px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Wallet / Account</label>
              <select 
                value={accountId} 
                onChange={e => setAccountId(e.target.value as AccountType)}
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="debt">Debt</option>
              </select>
            </div>
            <div className="flex-1 min-w-[140px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 flex justify-between items-center">
                <span>Amount</span>
                {type === 'expense' && accountId !== 'debt' && (
                  <button 
                    type="button" 
                    onClick={() => setAmount(maxLimitValue.toFixed(2))}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  >
                    Max: ${maxLimitValue.toFixed(2)}
                  </button>
                )}
              </label>
              <input 
                type="number" 
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className={`p-2 border rounded-md focus:ring-2 outline-none ${isOverLimit ? 'border-rose-300 focus:ring-rose-500 bg-rose-50 text-rose-900 font-semibold' : 'border-slate-300 focus:ring-indigo-500 text-slate-800'}`}
                required
              />
              {isOverLimit && (
                <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded-md leading-none border border-rose-200">
                  ⚠️ Limit exceeded! Max: ${maxLimitValue.toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input 
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Weekly Groceries"
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div className="flex-1 min-w-[160px] flex flex-col gap-1.5 relative" ref={wrapperRef}>
              <label className="text-sm font-medium text-slate-700">Category (Auto/AI)</label>
              <input 
                type="text" 
                value={category}
                onFocus={() => setShowDropdown(true)}
                onChange={e => {
                  setCategory(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Leave empty for AI"
                className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {showDropdown && filteredCategories.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-auto top-full mt-1">
                  {filteredCategories.map((c) => (
                    <li 
                      key={c} 
                      onClick={() => {
                        setCategory(c);
                        setShowDropdown(false);
                      }}
                      className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="w-full md:w-auto">
              <button 
                type="submit" 
                disabled={isSubmitting || isOverLimit}
                className="w-full md:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? <span className="animate-pulse">Loading...</span> : 'Save Entry'}
              </button>
            </div>
          </form>
          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {isAdding && isSmartScan && (
        <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-lg mb-2 text-indigo-900 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-600" />
            AI Smart Scan
          </h3>
          <p className="text-sm text-indigo-700 mb-4">
            Paste an SMS from your bank or details from a receipt. AI will automatically extract the amount, merchant, type, and category for you.
          </p>
          <div className="flex flex-col gap-3">
            <textarea
              value={smartScanText}
              onChange={e => setSmartScanText(e.target.value)}
              placeholder="Paste SMS here (e.g., '12.50 USD spent, Bravo Supermarket...')"
              className="w-full min-h-[100px] p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-slate-700 bg-white"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={handleSmartScan}
                disabled={isScanning || !smartScanText.trim()}
                className="flex-[2] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isScanning ? <span className="animate-pulse">Analyzing...</span> : 'Extract via Text'}
              </button>
              <label 
                className={`flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${isScanning ? 'opacity-70 pointer-events-none' : ''}`}
                title="Camera"
              >
                <Camera className="w-5 h-5" />
                <span className="hidden sm:inline">Camera</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={handleImageFile}
                  disabled={isScanning}
                />
              </label>
              <label 
                className={`flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${isScanning ? 'opacity-70 pointer-events-none' : ''}`}
                title="Gallery"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Gallery</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageFile}
                  disabled={isScanning}
                />
              </label>
              <button 
                onClick={() => setIsSmartScan(false)}
                className="px-4 py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg font-medium transition-colors"
                disabled={isScanning}
              >
                Cancel
              </button>
            </div>
          </div>
          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Wallet</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium text-right">Amount</th>
                <th className="p-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 text-slate-500 text-sm whitespace-nowrap">
                    {format(new Date(t.date), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 font-medium text-slate-900">
                    {t.description}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize bg-slate-100 text-slate-600">
                      {t.accountId === 'cash' ? <Banknote className="w-3.5 h-3.5" /> : t.accountId === 'debt' ? <Wallet className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                      {t.accountId || 'card'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                      <Tag className="w-3 h-3 text-indigo-400" />
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <span className={`font-semibold inline-flex items-center gap-1 justify-end ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {t.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      ${Math.abs(t.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => deleteTransaction(t.id)}
                      className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No transactions found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
