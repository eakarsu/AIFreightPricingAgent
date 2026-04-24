export default function AIResponseCard({ content, title = 'AI Analysis', onRegenerate }) {
  if (!content) return null;

  const renderContent = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers with **bold**
      if (line.match(/^\*\*[^*]+\*\*:?\s*$/)) {
        const headerText = line.replace(/\*\*/g, '').replace(/:$/, '');
        return <h3 key={i} className="text-base font-semibold text-slate-800 mt-4 mb-2 first:mt-0">{headerText}</h3>;
      }
      // Bold inline **text**
      if (line.includes('**')) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-sm text-slate-700 mb-1">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
                : <span key={j}>{part}</span>
            )}
          </p>
        );
      }
      // Numbered list
      if (line.match(/^\d+\.\s/)) {
        return (
          <div key={i} className="flex gap-2 ml-2 mb-1">
            <span className="text-indigo-500 font-semibold text-sm flex-shrink-0">{line.match(/^\d+/)[0]}.</span>
            <p className="text-sm text-slate-700">{line.replace(/^\d+\.\s/, '')}</p>
          </div>
        );
      }
      // Bullet list
      if (line.match(/^[-•]\s/)) {
        const text = line.replace(/^[-•]\s/, '');
        // Highlight dollar amounts and percentages
        const highlighted = text.replace(/(\$[\d,]+(?:\.\d{2})?)/g, '<money>$1</money>')
          .replace(/([\+\-]?\d+(?:\.\d+)?%)/g, '<pct>$1</pct>');
        return (
          <div key={i} className="flex gap-2 ml-4 mb-1">
            <span className="text-indigo-400 mt-1.5 flex-shrink-0">
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
            </span>
            <p className="text-sm text-slate-700" dangerouslySetInnerHTML={{
              __html: highlighted
                .replace(/<money>([^<]+)<\/money>/g, '<span class="bg-emerald-100 text-emerald-800 px-1 rounded font-medium">$1</span>')
                .replace(/<pct>([^<]+)<\/pct>/g, (_, val) => {
                  const isNeg = val.startsWith('-');
                  const cls = isNeg ? 'text-red-600' : 'text-emerald-600';
                  const arrow = isNeg ? '↓' : '↑';
                  return `<span class="${cls} font-medium">${arrow} ${val}</span>`;
                })
            }} />
          </div>
        );
      }
      // Empty line
      if (!line.trim()) return <div key={i} className="h-2" />;
      // Regular paragraph
      return <p key={i} className="text-sm text-slate-700 mb-1">{line}</p>;
    });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl border border-indigo-200 overflow-hidden">
      <div className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-white font-semibold text-sm">{title}</span>
          <span className="bg-white/20 text-white/90 text-xs px-2 py-0.5 rounded-full">AI-Generated</span>
        </div>
        {onRegenerate && (
          <button onClick={onRegenerate} className="text-white/80 hover:text-white text-xs flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
        )}
      </div>
      <div className="p-5">
        {renderContent(content)}
      </div>
    </div>
  );
}
