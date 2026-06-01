import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Printer, 
  Calendar, 
  ChevronRight, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieIcon,
  HelpCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const CHART_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#06b6d4'];

export default function Statistics() {
  const { transactions } = useAppStore();

  const today = useMemo(() => new Date(), []);
  
  const availableMonths = useMemo(() => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(today, i);
      list.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy'),
        date: d
      });
    }
    return list;
  }, [today]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(availableMonths[0].key);

  const selectedMonthObj = useMemo(() => {
    return availableMonths.find(m => m.key === selectedMonthKey) || availableMonths[0];
  }, [selectedMonthKey, availableMonths]);

  const monthTransactions = useMemo(() => {
    const start = startOfMonth(selectedMonthObj.date);
    const end = endOfMonth(selectedMonthObj.date);
    
    return transactions.filter(t => {
      const txDate = parseISO(t.date);
      return isWithinInterval(txDate, { start, end });
    });
  }, [transactions, selectedMonthObj]);

  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    monthTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    const netSavings = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.min(100, (netSavings / income) * 100)) : 0;

    const year = selectedMonthObj.date.getFullYear();
    const month = selectedMonthObj.date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyAverageSpent = expense / daysInMonth;

    return { income, expense, netSavings, savingsRate, dailyAverageSpent, daysInMonth };
  }, [monthTransactions, selectedMonthObj]);

  const trendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const label = format(d, 'MMM yy');
      
      let incoming = 0;
      let outgoing = 0;

      transactions.forEach(t => {
        const txDate = parseISO(t.date);
        if (isWithinInterval(txDate, { start, end })) {
          if (t.type === 'income') {
            incoming += t.amount;
          } else {
            outgoing += t.amount;
          }
        }
      });

      months.push({
        name: label,
        Income: parseFloat(incoming.toFixed(2)),
        Expense: parseFloat(outgoing.toFixed(2)),
        Savings: parseFloat((incoming - outgoing).toFixed(2))
      });
    }
    return months;
  }, [transactions, today]);

  const categoryStats = useMemo(() => {
    const categories: Record<string, number> = {};
    let totalExpense = 0;

    monthTransactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category || 'Other';
        categories[cat] = (categories[cat] || 0) + t.amount;
        totalExpense += t.amount;
      }
    });

    return Object.entries(categories)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions]);

  const pieChartData = useMemo(() => {
    return categoryStats.map(c => ({
      name: c.name,
      value: parseFloat(c.amount.toFixed(2))
    }));
  }, [categoryStats]);

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No transaction data available to export.");
      return;
    }

    const headers = ["ID", "ISO Date", "Format Date", "Type", "Description", "Category", "Wallet/Account", "Amount ($)"];
    
    const rows = transactions.map(t => {
      const formattedDate = format(parseISO(t.date), 'yyyy-MM-dd HH:mm:ss');
      const escapedDesc = `"${t.description.replace(/"/g, '""')}"`;
      const escapedCat = `"${t.category.replace(/"/g, '""')}"`;
      const wallet = t.accountId || 'card';

      return [
        t.id,
        t.date,
        formattedDate,
        t.type,
        escapedDesc,
        escapedCat,
        wallet,
        t.type === 'expense' ? `-${t.amount}` : t.amount
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FinaSense_All_Transactions_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (transactions.length === 0) {
      alert("No transaction data available to export.");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FinaSense_Backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportTitle = `FinaSense Monthly Financial Report - ${selectedMonthObj.label}`;
    const txRows = monthTransactions.map(t => `
      <tr style="border-b: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${format(parseISO(t.date), 'yyyy-MM-dd')}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${t.type}</td>
        <td style="padding: 8px; text-align: left;">${t.description}</td>
        <td style="padding: 8px; text-align: left;">${t.category}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${t.accountId || 'card'}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${t.type === 'income' ? '#10b981' : '#f43f5e'}">
          ${t.type === 'income' ? '+' : '-'}$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `).join('');

    const catRows = categoryStats.map(c => `
      <tr style="border-b: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${c.name}</td>
        <td style="padding: 8px; text-align: right;">$${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; text-align: right;">${c.percentage.toFixed(1)}%</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; }
            h1 { font-size: 24px; margin-bottom: 5px; color: #0f172a; }
            h2 { font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
            .card .title { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .card .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; padding: 10px; font-size: 13px; text-align: left; font-weight: 600; }
            td { font-size: 13px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h1>FinaSense</h1>
              <p style="color: #64748b; margin: 0;">Financial Report & Monthly Statistics</p>
            </div>
            <div class="no-print">
              <button onclick="window.print()" style="background: #1e293b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Print / Save PDF</button>
            </div>
          </div>

          <h3 style="margin-top: 20px; color: #475569;">Reporting Period: ${selectedMonthObj.label}</h3>

          <div class="grid">
            <div class="card">
              <div class="title">Monthly Income</div>
              <div class="value" style="color: #10b981;">$+${monthStats.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <div class="title">Monthly Expense</div>
              <div class="value" style="color: #f43f5e;">$-${monthStats.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <div class="title">Net Savings</div>
              <div class="value" style="color: ${monthStats.netSavings >= 0 ? '#10b981' : '#f43f5e'}">$${monthStats.netSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <div class="title">Savings Rate</div>
              <div class="value">${monthStats.savingsRate.toFixed(1)}%</div>
            </div>
          </div>

          <h2>Category Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Category</th>
                <th style="text-align: right;">Expense Amount</th>
                <th style="text-align: right;">Ratio (%)</th>
              </tr>
            </thead>
            <tbody>
              ${catRows.length > 0 ? catRows : '<tr><td colspan="3" style="text-align: center; padding: 15px; color: #94a3b8;">No expenses found</td></tr>'}
            </tbody>
          </table>

          <h2>Detailed Transaction List</h2>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Date</th>
                <th style="text-align: left;">Type</th>
                <th style="text-align: left;">Description</th>
                <th style="text-align: left;">Category</th>
                <th style="text-align: left;">Account/Wallet</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${txRows.length > 0 ? txRows : '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #94a3b8;">No transactions found</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            Prepared by FinaSense Premium AI Assistant • ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Monthly Statistics</h1>
          <p className="text-slate-500 mt-1">Annual and monthly income-expense trends, reports, and data exports.</p>
        </header>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select 
              value={selectedMonthKey} 
              onChange={e => setSelectedMonthKey(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
            >
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg transition-colors border border-emerald-200/50 flex-1 sm:flex-initial"
            title="Export to Excel CSV Format"
            id="btn-export-csv"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Excel</span>
          </button>

          <button 
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg transition-colors border border-indigo-200/50 flex-1 sm:flex-initial"
            title="Download JSON Backup"
            id="btn-export-json"
          >
            <FileJson className="w-4 h-4" />
            <span>JSON</span>
          </button>

          <button 
            onClick={handlePrintReport}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-200 flex-1 sm:flex-initial"
            title="Formatted Printing & PDF PDF Creation"
            id="btn-print-pdf"
          >
            <Printer className="w-4 h-4" />
            <span>Print/PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Monthly Income & Expense Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">Comparison of total income and expense activity over the last 6 months.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>Income</span>
            <span className="flex items-center gap-1.5 text-rose-500"><span className="w-3 h-3 bg-rose-500 rounded-sm"></span>Expense</span>
            <span className="flex items-center gap-1.5 text-indigo-600"><span className="w-3 h-3 bg-indigo-500 rounded-sm"></span>Savings</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trendData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(value: any) => [`$${value}`, undefined]}
                contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none' }}
                labelStyle={{ fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}
              />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mt-8 mb-2">
        {selectedMonthObj.label} Report
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Income</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            +${monthStats.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{monthTransactions.filter(t => t.type === 'income').length} inflow(s)</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-rose-50 text-rose-600 p-1.5 rounded-lg">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Expense</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            -${monthStats.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{monthTransactions.filter(t => t.type === 'expense').length} outflow(s)</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Savings</p>
          <p className={`text-2xl font-bold mt-2 ${monthStats.netSavings >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
            {monthStats.netSavings < 0 ? '-' : ''}${Math.abs(monthStats.netSavings).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{monthStats.netSavings >= 0 ? 'Positive balance' : 'Expenses exceed income'}</span>
          </div>
        </div>

        {monthStats.income > 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Savings Rate</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">
              {monthStats.savingsRate.toFixed(1)}%
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all" 
                style={{ width: `${monthStats.savingsRate}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Ratio of income saved</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Avg. Spent</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">
              ${monthStats.dailyAverageSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (monthStats.dailyAverageSpent / 150) * 100)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Based on {monthStats.daysInMonth} days this month</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-500" />
            Expenses by Category
          </h3>

          <div className="space-y-4">
            {categoryStats.map((c, idx) => (
              <div key={c.name} className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-slate-700 flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    ></span>
                    {c.name}
                  </span>
                  <span className="text-slate-900">
                    ${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} 
                    <span className="text-slate-400 text-xs ml-1.5">({c.percentage.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: `${c.percentage}%`, 
                      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] 
                    }}
                  ></div>
                </div>
              </div>
            ))}

            {categoryStats.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">No expense transactions found for this month.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center">
          <h3 className="font-semibold text-lg text-slate-900 mb-4 self-start">Expense Share</h3>
          
          {pieChartData.length > 0 ? (
            <div className="w-full h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center transform -translate-y-4">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Expense</p>
                <p className="text-xl font-extrabold text-slate-800">${monthStats.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm">
              <p>No data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
