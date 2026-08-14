import React from 'react';
import { Building2, Heart, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onOpenAdminLogin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  return (
    <footer id="main-footer" className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">AccessTwin</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Crowdsourced Accessibility Digital Twin platform for public buildings, higher education campuses, and health institutions.
            </p>
            <p className="text-slate-500 text-[11px]">
              Built for SOAIDEATHON S37 problem statement.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Core Features</h4>
            <ul className="space-y-2 text-slate-300">
              <li className="hover:text-blue-400 transition-colors cursor-pointer">Interactive SVG Floor Plan Twin</li>
              <li className="hover:text-blue-400 transition-colors cursor-pointer">Weighted A* / Dijkstra Navigation</li>
              <li className="hover:text-blue-400 transition-colors cursor-pointer">YOLOv8 / Gemini AI Vision Detection</li>
              <li className="hover:text-blue-400 transition-colors cursor-pointer">Crowdsourced Barrier Reporting</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Demo Campus & Admin</h4>
            <ul className="space-y-2 text-slate-300">
              <li>Siksha &quot;O&quot; Anusandhan (SOA) University</li>
              <li>ITER Academic Engineering Block C</li>
              <li>SUM Hospital & Medical Research Centre</li>
              {onOpenAdminLogin && (
                <li 
                  onClick={onOpenAdminLogin}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer pt-1 flex items-center space-x-1"
                >
                  <span>Facility Manager Admin Portal →</span>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Accessibility Guarantee</h4>
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>WCAG 2.1 AA Standards</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                High-contrast color modes, screen reader compatible labels, keyboard navigable controls, and accessible route routing.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-3">
          <p>© 2026 AccessTwin Platform. SOAIDEATHON S37 Edition. All rights reserved.</p>
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Designed with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Universal Campus Accessibility</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
