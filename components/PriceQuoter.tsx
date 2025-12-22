
import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Plus, Trash2, Layers, Calculator, Palette, ClipboardCheck, Download, ChevronUp, ChevronDown, SaveAll, Sliders, Tag, Percent, Sparkles, Copy, X, Printer, Check, Upload, FileJson } from 'lucide-react';

interface PriceTier {
  minAmount: number;
  price: number;
}

interface PriceOption {
  id: string;
  name: string;
  basePrice: number;
  tiers: PriceTier[];
  tierType: 'quantity' | 'pages';
  sheetThickness?: number;
}

interface Addon {
  id: string;
  name: string;
  pricePerUnit: number;
  selected: boolean;
}

interface QuoteScenario {
  id: string;
  timestamp: number;
  title: string;
  specs: string;
  total: number;
}

interface PriceQuoterProps {
  initialData?: { totalPages: number, colorCount: number, bwCount: number, spine: number } | null;
}

const PriceQuoter: React.FC<PriceQuoterProps> = ({ initialData }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [openSection, setOpenSection] = useState<'binding' | 'inner' | 'addons' | null>('binding');
  const [scenarios, setScenarios] = useState<QuoteScenario[]>([]);

  // 報價輸入狀態
  const [manualPages, setManualPages] = useState(0);
  const [manualColor, setManualColor] = useState(0);
  const [manualBw, setManualBw] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // 預設報價規則 (當 LocalStorage 沒資料時使用)
  const defaultBindingOptions: PriceOption[] = [
    { id: 'b1', name: '無線膠裝 (含封面製作)', basePrice: 50, tierType: 'quantity', tiers: [{ minAmount: 50, price: 45 }, { minAmount: 100, price: 35 }] },
    { id: 'b2', name: '塑膠膠環裝', basePrice: 40, tierType: 'quantity', tiers: [] },
  ];

  const defaultPaperOptions: PriceOption[] = [
    { id: 'p1', name: '80g 道林紙 (內頁)', basePrice: 0.5, tierType: 'pages', sheetThickness: 0.1, tiers: [{ minAmount: 51, price: 0.4 }, { minAmount: 101, price: 0.3 }] },
    { id: 'p2', name: '100g 銅版紙 (內頁)', basePrice: 0.8, tierType: 'pages', sheetThickness: 0.12, tiers: [] },
  ];

  const defaultAddons: Addon[] = [
    { id: 'a1', name: '霧面導圓角', pricePerUnit: 15, selected: false },
    { id: 'a2', name: '封面單面上亮膜', pricePerUnit: 10, selected: false },
    { id: 'a3', name: '封面單面上霧膜', pricePerUnit: 10, selected: false },
    { id: 'a4', name: '封面局部上光', pricePerUnit: 30, selected: false },
  ];

  const [bindingOptions, setBindingOptions] = useState<PriceOption[]>(defaultBindingOptions);
  const [paperOptions, setPaperOptions] = useState<PriceOption[]>(defaultPaperOptions);
  const [addons, setAddons] = useState<Addon[]>(defaultAddons);

  // 初始化：從 LocalStorage 載入設定
  useEffect(() => {
    const savedBinding = localStorage.getItem('pm_binding_opts');
    const savedPaper = localStorage.getItem('pm_paper_opts');
    const savedAddons = localStorage.getItem('pm_addons_opts');

    if (savedBinding) setBindingOptions(JSON.parse(savedBinding));
    if (savedPaper) setPaperOptions(JSON.parse(savedPaper));
    if (savedAddons) setAddons(JSON.parse(savedAddons).map((a: any) => ({ ...a, selected: false }))); // 重置選擇狀態
  }, []);

  // 每次設定變更時儲存至 LocalStorage
  const saveSettingsToLocal = (newBinding?: PriceOption[], newPaper?: PriceOption[], newAddons?: Addon[]) => {
    if (newBinding) localStorage.setItem('pm_binding_opts', JSON.stringify(newBinding));
    if (newPaper) localStorage.setItem('pm_paper_opts', JSON.stringify(newPaper));
    if (newAddons) localStorage.setItem('pm_addons_opts', JSON.stringify(newAddons));
  };

  useEffect(() => {
    if (initialData) {
      setManualPages(initialData.totalPages);
      setManualColor(initialData.colorCount);
      setManualBw(initialData.bwCount);
    }
  }, [initialData]);

  const [selectedBindingId, setSelectedBindingId] = useState('b1');
  const [selectedInnerPaperId, setSelectedInnerPaperId] = useState('p1');

  const currentBindingPrice = useMemo(() => {
    const opt = bindingOptions.find(o => o.id === selectedBindingId);
    if (!opt) return 0;
    const tier = opt.tiers.filter(t => quantity >= t.minAmount).sort((a, b) => b.minAmount - a.minAmount)[0];
    return tier ? tier.price : opt.basePrice;
  }, [selectedBindingId, quantity, bindingOptions]);

  const currentPaperPrice = useMemo(() => {
    const opt = paperOptions.find(o => o.id === selectedInnerPaperId);
    if (!opt) return 0;
    const tier = opt.tiers.filter(t => manualPages >= t.minAmount).sort((a, b) => b.minAmount - a.minAmount)[0];
    return tier ? tier.price : opt.basePrice;
  }, [selectedInnerPaperId, manualPages, paperOptions]);

  const addonTotal = useMemo(() => addons.filter(a => a.selected).reduce((sum, a) => sum + a.pricePerUnit, 0), [addons]);

  const totalPrice = useMemo(() => {
    if (manualPages === 0) return 0;
    const perBookPrice = (manualColor * 5) + (manualBw * 1) + (manualPages * currentPaperPrice) + currentBindingPrice + addonTotal;
    return Math.round(perBookPrice * quantity);
  }, [manualPages, manualColor, manualBw, quantity, currentBindingPrice, currentPaperPrice, addonTotal]);

  const updateOption = (type: 'binding' | 'paper', id: string, field: string, value: any) => {
    const setter = type === 'binding' ? setBindingOptions : setPaperOptions;
    setter(prev => {
      const next = prev.map(opt => opt.id === id ? { ...opt, [field]: value } : opt);
      saveSettingsToLocal(type === 'binding' ? next : undefined, type === 'paper' ? next : undefined);
      return next;
    });
  };

  const updateAddon = (id: string, field: keyof Addon, value: any) => {
    setAddons(prev => {
      const next = prev.map(a => a.id === id ? { ...a, [field]: value } : a);
      saveSettingsToLocal(undefined, undefined, next);
      return next;
    });
  };

  const addNewAddon = () => {
    const newA: Addon = { id: Date.now().toString(), name: '新加工項目', pricePerUnit: 0, selected: false };
    const next = [...addons, newA];
    setAddons(next);
    saveSettingsToLocal(undefined, undefined, next);
  };

  const removeAddon = (id: string) => {
    const next = addons.filter(a => a.id !== id);
    setAddons(next);
    saveSettingsToLocal(undefined, undefined, next);
  };

  // 匯出報價設定檔
  const exportConfig = () => {
    const config = {
      binding: bindingOptions,
      paper: paperOptions,
      addons: addons.map(a => ({ ...a, selected: false }))
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `影城報價設定_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 匯入報價設定檔
  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        if (config.binding && config.paper && config.addons) {
          setBindingOptions(config.binding);
          setPaperOptions(config.paper);
          setAddons(config.addons);
          saveSettingsToLocal(config.binding, config.paper, config.addons);
          alert('設定檔已成功匯入並套用！');
        } else {
          throw new Error('格式不正確');
        }
      } catch (err) {
        alert('匯入失敗，請確認檔案格式正確。');
      }
    };
    reader.readAsText(file);
  };

  const saveScenario = () => {
    const paperName = paperOptions.find(o => o.id === selectedInnerPaperId)?.name;
    const bindingName = bindingOptions.find(o => o.id === selectedBindingId)?.name;
    const newS: QuoteScenario = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      title: `方案 ${scenarios.length + 1}`,
      specs: `${paperName} / ${bindingName} / ${manualPages}P`,
      total: totalPrice
    };
    setScenarios([newS, ...scenarios].slice(0, 3));
    alert('已儲存至對比清單');
  };

  const toggleAddonSelection = (id: string) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border shadow-sm">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-[1.5rem] shadow-xl shadow-orange-100"><Calculator className="w-8 h-8" /></div>
          <div><h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">影城 智慧報價工作站</h3><p className="text-slate-400 text-[10px] font-black mt-1 uppercase tracking-widest italic">Professional Quote Engine v4.0</p></div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setShowSettings(!showSettings)} className={`px-8 py-4 rounded-2xl text-sm font-black transition-all ${showSettings ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border'}`}>
             <Settings className={`w-4 h-4 inline-block mr-2 ${showSettings ? 'animate-spin' : ''}`} />
             {showSettings ? '關閉管理後台' : '管理報價規則'}
           </button>
           <button onClick={() => setShowExportModal(true)} className="px-8 py-4 bg-orange-500 text-white rounded-2xl text-sm font-black hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all flex items-center gap-2 italic tracking-widest uppercase"><Printer className="w-4 h-4"/> 正式導出</button>
        </div>
      </div>

      {showSettings ? (
        <div className="bg-white rounded-[3.5rem] border border-slate-200 p-12 shadow-sm animate-in zoom-in-95">
          <div className="flex flex-wrap items-center justify-between gap-6 mb-10 border-b pb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><Settings className="w-6 h-6" /></div>
              <div><h3 className="text-xl font-black text-slate-900 italic">報價參數與加工細節管理</h3><p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">Configure price tiers and sync across devices</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={exportConfig} className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-all italic uppercase"><Download className="w-4 h-4"/> 匯出設定檔</button>
              <label className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-xl text-xs font-black hover:bg-orange-100 transition-all italic uppercase cursor-pointer">
                <Upload className="w-4 h-4"/> 匯入設定檔
                <input type="file" accept=".json" onChange={importConfig} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            {/* 裝訂管理 */}
            <div className={`border rounded-[2rem] transition-all overflow-hidden ${openSection === 'binding' ? 'border-orange-200 shadow-md' : 'border-slate-100'}`}>
              <button onClick={() => setOpenSection(openSection === 'binding' ? null : 'binding')} className="w-full flex items-center justify-between p-7 bg-slate-50/30 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3"><Layers className={`w-5 h-5 ${openSection === 'binding' ? 'text-orange-500' : 'text-slate-400'}`} /><span className="font-black text-slate-800">裝訂方式 (依印製本數折扣)</span></div>
                {openSection === 'binding' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {openSection === 'binding' && (
                <div className="p-8 space-y-6">
                  {bindingOptions.map(opt => (
                    <div key={opt.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex gap-4">
                        <input className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-black" value={opt.name} onChange={e => updateOption('binding', opt.id, 'name', e.target.value)} />
                        <div className="w-32 relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">$</span><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 pl-8 text-sm font-black text-right" value={opt.basePrice} onChange={e => updateOption('binding', opt.id, 'basePrice', Number(e.target.value))} /></div>
                      </div>
                      <div className="pl-6 border-l-4 border-orange-100 space-y-3">
                        {opt.tiers.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-4 text-xs font-bold text-slate-600">
                            <span>滿</span><input type="number" className="w-20 border rounded-lg px-2 py-1" value={t.minAmount} onChange={e => { const nt = [...opt.tiers]; nt[idx].minAmount = Number(e.target.value); updateOption('binding', opt.id, 'tiers', nt); }} /><span>本，單價 $</span><input type="number" className="w-20 border rounded-lg px-2 py-1" value={t.price} onChange={e => { const nt = [...opt.tiers]; nt[idx].price = Number(e.target.value); updateOption('binding', opt.id, 'tiers', nt); }} />
                            <button onClick={() => updateOption('binding', opt.id, 'tiers', opt.tiers.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500">×</button>
                          </div>
                        ))}
                        <button onClick={() => updateOption('binding', opt.id, 'tiers', [...opt.tiers, { minAmount: 50, price: opt.basePrice }])} className="text-[10px] font-black text-orange-600">+ 新增折扣級別</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 內頁紙材管理 */}
            <div className={`border rounded-[2rem] transition-all overflow-hidden ${openSection === 'inner' ? 'border-orange-200 shadow-md' : 'border-slate-100'}`}>
              <button onClick={() => setOpenSection(openSection === 'inner' ? null : 'inner')} className="w-full flex items-center justify-between p-7 bg-slate-50/30 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3"><Palette className={`w-5 h-5 ${openSection === 'inner' ? 'text-orange-500' : 'text-slate-400'}`} /><span className="font-black text-slate-800">內頁紙材 (依總頁數折扣)</span></div>
                {openSection === 'inner' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {openSection === 'inner' && (
                <div className="p-8 space-y-6">
                   {paperOptions.map(opt => (
                    <div key={opt.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex gap-4">
                        <input className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-black" value={opt.name} onChange={e => updateOption('paper', opt.id, 'name', e.target.value)} />
                        <div className="w-32 relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">$</span><input type="number" step="0.1" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 pl-8 text-sm font-black text-right" value={opt.basePrice} onChange={e => updateOption('paper', opt.id, 'basePrice', Number(e.target.value))} /></div>
                      </div>
                      <div className="pl-6 border-l-4 border-orange-100 space-y-3">
                        {opt.tiers.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-4 text-xs font-bold text-slate-600">
                            <span>滿</span><input type="number" className="w-20 border rounded-lg px-2 py-1" value={t.minAmount} onChange={e => { const nt = [...opt.tiers]; nt[idx].minAmount = Number(e.target.value); updateOption('paper', opt.id, 'tiers', nt); }} /><span>頁，單張 $</span><input type="number" step="0.1" className="w-20 border rounded-lg px-2 py-1" value={t.price} onChange={e => { const nt = [...opt.tiers]; nt[idx].price = Number(e.target.value); updateOption('paper', opt.id, 'tiers', nt); }} />
                            <button onClick={() => updateOption('paper', opt.id, 'tiers', opt.tiers.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500">×</button>
                          </div>
                        ))}
                        <button onClick={() => updateOption('paper', opt.id, 'tiers', [...opt.tiers, { minAmount: 100, price: opt.basePrice }])} className="text-[10px] font-black text-orange-600">+ 新增折扣級別</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 後加工管理 */}
            <div className={`border rounded-[2rem] transition-all overflow-hidden ${openSection === 'addons' ? 'border-orange-200 shadow-md' : 'border-slate-100'}`}>
              <button onClick={() => setOpenSection(openSection === 'addons' ? null : 'addons')} className="w-full flex items-center justify-between p-7 bg-slate-50/30 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3"><Sparkles className={`w-5 h-5 ${openSection === 'addons' ? 'text-orange-500' : 'text-slate-400'}`} /><span className="font-black text-slate-800">後加工與特殊工藝 (加價項目)</span></div>
                {openSection === 'addons' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {openSection === 'addons' && (
                <div className="p-8 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {addons.map(a => (
                      <div key={a.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                        <input className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black" value={a.name} onChange={e => updateAddon(a.id, 'name', e.target.value)} placeholder="加工名稱" />
                        <div className="w-32 relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">$</span>
                          <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 pl-8 text-sm font-black text-right" value={a.pricePerUnit} onChange={e => updateAddon(a.id, 'pricePerUnit', Number(e.target.value))} placeholder="加價" />
                        </div>
                        <button onClick={() => removeAddon(a.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={addNewAddon} className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black hover:border-orange-300 hover:text-orange-500 transition-all text-xs uppercase italic tracking-widest"><Plus className="w-4 h-4"/> 新增自定義加工</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-14 pt-8 border-t flex justify-end">
             <button onClick={() => setShowSettings(false)} className="px-14 py-5 bg-orange-500 text-white rounded-[1.5rem] font-black shadow-xl shadow-orange-100 flex items-center gap-3 active:scale-95 transition-all text-sm uppercase italic tracking-widest"><SaveAll className="w-5 h-5"/> 儲存並關閉</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white p-12 rounded-[3.5rem] border shadow-sm">
              <div className="flex items-center gap-4 mb-10 pb-6 border-b">
                 <div className="p-3 bg-orange-50 rounded-2xl"><Sliders className="w-6 h-6 text-orange-500" /></div>
                 <h4 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">基礎印刷規格配置</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block italic">● 檔案總頁數</label>
                    <input type="number" value={manualPages} onChange={e => setManualPages(Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-3xl p-6 text-4xl font-black focus:ring-4 focus:ring-orange-500/10" placeholder="0" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">彩色頁</label><input type="number" value={manualColor} onChange={e => setManualColor(Number(e.target.value))} className="w-full bg-orange-50/50 border-none rounded-2xl p-4 font-black text-orange-600" /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">黑白頁</label><input type="number" value={manualBw} onChange={e => setManualBw(Number(e.target.value))} className="w-full bg-slate-100/50 border-none rounded-2xl p-4 font-black text-slate-700" /></div>
                  </div>
                </div>
                <div className="space-y-8">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block italic">● 裝訂選擇</label><select value={selectedBindingId} onChange={e => setSelectedBindingId(e.target.value)} className="w-full bg-slate-50 border-none rounded-3xl p-6 font-black text-slate-800 appearance-none cursor-pointer focus:ring-4 focus:ring-orange-500/10">{bindingOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block italic">● 內頁紙材</label><select value={selectedInnerPaperId} onChange={e => setSelectedInnerPaperId(e.target.value)} className="w-full bg-slate-50 border-none rounded-3xl p-6 font-black text-slate-800 appearance-none cursor-pointer focus:ring-4 focus:ring-orange-500/10">{paperOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] border shadow-sm">
              <div className="flex items-center gap-4 mb-10 pb-6 border-b">
                 <div className="p-3 bg-orange-50 rounded-2xl"><Sparkles className="w-6 h-6 text-orange-500" /></div>
                 <h4 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">後加工與特殊工藝</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                {addons.map(a => (
                  <button key={a.id} onClick={() => toggleAddonSelection(a.id)} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 text-center group relative ${a.selected ? 'border-orange-500 bg-orange-50 shadow-lg' : 'border-slate-100 hover:border-slate-300'}`}>
                    <div className={`p-3 rounded-xl transition-all ${a.selected ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}><Palette className="w-5 h-5" /></div>
                    <span className={`text-[10px] font-black uppercase tracking-tighter leading-tight ${a.selected ? 'text-orange-600' : 'text-slate-500'}`}>{a.name}</span>
                    <span className="text-[11px] font-black text-slate-400">$+{a.pricePerUnit}</span>
                    {a.selected && <Check className="absolute top-4 right-4 w-4 h-4 text-orange-500" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 sticky top-24">
            <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -bottom-20 -right-20 opacity-5"><Tag className="w-80 h-80" /></div>
              <div className="relative z-10">
                 <div className="flex justify-between items-center mb-10">
                   <span className="text-xs font-black text-orange-500 uppercase tracking-widest italic opacity-80">Quotation Summary</span>
                   <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-3"><span className="text-[10px] text-slate-400 font-black">x</span><input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))} className="bg-transparent border-none text-right font-black text-3xl w-24 focus:ring-0 text-white" /><span className="text-xs text-slate-400 font-black italic">本</span></div>
                 </div>
                 <div className="mb-14"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 opacity-60 italic">Estimated Total Amount</p><p className="text-8xl font-black text-orange-500 tracking-tighter animate-in fade-in"><span className="text-2xl mr-2">$</span>{totalPrice.toLocaleString()}</p></div>
                 <div className="space-y-4">
                   <button onClick={saveScenario} className="w-full py-6 bg-white/10 text-white rounded-[2rem] font-black text-xs italic border border-white/5 hover:bg-white/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"><Copy className="w-5 h-5" /> 暫存方案比對</button>
                   <button onClick={() => setShowExportModal(true)} className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase italic tracking-widest shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-all">正式導出報價</button>
                 </div>
              </div>
            </div>

            {scenarios.length > 0 && (
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">方案對比清單 ({scenarios.length})</h5>
                 <div className="space-y-4">
                   {scenarios.map(s => (
                     <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                       <div className="flex-1 min-w-0 pr-4"><p className="text-[10px] font-black text-orange-500 uppercase italic mb-0.5">{s.title}</p><p className="text-[10px] font-bold text-slate-600 truncate">{s.specs}</p></div>
                       <div className="text-right"><span className="text-lg font-black text-slate-800 italic tracking-tighter">${s.total.toLocaleString()}</span></div>
                       <button onClick={() => setScenarios(scenarios.filter(q => q.id !== s.id))} className="ml-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"><X className="w-4 h-4"/></button>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-16 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowExportModal(false)} className="absolute top-10 right-10 p-3 text-slate-300 hover:text-slate-900"><X className="w-8 h-8"/></button>
            <div className="flex flex-col items-center mb-12 border-b pb-12 text-center">
               <div className="bg-orange-500 p-4 rounded-2xl text-white mb-4"><Printer className="w-8 h-8" /></div>
               <h2 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter">影城數位印刷 正式估價單</h2>
            </div>
            <div className="space-y-8 mb-16">
              <div className="grid grid-cols-2 gap-10">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block italic">客戶名稱</label><div className="text-xl font-black text-slate-800 border-b pb-2">展示客戶</div></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block italic">報價日期</label><div className="text-xl font-black text-slate-800 border-b pb-2">{new Date().toLocaleDateString()}</div></div>
              </div>
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                 <h6 className="text-[10px] font-black text-orange-600 uppercase italic">項目明細描述</h6>
                 <div className="space-y-3">
                   <div className="flex justify-between text-sm font-bold text-slate-600 italic"><span>印刷內頁：{manualPages} 頁 ({manualColor}彩 / {manualBw}黑)</span><span>NT$ {((manualColor * 5) + (manualBw * 1) + (manualPages * currentPaperPrice)).toLocaleString()}</span></div>
                   <div className="flex justify-between text-sm font-bold text-slate-600 italic"><span>裝訂方式：{bindingOptions.find(o => o.id === selectedBindingId)?.name}</span><span>NT$ {currentBindingPrice}</span></div>
                   {addons.filter(a => a.selected).map(a => (
                     <div key={a.id} className="flex justify-between text-sm font-bold text-slate-600 italic"><span>後加工：{a.name}</span><span>NT$ {a.pricePerUnit}</span></div>
                   ))}
                 </div>
                 <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-end">
                    <span className="text-xs font-black text-slate-400 uppercase">單本預估 / 印製 {quantity} 本</span>
                    <span className="text-4xl font-black italic text-orange-500 tracking-tighter">NT$ {totalPrice.toLocaleString()}</span>
                 </div>
              </div>
            </div>
            <div className="flex gap-4">
               <button onClick={() => window.print()} className="flex-1 py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-3"><Printer className="w-5 h-5 text-orange-500" /> 列印報價單</button>
               <button onClick={() => setShowExportModal(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-[1.5rem] font-black uppercase italic tracking-widest hover:text-slate-900">返回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceQuoter;
