import React, { useState, useRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, FileCheck, Palette, Ruler, Calculator, AlertTriangle, CheckCircle2, Maximize, List, Copy, Check } from 'lucide-react';

// 使用與 package.json 相符的 Worker 版本，避免版本不一致
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

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
        
        // Fix: Added required 'canvas' property to RenderParameters
        await page.render({ 
          canvasContext: context, 
          viewport: renderViewport,
          canvas: canvas
        }).promise;
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let isColor = false;
        for (let j = 0; j < data.length; j += 16) {
          const r = data[j];
          const g = data[j+1];
          const b = data[j+2];
          if (Math.abs(r - g) > 18 || Math.abs(g - b) > 18 || Math.abs(r - b) > 18) {
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
      console.error("PDF Analysis Error:", error);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Ruler className="w-32 h-32" /></div>
        <div className="mb-6 inline-flex p-6 rounded-[2rem] bg-orange-50 text-orange-600 shadow-inner"><Upload className="w-12 h-12" /></div>
        <h3 className="text-4xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter">影城 PDF 印前分析系統</h3>
        <p className="text-slate-500 mb-10 font-medium italic">自動辨識色彩、出血與技術規格</p>
        
        <div className="max-w-md mx-auto flex flex-col items-center gap-5">
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} className="w-full px-8 py-6 border-2 border-dashed border-slate-200 rounded-3xl hover:border-orange-400 hover:bg-orange-50/30 transition-all font-black flex items-center justify-center gap-4 text-slate-600">
             <FileCheck className="w-7 h-7 text-orange-500" /> {file ? file.name : '點擊上傳 PDF'}
           </button>
           {file && !isProcessing && results.length === 0 && (
             <button onClick={analyzePdf} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:bg-black transition-all uppercase tracking-widest italic flex items-center justify-center gap-2">
               <Maximize className="w-5 h-5 text-orange-500" /> 啟動深度分析
             </button>
           )}
        </div>

        {isProcessing && (
          <div className="mt-12 max-w-sm mx-auto">
            <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-widest text-orange-600"><span>正在處理頁面數據...</span><span>{progress}%</span></div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-1 shadow-inner"><div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4 space-y-6">
             <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden group">
                <h5 className="font-black text-slate-800 text-xl italic uppercase tracking-tighter mb-6">印前技術指標</h5>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                     <span className="text-[10px] font-black text-slate-400 uppercase italic">偵測尺寸</span>
                     <span className="text-sm font-black text-slate-700">{stats.mainSize}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                     <span className="text-[10px] font-black text-slate-400 uppercase italic">出血辨識</span>
                     <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase italic ${stats.isBleed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                       {stats.isBleed ? '已包含' : '未發現'}
                     </span>
                  </div>
                </div>
             </div>

             <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
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
                <button onClick={() => onTransfer({ totalPages: stats.total, colorCount: stats.color, bwCount: stats.bw, spine: stats.spine })} className="w-full py-6 bg-orange-500 text-white rounded-2xl font-black text-xs italic shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all uppercase tracking-widest flex items-center justify-center gap-3">
                  <Calculator className="w-4 h-4" /> 傳送數據至報價
                </button>
             </div>
          </div>
          
          <div className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
             <div className="flex justify-between items-center mb-8 border-b pb-6">
               <h5 className="font-black text-slate-800 text-xl italic uppercase tracking-tighter">分頁色彩分析結果</h5>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 overflow-y-auto max-h-[1000px] pr-4">
                {results.map(res => (
                  <div key={res.pageNumber} className="relative rounded-2xl border overflow-hidden group transition-all hover:scale-[1.03] border-slate-100">
                     <div className="aspect-[1/1.41] bg-slate-50 flex items-center justify-center overflow-hidden">
                       <img src={res.thumbnail} className="w-full h-full object-cover" alt={`Page ${res.pageNumber}`} />
                       <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-black italic">P.{res.pageNumber}</div>
                       {res.isColor && <div className="absolute top-2 right-2 bg-orange-500 text-white p-1 rounded-md shadow-lg"><Palette className="w-3 h-3" /></div>}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfAnalyzer;