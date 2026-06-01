import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Receipt, BarChart3, Target, BrainCircuit, LogOut, Share2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import Auth from '../views/Auth';

export default function Layout() {
  const { session, signOut } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!session || sessionStorage.getItem('suppress_auth_redirect') === 'true') {
    return <Auth />;
  }

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FinaSense',
          text: 'FinaSense - AI-Powered Personal Finance & Strategy Ecosystem',
          url: shareUrl,
        });
        return;
      } catch (err) {
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
    }
  };

  const navItems = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Transactions', to: '/transactions', icon: Receipt },
    { name: 'Goals', to: '/goals', icon: Target },
    { name: 'Statistics', to: '/statistics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-lg">FinaSense</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-lg text-xs font-bold transition-all border border-indigo-100 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Share</span>
              </>
            )}
          </button>
          <button 
            onClick={() => signOut()}
            className="text-slate-500 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <aside className="hidden md:flex bg-white w-64 border-r border-slate-200 flex-shrink-0 flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2 p-6 border-b border-slate-100">
          <BrainCircuit className="w-8 h-8 text-indigo-600" />
          <span className="font-bold text-xl tracking-tight">FinaSense</span>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => signOut()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto w-full">
        <div className="hidden md:flex max-w-6xl mx-auto px-8 pt-6 justify-end">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer border border-transparent"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-indigo-150" />
                <span>Share App</span>
              </>
            )}
          </button>
        </div>
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center p-3 text-xs font-medium transition-colors flex-1",
              isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5 mb-1", isActive ? "text-indigo-600" : "text-slate-500")} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
