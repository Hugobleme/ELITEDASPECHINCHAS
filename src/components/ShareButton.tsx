'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Share2, Check, MessageCircle, Send, Copy, X } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  className?: string;
}

export default function ShareButton({ title, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUrl = () => (typeof window !== 'undefined' ? window.location.href : '');

  const handleCopyLink = async () => {
    const url = getUrl();
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    }
  };

  const handleWhatsApp = () => {
    const url = getUrl();
    const message = `🔥 *Olha essa pechincha que achei na Elite das Pechinchas!* \n\n${title}\n\n👉 Confira aqui: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    setIsOpen(false);
  };

  const handleTelegram = () => {
    const url = getUrl();
    const message = `🔥 Olha essa pechincha na Elite das Pechinchas: ${title}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`, '_blank');
    setIsOpen(false);
  };

  const handleNativeShare = async () => {
    const url = getUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `🔥 Pechincha imperdível: ${title}`,
          url,
        });
        return;
      } catch {
        // Ignora cancelamento
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={handleNativeShare}
        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
        title="Compartilhar no WhatsApp, Telegram ou copiar link"
      >
        <Share2 className="h-4 w-4 text-orange-500" />
        <span>Compartilhar</span>
      </button>

      {/* Modal/Dropdown de Compartilhamento */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 z-50 w-56 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-2.5 shadow-card animate-in fade-in slide-in-from-bottom-2 duration-150 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Compartilhar em</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-1.5 space-y-1">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors text-left"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
              <span>WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              type="button"
              onClick={handleTelegram}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40 transition-colors text-left"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm">
                <Send className="h-3.5 w-3.5" />
              </div>
              <span>Telegram</span>
            </button>

            {/* Copiar Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </div>
              <span>{copied ? 'Link Copiado! ✓' : 'Copiar Link'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
