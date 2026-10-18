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
  const [activeTab, setActiveTab] = useState<MainTabType>('home');

  // Intelligent Tab Navigation with Browser History Integration
  const navigateToTab = (tab: MainTabType, pushHistory = true) => {
    setActiveTab(tab);
    if (pushHistory && typeof window !== 'undefined') {
      window.history.pushState({ tab }, '', tab === 'home' ? '/' : `/#${tab}`);
    }
  };

  // Android / Browser Back and Forward Button Interceptor
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        // Return to home gallery when back is pressed
        setActiveTab('home');
      }
    };

    if (typeof window !== 'undefined') {
      window.history.replaceState({ tab: activeTab }, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
      }
    };
  }, []);

  // Mobile Bottom Navigation Tabs (Thumb-Friendly Polaroid Style)
  const mobileNavItems: { id: MainTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Inicio', icon: <Camera size={18} /> },
    { id: 'editor', label: 'Editor', icon: <Sparkles size={18} /> },
    { id: 'ocr', label: 'OCR', icon: <FileText size={18} /> },
    { id: 'merge', label: 'Unir', icon: <FilePlus2 size={18} /> },
    { id: 'split', label: 'Dividir', icon: <Scissors size={18} /> },
    { id: 'organize', label: 'Organizar', icon: <LayoutGrid size={18} /> },
  ];

  return (
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

      {/* Mobile Native Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f4efe8]/95 backdrop-blur-md border-t border-[#ded7cc] px-2 py-1.5 flex items-center justify-around shadow-lg">
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateToTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-amber-200/90 text-amber-950 font-black shadow-2xs scale-105 ring-1 ring-amber-300'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
