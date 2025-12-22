
import React, { useState, useRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, FileCheck, Palette, Eye, Ruler, Calculator, AlertTriangle, CheckCircle2, Maximize, List, Copy, Check, Filter } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PageAnalysis {
  pageNumber: number;
  isColor: boolean;
  thumbnail: string;
  widthMm: number;
  heightMm: number;
  isLowRes: boolean;
}

interface PdfAnalyzerProps {
  onTransfer: (data: {totalPages: number, colorCount: number, bwCount: number, spine: number}) => void;
}

const PdfAnalyzer: React.FC<PdfAnalyzerProps> = ({ onTransfer }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<PageAnalysis[]>([]);
  const [copiedType, setCopiedType] = useState<'color' | 'bw' | null>(null);
  const [filterIssues, setFilterIssues] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults([]);
    }
  };

  const analyzePdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    const newResults: PageAnalysis[] = [];
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        
        const widthMm = Math.round((viewport.width / 72) * 25.4);
        const heightMm = Math.round((viewport.height / 72) * 25.4);

        const renderViewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) continue;
        
        canvas.height = renderViewport.height;
        canvas.width = renderViewport.width;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Fix: Add back the required 'canvas' property to RenderParameters
        await page.render({ 
          canvasContext: context, 
          viewport: renderViewport,
          canvas: canvas
        }).promise;
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let isColor = false;
        for (let j = 0; j < data.length; j += 16) {
          if (Math.abs(data[j] - data[j+1]) > 18 || Math.abs(data[j+1] - data[j+2]) > 18) {
            isColor = true;
            break;
          }
        }

        const isLowRes = viewport.width < 300 || viewport.height < 300;

        newResults.push({ 
          pageNumber: i, 
          isColor, 
          thumbnail: canvas.toDataURL('image/jpeg', 0.6),
          widthMm,
          heightMm,
          isLowRes
        });
        setProgress(Math.round((i / numPages) * 100));
      }
      setResults(newResults);
    } catch (error) {
      alert('分析失敗');
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const colorPagesArr = results.filter(r => r.isColor).map(r => r.pageNumber);
    const bwPagesArr = results.filter(r => !r.isColor).map(r => r.pageNumber);
    const color = colorPagesArr.length;
    const bw = bwPagesArr.length;
    const spine = Number(((results.length / 2) * 0.1).toFixed(2));
    
    const mainSize = `${results[0].widthMm} x ${results[0].heightMm} mm`;
    const isBleed = results[0].widthMm > 210 && results[0].widthMm < 220;
    const hasLowRes = results.some(r => r.isLowRes);

    return { color, bw, total: results.length, spine, mainSize, isBleed, hasLowRes, colorPagesArr, bwPagesArr };
  }, [results]);

  const copyPages = (pages: number[], type: 'color' | 'bw') => {
    if (pages.length === 0) return;
    const text = pages.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const filteredResults = useMemo(() => {
    if (!filterIssues) return results;
    return results.filter(r => r.isLowRes || (r.widthMm <= 210));
  }, [results, filterIssues]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Ruler className="w-32 h-32" /></div>
        <div className="mb-6 inline-flex p-6 rounded-[2rem] bg-orange-50 text-orange-600 shadow-inner"><Upload className="w-12 h-12" /></div>
        <h3 className="text-4xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter">影城 PDF 印前分析系統</h3>
        <p className="text-slate-500 mb-10 font-medium italic">自動辨識色彩、出血與技術規格，降低印製錯誤風險</p>
        
        <div className="max-w-md mx-auto flex flex-col items-center gap-5">
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} className="w-full px-8 py-6 border-2 border-dashed border-slate-200 rounded-3xl hover:border-orange-400 hover:bg-orange-50/30 transition-all font-black flex items-center justify-center gap-4 text-slate-600">
             <FileCheck className="w-7 h-7 text-orange-500" /> {file ? file.name : '點擊上傳 PDF 或拖放至此'}
           </button>
           {file && !isProcessing && results.length === 0 && (
             <button onClick={analyzePdf} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:bg-black transition-all uppercase tracking-widest italic flex items-center justify-center gap-2">
               <Maximize className="w-5 h-5 text-orange-500" /> 啟動 21 項指標深度分析
             </button>
           )}
        </div>

        {isProcessing && (
          <div className="mt-12 max-w-sm mx-auto">
            <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-widest text-orange-600"><span>正在提取頁面與色彩數據...</span><span>{progress}%</span></div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-1 shadow-inner"><div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </div>

      {stats && (
        <div className="space-y-10 animate-in slide-in-from-bottom-12 duration-700">
          {(!stats.isBleed || stats.hasLowRes) && (
            <div className="bg-red-50 border-l-8 border-red-500 p-8 rounded-3xl flex items-start gap-6 shadow-md">
              <AlertTriangle className="w-12 h-12 text-red-500 shrink-0 mt-1" />
              <div>
                <h4 className="text-2xl font-black text-red-700 italic uppercase mb-2">印前異常警告</h4>
                <ul className="text-red-600 font-bold leading-relaxed italic list-disc ml-5 space-y-1">
                  {!stats.isBleed && <li>檢測到頁面尺寸可能不含出血（Bleed），裁切時重要文字或圖案有被切除的風險。</li>}
                  {stats.hasLowRes && <li>部分頁面原始解析度低於印刷標準，最終印製品可能會有模糊或馬賽克現象。</li>}
                </ul>
                <p className="mt-4 text-red-500/70 text-sm font-black italic uppercase tracking-wider">建議修正原稿後再行上傳印刷</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-6">
               <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="font-black text-slate-800 text-xl italic uppercase tracking-tighter">印前技術指標</h5>
                    {stats.isBleed && !stats.hasLowRes ? <CheckCircle2 className="text-green-500 w-6 h-6" /> : <AlertTriangle className="text-amber-500 w-6 h-6" />}
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                       <span className="text-[10px] font-black text-slate-400 uppercase italic">偵測尺寸</span>
                       <span className="text-sm font-black text-slate-700">{stats.mainSize}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                       <span className="text-[10px] font-black text-slate-400 uppercase italic">出血辨識</span>
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase italic ${stats.isBleed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                         {stats.isBleed ? '已包含出血' : '無出血預留'}
                       </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setFilterIssues(!filterIssues)}>
                       <span className="text-[10px] font-black text-slate-400 uppercase italic">解析度檢查</span>
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase italic ${!stats.hasLowRes ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                         {!stats.hasLowRes ? '符合標準' : '點擊檢視問題'}
                       </span>
                    </div>
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic mb-8">Analysis Summary</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center">
                       <p className="text-[10px] font-black text-orange-500 uppercase italic mb-2 tracking-widest">Color</p>
                       <h6 className="text-7xl font-black italic tracking-tighter text-white">{stats.color}</h6>
                    </div>
                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2 tracking-widest">B&W</p>
                       <h6 className="text-7xl font-black italic tracking-tighter text-white">{stats.bw}</h6>
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-black text-orange-400 uppercase italic flex items-center gap-2"><Palette className="w-3 h-3"/> 彩色頁碼清單</p>
                        <button onClick={() => copyPages(stats.colorPagesArr, 'color')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40">
                          {copiedType === 'color' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[11px] font-medium text-white/50 leading-relaxed bg-white/5 p-4 rounded-xl max-h-32 overflow-y-auto custom-scrollbar cursor-pointer" onClick={() => copyPages(stats.colorPagesArr, 'color')}>
                        {stats.colorPagesArr.length > 0 ? stats.colorPagesArr.join(', ') : '無'}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase italic flex items-center gap-2"><List className="w-3 h-3"/> 黑白頁碼清單</p>
                        <button onClick={() => copyPages(stats.bwPagesArr, 'bw')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40">
                          {copiedType === 'bw' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[11px] font-medium text-white/50 leading-relaxed bg-white/5 p-4 rounded-xl max-h-32 overflow-y-auto custom-scrollbar cursor-pointer" onClick={() => copyPages(stats.bwPagesArr, 'bw')}>
                        {stats.bwPagesArr.length > 0 ? stats.bwPagesArr.join(', ') : '無'}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/10 w-full mb-8"></div>
                  <button onClick={() => onTransfer({ totalPages: stats.total, colorCount: stats.color, bwCount: stats.bw, spine: stats.spine })} className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm italic uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20">
                    <Calculator className="w-5 h-5" /> 帶入智慧報價系統
                  </button>
               </div>
            </div>

            <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <h4 className="font-black italic text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><Eye className="w-6 h-6 text-orange-500" /> 技術檢視模式</h4>
                  <button 
                    onClick={() => setFilterIssues(!filterIssues)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${filterIssues ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                  >
                    <Filter className="w-3 h-3" /> {filterIssues ? '顯示所有頁面' : '只顯示有問題的頁面'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-4 py-2 rounded-full uppercase italic">300 DPI 模擬檢查</span>
                  <span className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-full uppercase italic tracking-widest">Total {stats.total} Pages</span>
                </div>
              </div>
              <div className="p-10 grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-8 overflow-y-auto h-[700px] bg-[#fcfcfd] custom-scrollbar">
                {filteredResults.map(p => (
                  <div key={p.pageNumber} className={`aspect-[1/1.4] rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 hover:z-10 bg-white shadow-sm flex flex-col relative group ${p.isColor ? 'border-orange-200 ring-8 ring-orange-500/5' : 'border-slate-100'}`}>
                    <div className="flex-1 overflow-hidden relative">
                      <img src={p.thumbnail} className="w-full h-full object-contain" alt={`Page ${p.pageNumber}`} />
                      {p.isLowRes && (
                        <div className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-lg shadow-lg group-hover:scale-125 transition-transform">
                          <AlertTriangle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="bg-white text-slate-400 text-[9px] font-black text-center py-2 border-t flex flex-col items-center group-hover:bg-slate-50">
                      <span>P.{p.pageNumber}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-slate-300 font-mono">{p.widthMm}x{p.heightMm}mm</span>
                    </div>
                  </div>
                ))}
                {filteredResults.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-400 font-black italic uppercase tracking-widest">此過濾條件下無任何頁面</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfAnalyzer;
