import React, { useEffect, useRef, useState } from 'react';

export default function PhonePreviewShell({ children, className = '' }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const outerW = 410;
  const outerH = 864;
  const scale = size.w && size.h ? Math.min(1, size.w / outerW, size.h / outerH) : 1;

  useEffect(() => {
    if (!ref.current) return undefined;
    const medir = () => {
      const rect = ref.current.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    if (ro) ro.observe(ref.current);
    window.addEventListener('resize', medir);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  return (
    <div ref={ref} className={`w-full h-full min-h-0 flex items-center justify-center overflow-hidden ${className}`}>
      <div
        className="relative shrink-0"
        style={{ width: outerW * scale, height: outerH * scale }}
      >
        <div
          className="relative h-[864px] w-[410px] rounded-[48px] bg-[#070a10] p-[10px] shadow-[0_28px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.10)]"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <span aria-hidden="true" className="absolute -left-[3px] top-[118px] h-12 w-[3px] rounded-l bg-slate-500/45" />
          <span aria-hidden="true" className="absolute -left-[3px] top-[178px] h-16 w-[3px] rounded-l bg-slate-500/45" />
          <span aria-hidden="true" className="absolute -right-[3px] top-[154px] h-20 w-[3px] rounded-r bg-slate-500/45" />
          <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-white ring-1 ring-white/10">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[10px] z-20 h-[30px] w-[112px] -translate-x-1/2 rounded-full bg-[#070a10] shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_18px_rgba(0,0,0,0.22)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 bottom-[12px] z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-black/30"
            />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
