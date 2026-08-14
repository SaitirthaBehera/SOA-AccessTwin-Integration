import React, { useEffect, useState } from 'react';
import { Recommendation } from '../types';
import { api } from '../services/api';
import { Sparkles, AlertTriangle, CheckCircle2, Clock, IndianRupee, TrendingUp, ShieldCheck } from 'lucide-react';

export const SmartRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    const fetchRecs = async () => {
      setLoading(true);
      try {
        const data = await api.getRecommendations();
        setRecommendations(data);
      } catch (err) {
        console.warn('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  const filtered = recommendations.filter(r => {
    if (filterPriority === 'all') return true;
    return r.priority === filterPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'High': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Medium': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'In Progress': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div id="section-smart-recommendations" className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Fix Suggestions</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Smart Recommendations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gemini AI evaluates each barrier and generates actionable fix cards with ₹ repair cost estimates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
          >
            <option value="all">All Priorities ({recommendations.length})</option>
            <option value="Critical">🔴 Critical</option>
            <option value="High">🟠 High</option>
            <option value="Medium">🔵 Medium</option>
            <option value="Low">⚪ Low</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-500 font-semibold">Fetching AI recommendations from backend...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-500">No recommendations found.</p>
          <p className="text-xs text-slate-400 mt-1">Submit reports in the "Report Issue" tab to generate AI fix suggestions.</p>
        </div>
      )}

      {/* Recommendation Cards Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-5 pb-3 space-y-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug flex-1">
                    {rec.title}
                  </h3>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${getPriorityColor(rec.priority)}`}>
                    {rec.priority}
                  </span>
                </div>

                {/* Building & Location */}
                <p className="text-[11px] text-slate-500 font-semibold">
                  📍 {rec.buildingName} — {rec.locationName}
                </p>

                {/* Problem */}
                <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Problem</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{rec.problem}</p>
                </div>

                {/* Solution */}
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Recommended Fix</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{rec.solution}</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <IndianRupee className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Cost</p>
                    <p className="text-xs font-extrabold text-slate-900">{rec.estimatedCostAmount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <TrendingUp className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Impact</p>
                    <p className="text-xs font-extrabold text-slate-900">{rec.impactScore}/100</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <span className="text-base">👥</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Users</p>
                    <p className="text-xs font-extrabold text-slate-900">{rec.estimatedUsersAffected}</p>
                  </div>
                </div>

                {/* Disability Types */}
                <div className="flex flex-wrap gap-1.5">
                  {(rec.disabilityTypesAffected || []).map(d => (
                    <span key={d} className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                      {d === 'wheelchair' ? '♿ Wheelchair' : d === 'visual' ? '👁️ Visual' : d === 'elderly' ? '🧓 Elderly' : d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${getStatusColor(rec.status)}`}>
                  {getStatusIcon(rec.status)}
                  <span>{rec.status}</span>
                </span>

                {rec.ai_verified && (
                  <span className="inline-flex items-center space-x-1 text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>AI Verified</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};