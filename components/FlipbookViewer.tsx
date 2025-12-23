import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, ChevronLeft, ChevronRight, BookOpen, Share2, Copy, Loader2, Palette, Layout } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

type Theme = 'studio' | 'wood' | 'office' | 'dark';

const FlipbookViewer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [activeTheme, setActiveTheme] = useState<Theme>('studio');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        // Fix: Added required 'canvas' property to RenderParameters in pdfjs-dist v4
        await page.render({ 
          canvasContext: context, 
          viewport: viewport,
          canvas: canvas
        }).promise;
        pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
      }
      setPages(pageImages);
      setCurrentPage(0);
    } catch (error) {
      console.error("Flipbook Load Error:", error);
      alert('電子書載入失敗');
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
    const singleMaxWidth = isLandscape ? 'max-w-[750px]' : 'max-w-[480px]';
    const shadowClass = 'shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]';

    if (currentPage === 0) {
      return (
        <div className={`flex justify-center items-center w-full h-full perspective-2000 ${flipDirection === 'next' ? 'animate-flip-left' : 'animate-in fade-in zoom-in-95 duration-700'}`}>
          <div className={`w-[85%] ${singleMaxWidth} ${pageAspect} bg-white relative overflow-hidden border ${shadowClass}`}>
            <img src={pages[0]} className="w-full h-full object-contain" alt="封面" />
          </div>
        </div>
      );
    }

    if (currentPage === pages.length - 1) {
       return (
        <div className={`flex justify-center items-center w-full h-full perspective-2000 ${flipDirection === 'prev' ? 'animate-flip-right' : 'animate-in fade-in zoom-in-95 duration-700'}`}>
          <div className={`w-[85%] ${singleMaxWidth} ${pageAspect} bg-white relative overflow-hidden border shadow-[-10px_40px_80px_-10px_rgba(0,0,0,0.5)]`}>
            <img src={pages[currentPage]} className="w-full h-full object-contain" alt="封底" />
          </div>
        </div>
      );
    }

    const leftPageIdx = currentPage;
    const rightPageIdx = currentPage + 1;

    return (
      <div className={`flex justify-center items-center w-full h-full perspective-3000 transition-all duration-700 ${flipDirection ? 'opacity-40 blur-[2px] scale-95' : 'animate-in fade-in duration-700'}`}>
        <div className={`flex w-full max-w-[1200px] h-auto overflow-hidden relative ${shadowClass}`}>
          <div className="w-1/2 bg-white relative border-r border-slate-100 flex items-center justify-center overflow-hidden">
            {pages[leftPageIdx] && <img src={pages[leftPageIdx]} className="w-full h-full object-contain" />}
          </div>
          <div className="w-1/2 bg-white relative flex items-center justify-center overflow-hidden">
            {pages[rightPageIdx] && <img src={pages[rightPageIdx]} className="w-full h-full object-contain" />}
          </div>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-black/5 z-30"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-4 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all text-sm font-black italic uppercase tracking-tighter">
          <Layout className="w-5 h-5" /> 上傳 PDF
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />

        {pages.length > 0 && (
          <div className="flex items-center bg-slate-900 rounded-full p-2 shadow-2xl">
            <button onClick={goToPrev} disabled={currentPage === 0 || isLoading} className="p-4 hover:bg-white/10 rounded-full disabled:opacity-20 text-white"><ChevronLeft className="w-7 h-7" /></button>
            <div className="px-10 text-xs font-black text-white min-w-[150px] text-center">
              {currentPage === 0 ? '封面' : (currentPage === pages.length - 1 ? '封底' : `第 ${currentPage + 1}-${currentPage + 2} 頁`)}
            </div>
            <button onClick={goToNext} disabled={currentPage >= pages.length - 1 || isLoading} className="p-4 hover:bg-white/10 rounded-full disabled:opacity-20 text-white"><ChevronRight className="w-7 h-7" /></button>
          </div>
        )}
      </div>

      <div className={`flex-1 rounded-[4.5rem] border-8 border-white flex items-center justify-center overflow-hidden min-h-[700px] relative group shadow-2xl transition-all duration-1000 ${
        activeTheme === 'dark' ? 'bg-[#0a0a0b]' : 'bg-gradient-to-b from-slate-50 to-slate-200'
      }`}>
        <style>{`
          .perspective-2000 { perspective: 2000px; }
          .perspective-3000 { perspective: 3000px; }
          @keyframes flip-left {
            0% { transform: rotateY(0deg); opacity: 1; }
            100% { transform: rotateY(-140deg); opacity: 0; }
          }
          @keyframes flip-right {
            0% { transform: rotateY(0deg); opacity: 1; }
            100% { transform: rotateY(140deg); opacity: 0; }
          }
          .animate-flip-left { animation: flip-left 0.8s ease-in-out forwards; }
          .animate-flip-right { animation: flip-right 0.8s ease-in-out forwards; }
        `}</style>
        {!file ? (
          <div className="text-center p-20">
            <BookOpen className="w-24 h-24 text-orange-500 mx-auto mb-8" />
            <h2 className="text-4xl font-black mb-4">3D 電子翻頁書預覽</h2>
            <button onClick={() => fileInputRef.current?.click()} className="px-12 py-5 bg-orange-500 text-white rounded-2xl font-black shadow-xl">上傳開始預覽</button>
          </div>
        ) : isLoading ? (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="font-black">正在生成擬真樣品...</p>
          </div>
        ) : (
          <div className="w-full h-full relative p-20 select-none">
            {renderSpread()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlipbookViewer;