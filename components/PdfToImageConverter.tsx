import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, FileCheck, Image as ImageIcon, Download, Settings, RefreshCw, Sliders, FileText, Ruler, AlertTriangle } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PagePreview {
  pageNumber: number;
  originalWidth: number;
  originalHeight: number;
  thumbnail: string;
  blob: Blob | null;
  outputWidthPx: number;
  outputHeightPx: number;
  outputMmW: number;
  outputMmH: number;
}

const PdfToImageConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalPdfInfo, setOriginalPdfInfo] = useState<{ widthMm: number, heightMm: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pages, setPages] = useState<PagePreview[]>([]);
  
  const [dpi, setDpi] = useState(300);
  const [targetWidthMm, setTargetWidthMm] = useState<number | ''>(''); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const injectDpiToJpeg = (blob: Blob, dpi: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const view = new DataView(arrayBuffer);
        if (view.getUint16(0) === 0xFFD8 && view.getUint16(2) === 0xFFE0) {
          view.setUint8(13, 1);
          view.setUint16(14, dpi);
          view.setUint16(16, dpi);
        }
        resolve(new Blob([arrayBuffer], { type: 'image/jpeg' }));
      };
      reader.readAsArrayBuffer(blob);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPages([]);
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        setOriginalPdfInfo({
          widthMm: Math.round((viewport.width / 72) * 25.4 * 10) / 10,
          heightMm: Math.round((viewport.height / 72) * 25.4 * 10) / 10
        });
      } catch (err) {
        console.error("無法讀取 PDF 資訊", err);
      }
    }
  };

  const processPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    const newPages: PagePreview[] = [];
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const originalWidthPts = viewport.width; 
        
        let renderScale: number;
        if (targetWidthMm !== '' && targetWidthMm > 0) {
          const targetWidthPixels = (targetWidthMm / 25.4) * dpi;
          renderScale = targetWidthPixels / originalWidthPts;
        } else {
          renderScale = dpi / 72;
        }

        const finalViewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(finalViewport.width);
        canvas.height = Math.floor(finalViewport.height);
        
        const context = canvas.getContext('2d');
        if (!context) continue;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // 修正：加入 canvas 屬性以符合 RenderParameters 類型要求
        await page.render({ 
          canvasContext: context, 
          viewport: finalViewport,
          canvas: canvas
        }).promise;
        
        const rawBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        let finalBlob: Blob | null = null;
        if (rawBlob) {
          finalBlob = await injectDpiToJpeg(rawBlob, dpi);
        }

        const thumbScale = 400 / originalWidthPts; 
        const thumbCanvas = document.createElement('canvas');
        const thumbViewport = page.getViewport({ scale: thumbScale }); // 修正：getPageViewport -> getViewport
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
            thumbCtx.fillStyle = '#ffffff';
            thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
            // 修正：加入 canvas 屬性以符合 RenderParameters 類型要求
            await page.render({ 
              canvasContext: thumbCtx, 
              viewport: thumbViewport,
              canvas: thumbCanvas
            }).promise;
        }

        newPages.push({
          pageNumber: i,
          originalWidth: originalWidthPts,
          originalHeight: viewport.height,
          thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.7),
          blob: finalBlob,
          outputWidthPx: canvas.width,
          outputHeightPx: canvas.height,
          outputMmW: Math.round((canvas.width / dpi) * 25.4 * 10) / 10,
          outputMmH: Math.round((canvas.height / dpi) * 25.4 * 10) / 10
        });

        setProgress(Math.round((i / numPages) * 100));
        canvas.width = 0; canvas.height = 0;
      }
      setPages(newPages);
    } catch (error) {
      console.error(error);
      alert('處理失敗');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (blob: Blob | null, pageNum: number) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace('.pdf', '')}_P${pageNum}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const presetSizes = [
    { label: 'A0', width: 841, height: 1189 },
    { label: 'A1', width: 841, height: 594 },
    { label: 'A2', width: 594, height: 420 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><ImageIcon className="w-32 h-32" /></div>
        <div className="mb-6 inline-flex p-6 rounded-[2rem] bg-orange-50 text-orange-600 shadow-inner"><RefreshCw className="w-12 h-12" /></div>
        <h3 className="text-4xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter">PDF 轉 JPG 高清轉換器</h3>
        <p className="text-slate-500 mb-10 font-medium italic">具備 DPI Metadata 注入技術，確保輸出尺寸與原稿 1:1</p>
        
        <div className="max-w-md mx-auto flex flex-col items-center gap-5">
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} className="w-full px-8 py-6 border-2 border-dashed border-slate-200 rounded-3xl hover:border-orange-400 hover:bg-orange-50/30 transition-all font-black flex items-center justify-center gap-4 text-slate-600">
             <FileCheck className="w-7 h-7 text-orange-500" /> {file ? file.name : '點擊上傳 PDF 或拖放至此'}
           </button>
           
           {file && !isProcessing && (
             <button onClick={processPdf} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:bg-black transition-all uppercase tracking-widest italic flex items-center justify-center gap-3">
               <RefreshCw className="w-5 h-5 text-orange-500" /> 產出印刷級影像
             </button>
           )}
        </div>

        {isProcessing && (
          <div className="mt-12 max-w-sm mx-auto">
            <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-widest text-orange-600"><span>正在處理 DPI Metadata 寫入...</span><span>{progress}%</span></div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-1 shadow-inner"><div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </div>

      {file && (
        <div className="grid grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-8 duration-700">
          <div className="col-span-12 lg:col-span-4 space-y-6 sticky top-24">
             <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-10">
                <div className="flex items-center gap-4 border-b pb-6">
                   <div className="p-3 bg-orange-50 rounded-2xl"><Settings className="w-6 h-6 text-orange-500" /></div>
                   <h4 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">尺寸與品質設定</h4>
                </div>

                {originalPdfInfo && (
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-orange-500">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">
                      <FileText className="w-3 h-3" /> 原始 PDF 物理尺寸
                    </div>
                    <div className="text-xl font-black text-slate-800 italic">
                      {originalPdfInfo.widthMm} <span className="text-xs text-slate-400 mx-1">x</span> {originalPdfInfo.heightMm} <span className="text-xs text-slate-400 ml-1">MM</span>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block italic">● 導出解析度 (DPI)</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[72, 150, 300, 600].map(val => (
                        <button 
                          key={val} 
                          onClick={() => setDpi(val)}
                          className={`py-3 rounded-xl font-black text-sm transition-all ${dpi === val ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >{val}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block italic">● 目標寬度調整 (MM)</label>
                      <button onClick={() => setTargetWidthMm('')} className="text-[9px] font-black text-orange-500 uppercase italic underline underline-offset-4 hover:text-orange-600 transition-colors">恢復原大</button>
                    </div>

                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                      {presetSizes.map(size => (
                        <button 
                          key={size.label} 
                          onClick={() => setTargetWidthMm(size.width)}
                          className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all shrink-0 ${targetWidthMm === size.width ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300'}`}
                        >
                          {size.label} ({size.width}x{size.height}mm)
                        </button>
                      ))}
                    </div>

                    <div className="relative group">
                      <input 
                        type="number" 
                        value={targetWidthMm} 
                        onChange={e => setTargetWidthMm(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-800 focus:ring-4 focus:ring-orange-500/10 transition-all text-xl"
                        placeholder="維持 PDF 原始比例"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity"><Ruler className="w-5 h-5" /></div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t space-y-4">
                  <button onClick={processPdf} className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase italic tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-3">
                    <Sliders className="w-5 h-5" /> 更新渲染清單
                  </button>
                </div>
             </div>

             <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white/40 font-bold text-[10px] uppercase leading-relaxed italic tracking-[0.1em] shadow-2xl">
                <div className="flex items-center gap-3 text-orange-500 mb-4 font-black">
                  <AlertTriangle className="w-4 h-4" /> <span>技術說明</span>
                </div>
                本系統產出的 JPG 已內嵌 JFIF 密度標籤。
             </div>
          </div>

          <div className="col-span-12 lg:col-span-8 bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden min-h-[600px]">
             <div className="p-8 border-b bg-slate-50/30 flex justify-between items-center">
                <h4 className="font-black italic text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><ImageIcon className="w-6 h-6 text-orange-500" /> 導出結果預覽</h4>
             </div>

             <div className="flex-1 p-10 bg-[#fcfcfd] overflow-y-auto custom-scrollbar">
                {pages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    {pages.map(p => (
                      <div key={p.pageNumber} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all hover:scale-[1.02]">
                        <div className="aspect-[1/1.4] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                          <img src={p.thumbnail} className="w-full h-full object-contain" alt={`Page ${p.pageNumber}`} />
                          <button 
                            onClick={() => downloadImage(p.blob, p.pageNumber)}
                            className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity gap-3"
                          >
                            <div className="p-4 bg-orange-500 rounded-full shadow-2xl"><Download className="w-6 h-6" /></div>
                            <span className="text-[10px] font-black uppercase italic tracking-widest">下載 JPG</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfToImageConverter;