import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getPortalQuote } from '../api/client';

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '-';
  return `${Number(value).toLocaleString()}${suffix}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function PortalQuote() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadQuote() {
      try {
        setLoading(true);
        const { data } = await getPortalQuote(token);
        if (mounted) {
          setQuote(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.error || 'Unable to load this quote.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQuote();
    return () => { mounted = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm">Loading quote...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-8 text-red-700 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <main className="mx-auto max-w-5xl">
        <section className="rounded-xl bg-slate-950 p-8 text-white shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wide text-indigo-200">Freight Quote</div>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{quote.quote_number}</h1>
              <p className="mt-2 text-slate-300">
                {quote.origin} to {quote.destination}
              </p>
            </div>
            <div className="rounded-lg bg-white px-5 py-4 text-right text-slate-950">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final Rate</div>
              <div className="mt-1 text-3xl font-bold">{formatCurrency(quote.final_rate)}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <DetailCard label="Mode" value={quote.mode ? quote.mode.charAt(0).toUpperCase() + quote.mode.slice(1) : '-'} />
          <DetailCard label="Weight" value={formatNumber(quote.weight_kg, ' kg')} />
          <DetailCard label="Volume" value={formatNumber(quote.volume_cbm, ' CBM')} />
          <DetailCard label="Valid Until" value={formatDate(quote.valid_until)} />
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Pricing Explanation</h2>
            {quote.ai_suggested_rate && (
              <div className="text-sm text-slate-600">
                AI suggested rate: <span className="font-semibold text-slate-900">{formatCurrency(quote.ai_suggested_rate)}</span>
              </div>
            )}
          </div>

          <div className="prose prose-slate max-w-none">
            {quote.ai_justification ? (
              <ReactMarkdown>{quote.ai_justification}</ReactMarkdown>
            ) : (
              <p>This quote is based on the lane, mode, cargo profile, and current freight market conditions.</p>
            )}
          </div>
        </section>

        <p className="mt-4 text-center text-xs text-slate-500">
          Shared {formatDate(quote.shared_at)}
        </p>
      </main>
    </div>
  );
}
