import React, { useState, useEffect } from 'react';
import Navbar, { MainTabType } from './components/Navbar';
import DashboardHub from './components/DashboardHub';
import EditorStudio from './components/editor/EditorStudio';
import MergeTool from './components/MergeTool';
import SplitTool from './components/SplitTool';
import OrganizeTool from './components/OrganizeTool';
import OCRTool from './components/OCRTool';
import ConvertTool from './components/ConvertTool';
import SecurityMetaTool from './components/SecurityMetaTool';
import { ToastProvider } from './components/common/Toast';
import {
  Camera,
  Sparkles,
  FilePlus2,
  Scissors,
  LayoutGrid,
  FileText,
  RefreshCw,
  Shield,
} from 'lucide-react';

export default function App() {
  const validTabs: MainTabType[] = ['home', 'editor', 'merge', 'split', 'organize', 'ocr', 'convert', 'security'];
  const readTabFromUrl = (): MainTabType => {
    const tab = window.location.hash.slice(1) as MainTabType;
    return validTabs.includes(tab) ? tab : 'home';
  };
  const [activeTab, setActiveTab] = useState<MainTabType>(readTabFromUrl);

  const navigateToTab = (tab: MainTabType) => {
    if (tab === readTabFromUrl()) return;
    const hash = tab === 'home' ? '' : `#${tab}`;
    window.history.pushState({ tab }, '', window.location.pathname + window.location.search + hash);
    setActiveTab(tab);
  };

  useEffect(() => {
    // The URL is authoritative, including direct links and manual hash changes.
    const syncTab = () => setActiveTab(readTabFromUrl());
    window.addEventListener('popstate', syncTab);
    window.addEventListener('hashchange', syncTab);
    return () => {
      window.removeEventListener('popstate', syncTab);
      window.removeEventListener('hashchange', syncTab);
    };
  }, []);

  // Mobile Bottom Navigation Tabs (Thumb-Friendly Polaroid Style with full 8 tool access)
  const mobileNavItems: { id: MainTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Inicio', icon: <Camera size={16} /> },
    { id: 'editor', label: 'Editor', icon: <Sparkles size={16} /> },
    { id: 'ocr', label: 'OCR', icon: <FileText size={16} /> },
    { id: 'merge', label: 'Unir', icon: <FilePlus2 size={16} /> },
    { id: 'split', label: 'Dividir', icon: <Scissors size={16} /> },
    { id: 'organize', label: 'Organizar', icon: <LayoutGrid size={16} /> },
    { id: 'convert', label: 'Conversor', icon: <RefreshCw size={16} /> },
    { id: 'security', label: 'Seguridad', icon: <Shield size={16} /> },
  ];

  return (
    <ToastProvider>
      <div className="h-screen w-screen bg-[#ede8df] flex flex-col font-sans text-stone-900 overflow-hidden select-none">
        {/* Top Navbar */}
        <Navbar activeTab={activeTab} setActiveTab={(tab) => navigateToTab(tab)} />

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-auto flex flex-col pb-16 lg:pb-0">
          {activeTab === 'home' && <DashboardHub onSelectTool={(tool) => navigateToTab(tool)} />}
          {activeTab === 'editor' && <EditorStudio />}
          {activeTab === 'merge' && <MergeTool />}
          {activeTab === 'split' && <SplitTool />}
          {activeTab === 'organize' && <OrganizeTool />}
          {activeTab === 'ocr' && <OCRTool />}
          {activeTab === 'convert' && <ConvertTool />}
          {activeTab === 'security' && <SecurityMetaTool />}
        </main>

        {/* Mobile Native Bottom Navigation Bar (Horizontally scrollable, 100% accessible) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f4efe8]/95 backdrop-blur-md border-t border-[#ded7cc] px-2 py-1.5 flex items-center space-x-1 overflow-x-auto no-scrollbar shadow-lg touch-pan-x">
          {mobileNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateToTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all shrink-0 min-w-[56px] ${
                  isActive
                    ? 'bg-amber-200/90 text-amber-950 font-black shadow-2xs scale-105 ring-1 ring-amber-300'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </ToastProvider>
  );
}
