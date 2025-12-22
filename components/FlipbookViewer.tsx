
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, ChevronLeft, ChevronRight, BookOpen, Share2, Copy, Loader2, Palette, Layout } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type Theme = 'studio' | 'wood' | 'office' | 'dark';

const FlipbookViewer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [activeTheme, setActiveTheme] = useState<Theme>('studio');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    if (file) loadPdf();
  }, [file]);

  const loadPdf = async () => {
    if (!file) return;
    setIsLoading(true);
    setPages([]);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const pageImages: string[] = [];
      const firstPage = await pdf.getPage(1);
      const firstViewport = firstPage.getViewport({ scale: 1 });
      setIsLandscape(firstViewport.width > firstViewport.height);
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Restore 'canvas' property to satisfy the RenderParameters type which requires it in this context
        await page.render({ 
          canvasContext: context, 
          viewport,
          canvas: canvas
        }).promise;
        pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
      }
      setPages(pageImages);
      setCurrentPage(0);
    } catch (error) {
      alert('載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const goToNext = () => {
    if (currentPage < pages.length - 1 && !isLoading && !flipDirection) {
      setFlipDirection('next');
      setTimeout(() => {
        setCurrentPage(prev => Math.min(prev + (prev === 0 ? 1 : 2), pages.length - 1));
        setFlipDirection(null);
      }, 500); 
    }
  };

  const goToPrev = () => {
    if (currentPage > 0 && !isLoading && !flipDirection) {
      setFlipDirection('prev');
      setTimeout(() => {
        setCurrentPage(prev => Math.max(prev - (prev <= 2 ? 1 : 2), 0));
        setFlipDirection(null);
      }, 500);
    }
  };

  const renderSpread = () => {
    if (pages.length === 0) return null;
    const pageAspect = isLandscape ? 'aspect-[1.41/1]' : 'aspect-[1/1.41]';
    const spreadAspect = isLandscape ? 'aspect-[2.82/1]' : 'aspect-[1.41/1]';
    const singleMaxWidth = isLandscape ? 'max-w-[750px]' : 'max-w-[480px]';
    const spreadMaxWidth = isLandscape ? 'max-w-[1300px]' : 'max-w-[1100px]';
    const shadowClass = 'shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]';

    if (currentPage === 0) {
      return (
        <div className={`flex justify-center items-center w-full h-full perspective-2000 ${flipDirection === 'next' ? 'animate-flip-left' : 'animate-in fade-in zoom-in-95 duration-700'}`}>
          <div className={`w-[85%] ${singleMaxWidth} ${pageAspect} bg-white relative overflow-hidden border ${shadowClass}`}>
            <img src={pages[0]} className="w-full h-full object-contain" alt="封面" />
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/20 via-black/5 to-transparent z-10"></div>
          </div>
        </div>
      );
    }

    if (currentPage === pages.length - 1) {
       return (
        <div className={`flex justify-center items-center w-full h-full perspective-2000 ${flipDirection === 'prev' ? 'animate-flip-right' : 'animate-in fade-in zoom-in-95 duration-700'}`}>
          <div className={`w-[85%] ${singleMaxWidth} ${pageAspect} bg-white relative overflow-hidden border shadow-[-10px_40px_80px_-10px_rgba(0,0,0,0.5)]`}>
            <img src={pages[currentPage]} className="w-full h-full object-contain" alt="封底" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/20 via-black/5 to-transparent z-10"></div>
          </div>
        </div>
      );
    }

    const leftPageIdx = currentPage;
    const rightPageIdx = currentPage + 1;

    return (
      <div className={`flex justify-center items-center w-full h-full perspective-3000 transition-all duration-700 ${flipDirection ? 'opacity-40 blur-[2px] scale-95' : 'animate-in fade-in duration-700'}`}>
        <div className={`flex w-full ${spreadMaxWidth} h-auto ${spreadAspect} overflow-hidden relative ${shadowClass} border border-white/10`}>
          <div className="w-1/2 bg-white relative border-r border-slate-100 flex items-center justify-center overflow-hidden">
            {pages[leftPageIdx] && <img src={pages[leftPageIdx]} className="w-full h-full object-contain" />}
            <div className="absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-black/15 via-black/5 to-transparent z-10"></div>
          </div>
          <div className="w-1/2 bg-white relative flex items-center justify-center overflow-hidden">
            {pages[rightPageIdx] && <img src={pages[rightPageIdx]} className="w-full h-full object-contain" />}
            <div className="absolute inset-y-0 left-0 w-56 bg-gradient-to-r from-black/15 via-black/5 to-transparent z-10"></div>
          </div>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-black/5 z-30"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-4 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all text-sm font-black active:scale-95 shadow-sm border border-orange-100 italic uppercase tracking-tighter">
            <Layout className="w-5 h-5" /> 上傳 PDF
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
          <div className="h-10 w-px bg-slate-100 mx-2"></div>
          
          <div className="flex bg-slate-100 p-2 rounded-[1.5rem] gap-1.5 shadow-inner">
             {(['studio', 'wood', 'office', 'dark'] as Theme[]).map(t => (
               <button 
                key={t} 
                onClick={() => setActiveTheme(t)} 
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${activeTheme === t ? 'bg-white shadow-lg text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
                title={`主題: ${t}`}
               ><Palette className="w-6 h-6" /></button>
             ))}
          </div>
        </div>

        {pages.length > 0 && (
          <div className="flex items-center gap-6">
             <button onClick={() => setShowShareModal(true)} className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all text-sm font-black active:scale-95 shadow-2xl shadow-slate-200 italic uppercase tracking-widest"><Share2 className="w-5 h-5 text-orange-500" /> 分享電子書</button>
             <div className="flex items-center bg-slate-900 rounded-full p-2 shadow-2xl border border-white/5">
              <button onClick={goToPrev} disabled={currentPage === 0 || isLoading} className="p-4 hover:bg-white/10 rounded-full disabled:opacity-20 text-white transition-all"><ChevronLeft className="w-7 h-7" /></button>
              <div className="px-10 text-xs font-black text-white min-w-[150px] text-center flex flex-col">
                <span className="text-[9px] text-orange-500 uppercase tracking-widest opacity-60 mb-0.5 italic">Flip Navigation</span>
                {currentPage === 0 ? '封面 (Page 1)' : (currentPage === pages.length - 1 ? `封底 (Page ${pages.length})` : `第 ${currentPage + 1} - ${Math.min(currentPage + 2, pages.length)} 頁`)}
              </div>
              <button onClick={goToNext} disabled={currentPage >= pages.length - 1 || isLoading} className="p-4 hover:bg-white/10 rounded-full disabled:opacity-20 text-white transition-all"><ChevronRight className="w-7 h-7" /></button>
            </div>
          </div>
        )}
      </div>

      <div ref={containerRef} className={`flex-1 rounded-[4.5rem] border-8 border-white flex items-center justify-center overflow-hidden min-h-[800px] relative group shadow-2xl transition-all duration-1000 ${
        activeTheme === 'wood' ? 'bg-[#3d2b1f] bg-[url("https://www.transparenttextures.com/patterns/dark-wood.png")]' : 
        activeTheme === 'office' ? 'bg-slate-200 bg-[url("https://www.transparenttextures.com/patterns/pinstriped-suit.png")]' :
        activeTheme === 'dark' ? 'bg-[#0a0a0b]' : 'bg-gradient-to-b from-slate-50 to-slate-200 shadow-inner'
      }`}>
        <style>{`
          .perspective-2000 { perspective: 2000px; }
          .perspective-3000 { perspective: 3000px; }
          @keyframes flip-left {
            0% { transform: rotateY(0deg) translateX(0); filter: brightness(1); }
            100% { transform: rotateY(-140deg) translateX(-200px) rotateX(2deg); filter: brightness(0.1); opacity: 0; }
          }
          @keyframes flip-right {
            0% { transform: rotateY(0deg) translateX(0); filter: brightness(1); }
            100% { transform: rotateY(140deg) translateX(200px) rotateX(-2deg); filter: brightness(0.1); opacity: 0; }
          }
          .animate-flip-left { animation: flip-left 0.8s cubic-bezier(0.645, 0.045, 0.355, 1) forwards; }
          .animate-flip-right { animation: flip-right 0.8s cubic-bezier(0.645, 0.045, 0.355, 1) forwards; }
        `}</style>
        {!file ? (
          <div className="text-center p-20 animate-in fade-in duration-1000">
            <div className="w-40 h-40 bg-white rounded-[3.5rem] flex items-center justify-center mx-auto mb-14 shadow-2xl border-4 border-orange-50 rotate-6"><BookOpen className="w-24 h-24 text-orange-500" /></div>
            <h2 className={`text-6xl font-black mb-8 tracking-tighter italic uppercase ${activeTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>3D 電子翻頁書預覽</h2>
            <p className={`max-w-md mx-auto mb-16 text-xl font-medium leading-relaxed italic ${activeTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>上傳 PDF 以查看具備擬真翻頁效果的數位樣品。支援多種商務環場主題。</p>
            <button onClick={() => fileInputRef.current?.click()} className="px-24 py-8 bg-orange-500 text-white rounded-[2rem] font-black hover:shadow-2xl hover:scale-105 transition-all active:scale-95 text-3xl uppercase tracking-tighter italic shadow-xl shadow-orange-500/20">上傳開始預覽</button>
          </div>
        ) : isLoading ? (
          <div className="text-center bg-white/95 backdrop-blur-3xl p-24 rounded-[4rem] shadow-2xl border-4 border-white">
            <Loader2 className="w-28 h-28 text-orange-500 animate-spin mx-auto mb-12" />
            <p className="text-slate-900 font-black text-5xl italic tracking-tighter uppercase mb-2">生成中...</p>
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase italic">Preparing 4K Immersive Spreads</p>
          </div>
        ) : (
          <div className="w-full h-full relative p-24 select-none flex items-center justify-center">
            <div 
              onClick={goToPrev} 
              className="absolute left-0 inset-y-0 w-1/2 z-40 cursor-w-resize opacity-0 hover:opacity-5 transition-opacity bg-white" 
              title="上一頁"
            />
            <div 
              onClick={goToNext} 
              className="absolute right-0 inset-y-0 w-1/2 z-40 cursor-e-resize opacity-0 hover:opacity-5 transition-opacity bg-white" 
              title="下一頁"
            />
            
            <div className="relative z-0 flex items-center justify-center w-full h-full">
              {renderSpread()}
            </div>

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md text-white/70 text-[10px] font-black uppercase px-8 py-3 rounded-full tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all shadow-2xl border border-white/10 z-50 pointer-events-none">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               點擊畫面左右側可翻頁 · 主題：{activeTheme.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-2xl" onClick={() => setShowShareModal(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl p-16 overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 bg-orange-50 rounded-[3rem] flex items-center justify-center mb-10 border shadow-inner"><Share2 className="w-16 h-16 text-orange-500" /></div>
              <h3 className="text-4xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">分享您的數位樣品</h3>
              <p className="text-slate-400 font-bold mb-14 text-sm italic tracking-widest leading-relaxed">此連結將包含目前的主題與預覽設定。</p>
              <div className="w-full space-y-6">
                <div className="flex items-center gap-5 p-7 bg-slate-50 border border-slate-200 rounded-3xl w-full group">
                  <span className="text-xs font-mono text-slate-400 truncate flex-1 text-left opacity-60">{window.location.href}</span>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('連結已複製'); }} className="p-4 bg-white shadow-xl rounded-2xl hover:bg-orange-500 hover:text-white text-orange-500 transition-all active:scale-90"><Copy className="w-6 h-6" /></button>
                </div>
                <button onClick={() => setShowShareModal(false)} className="w-full py-8 bg-orange-500 text-white rounded-[2rem] font-black shadow-2xl shadow-orange-500/30 active:scale-95 text-2xl uppercase italic tracking-tighter hover:bg-orange-600 transition-all">完成</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlipbookViewer;
