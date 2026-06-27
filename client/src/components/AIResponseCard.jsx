import ReactMarkdown from 'react-markdown';

function titleize(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isEmpty(value) {
  return value === null || value === undefined || value === '';
}

function getDisplayPayload(input) {
  const value = input?.response ?? input?.content ?? input;
  if (!value || typeof value === 'string') return value;
  return value.analysis || value.ai_analysis || value.assessment || value.parsed || value.result || value.output || value.summary || value;
}

function Metric({ label, value }) {
  if (isEmpty(value) || typeof value === 'object') return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titleize(label)}</div>
      <div className="mt-1 break-words text-lg font-semibold text-slate-900">{String(value)}</div>
    </div>
  );
}

function ValueView({ value }) {
  if (isEmpty(value)) return <span className="text-slate-400">Not provided</span>;
  if (typeof value === 'string') return <ReactMarkdown>{value}</ReactMarkdown>;
  if (typeof value === 'number' || typeof value === 'boolean') return <span>{String(value)}</span>;

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-3">
            {typeof item === 'object' && item !== null ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(item).map(([key, itemValue]) => (
                  <div key={key}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titleize(key)}</div>
                    <div className="mt-1 text-sm text-slate-700">
                      <ValueView value={itemValue} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-700">{String(item)}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(value).map(([key, itemValue]) => (
        <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titleize(key)}</div>
          <div className="mt-1 text-sm text-slate-700">
            <ValueView value={itemValue} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIResponseCard({ content, response, title = 'AI Analysis', onRegenerate }) {
  const payload = getDisplayPayload({ content, response });
  if (!payload) return null;

  // External data feeds (DOE/EIA, FMCSA, DAT, etc.) carry provider/source — they are
  // live API pulls, not LLM output, so label them accurately.
  const isExternalFeed = payload && typeof payload === 'object' && (payload.provider || payload.source);
  const subtitle = isExternalFeed
    ? `Live external feed${payload.provider ? ` · ${payload.provider}` : ''}`
    : 'AI-generated recommendation';

  const error = payload?.error || response?.error;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <div className="font-semibold">{error}</div>
        {(payload?.hint || response?.hint) && <div className="mt-2 text-red-700">{payload?.hint || response?.hint}</div>}
      </div>
    );
  }

  if (typeof payload === 'string') {
    return (
      <div className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-indigo-600 px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-indigo-100">{subtitle}</div>
          </div>
          {onRegenerate && (
            <button type="button" onClick={onRegenerate} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20">
              Regenerate
            </button>
          )}
        </div>
        <div className="prose prose-slate max-w-none p-5 text-sm">
          <ReactMarkdown>{payload}</ReactMarkdown>
        </div>
      </div>
    );
  }

  const primitiveEntries = Object.entries(payload).filter(([, value]) => typeof value !== 'object' || value === null);
  const sectionEntries = Object.entries(payload).filter(([, value]) => typeof value === 'object' && value !== null);

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-white shadow-sm">
      <div className="flex items-center justify-between bg-indigo-600 px-5 py-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-indigo-100">{subtitle}</div>
        </div>
        {onRegenerate && (
          <button type="button" onClick={onRegenerate} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20">
            Regenerate
          </button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {primitiveEntries.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            {primitiveEntries.map(([key, value]) => <Metric key={key} label={key} value={value} />)}
          </div>
        )}

        {sectionEntries.map(([key, value]) => (
          <section key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">{titleize(key)}</h3>
            <div className="text-sm text-slate-700">
              <ValueView value={value} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
