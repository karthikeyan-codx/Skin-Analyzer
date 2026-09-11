import React from 'react';
import { Clock, Trash2, Download, ExternalLink, CheckCircle2, ChevronRight } from 'lucide-react';

export default function HistoryTable({ history, onClear, onSelect }) {
  if (!history || history.length === 0) {
    return null;
  }

  // Export history as CSV for laboratory or ANALYZER presentation
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Time', 'Image Name', 'Disease', 'Class Code', 'Confidence %'];
    const rows = history.map((item) => [
      item.id,
      item.date || new Date(item.id).toLocaleDateString(),
      item.time || item.timestamp,
      `"${item.filename.replace(/"/g, '""')}"`,
      `"${item.disease.replace(/"/g, '""')}"`,
      item.classCode,
      item.confidence.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skin_classification_session_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getConfidenceBadge = (confidence) => {
    const val = Number(confidence) || 0;
    if (val >= 95) return 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30';
    if (val >= 75) return 'bg-blue-950/50 text-blue-300 border-blue-500/30';
    if (val >= 50) return 'bg-amber-950/50 text-amber-300 border-amber-500/30';
    return 'bg-rose-950/50 text-rose-300 border-rose-500/30';
  };

  return (
    <div className="w-full fluent-card p-6 sm:p-8 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Recent Classification History
            </h3>
            <p className="text-xs text-slate-400">
              Session query records saved locally ({history.length} {history.length === 1 ? 'record' : 'records'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-[var(--border-subtle)] text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Export session records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/50 border border-[var(--border-subtle)] hover:border-rose-500/30 text-xs text-slate-300 hover:text-rose-300 transition-all cursor-pointer"
            title="Clear all session history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Scrollable Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-slate-950/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-slate-900/60 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Image Name</th>
              <th className="py-3 px-4">Predicted Condition</th>
              <th className="py-3 px-4">Class</th>
              <th className="py-3 px-4 text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-slate-300">
            {history.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-900/40 transition-colors group cursor-default"
              >
                {/* Date */}
                <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                  {item.date || new Date(item.id).toLocaleDateString()}
                </td>

                {/* Time */}
                <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                  {item.time || item.timestamp}
                </td>

                {/* Image Name */}
                <td className="py-3 px-4 font-medium text-white max-w-[200px] truncate">
                  {item.filename}
                </td>

                {/* Disease */}
                <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                  {item.disease}
                </td>

                {/* Class */}
                <td className="py-3 px-4 font-mono text-blue-400 uppercase">
                  {item.classCode}
                </td>

                {/* Confidence */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getConfidenceBadge(
                      item.confidence
                    )}`}
                  >
                    {item.confidence.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
