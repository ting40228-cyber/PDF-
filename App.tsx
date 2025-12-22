
import React, { useState } from 'react';
import { Layout, Printer, BookOpen, Settings, Info, Calculator, Image as ImageIcon, FileText } from 'lucide-react';
import PdfAnalyzer from './components/PdfAnalyzer';
import FlipbookViewer from './components/FlipbookViewer';
import PriceQuoter from './components/PriceQuoter';
import PdfToImageConverter from './components/PdfToImageConverter';

export enum Module {
  ANALYZER = 'analyzer',
  QUOTER = 'quoter',
  FLIPBOOK = 'flipbook',
  CONVERTER = 'converter'
}

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<Module>(Module.ANALYZER);
  
  const [sharedData, setSharedData] = useState<{totalPages: number, colorCount: number, bwCount: number, spine: number} | null>(null);

  const handleTransferToQuote = (data: {totalPages: number, colorCount: number, bwCount: number, spine: number}) => {
    setSharedData(data);
    setActiveModule(Module.QUOTER);
  };

  const navItems = [
    { id: Module.ANALYZER, label: '印前自動分析', icon: Layout },
    { id: Module.QUOTER, label: '智慧報價系統', icon: Calculator },
    { id: Module.FLIPBOOK, label: '電子書預覽', icon: BookOpen },
    { id: Module.CONVERTER, label: 'PDF 轉 JPG 工具', icon: ImageIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-200">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-black italic text-xl tracking-tighter uppercase">影城數位</h1>
          </div>
          <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em] italic">Pro Printing Suite v4.0</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 font-black text-sm italic group ${
                activeModule === item.id 
                ? 'bg-slate-900 text-white shadow-xl translate-x-1' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeModule === item.id ? 'text-orange-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Settings className="w-4 h-4 text-slate-400" /></div>
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">管理設定</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] relative">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-12 py-6 flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] italic">
            {navItems.find(n => n.id === activeModule)?.label}
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase italic">
              <Info className="w-4 h-4" /> 系統運行正常
            </div>
          </div>
        </header>

        <div className="p-12 max-w-[1600px] mx-auto">
          {activeModule === Module.ANALYZER && <PdfAnalyzer onTransfer={handleTransferToQuote} />}
          {activeModule === Module.QUOTER && <PriceQuoter initialData={sharedData} />}
          {activeModule === Module.FLIPBOOK && <FlipbookViewer />}
          {activeModule === Module.CONVERTER && <PdfToImageConverter />}
        </div>
      </main>
    </div>
  );
};

export default App;
