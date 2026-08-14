import React from 'react';
import { Building, BuildingFloor, BuildingRoom, AccessibilityFeature } from '../types';
import { MapPin, Layers, Building as BuildingIcon, CheckCircle2, AlertTriangle, Sparkles, Navigation } from 'lucide-react';

interface FloorMapProps {
  building: Building;
  floor: BuildingFloor;
  selectedLocation?: { x: number; y: number } | null;
  selectedRoomId?: string | null;
  selectedRoomName?: string | null;
  onSelectLocation?: (location: { x: number; y: number }, room: BuildingRoom | null) => void;
  features?: AccessibilityFeature[];
  isPickerMode?: boolean;
  className?: string;
  unmappedError?: string | null;
}

export const FloorMap: React.FC<FloorMapProps> = ({
  building,
  floor,
  selectedLocation,
  selectedRoomId,
  selectedRoomName,
  onSelectLocation,
  features = [],
  isPickerMode = true,
  className = '',
  unmappedError
}) => {
  if (!floor) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
        <p className="text-xs text-slate-400">No floor map available for selected options.</p>
      </div>
    );
  }

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSelectLocation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.min(98, Math.max(2, Math.round(rawX)));
    const y = Math.min(98, Math.max(2, Math.round(rawY)));

    // Find if click falls inside any room bounding box
    const foundRoom = floor.rooms.find(
      r => x >= r.x && x <= (r.x + r.width) && y >= r.y && y <= (r.y + r.height)
    ) || null;

    onSelectLocation({ x, y }, foundRoom);
  };

  const getCategoryColor = (category: string, isAccessible: boolean) => {
    if (!isAccessible) return { fill: '#311b1b', stroke: '#ef4444', text: '#f87171' };
    switch (category) {
      case 'entrance': return { fill: '#064e3b', stroke: '#10b981', text: '#34d399' };
      case 'lab': return { fill: '#1e293b', stroke: '#3b82f6', text: '#60a5fa' };
      case 'office': return { fill: '#1e1b4b', stroke: '#6366f1', text: '#a5b4fc' };
      case 'toilet': return { fill: '#142834', stroke: '#06b6d4', text: '#22d3ee' };
      case 'elevator_bay': return { fill: '#312e81', stroke: '#818cf8', text: '#c7d2fe' };
      case 'library': return { fill: '#3f2c18', stroke: '#f59e0b', text: '#fbbf24' };
      case 'auditorium': return { fill: '#2e1065', stroke: '#a855f7', text: '#c084fc' };
      default: return { fill: '#1e293b', stroke: '#475569', text: '#94a3b8' };
    }
  };

  return (
    <div className={`flex flex-col bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden ${className}`}>
      {/* Map Header Bar */}
      <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2 z-10 text-xs">
        <div className="flex items-center space-x-2">
          <BuildingIcon className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-bold text-white truncate max-w-[240px] sm:max-w-none">{building.name}</span>
          <span className="text-slate-500">•</span>
          <span className="font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60 flex items-center space-x-1">
            <Layers className="w-3 h-3" />
            <span>{floor.name}</span>
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
          Map Code: <span className="text-blue-300 font-bold">{building.code}-{floor.floorId}</span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="flex-1 bg-slate-950 p-2 sm:p-4 relative overflow-hidden flex items-center justify-center min-h-[340px] select-none">
        <svg
          viewBox="0 0 1000 600"
          className={`w-full h-full ${onSelectLocation ? 'cursor-crosshair' : ''}`}
          onClick={handleSvgClick}
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id={`grid-${building.id}-${floor.floorId}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="600" fill={`url(#grid-${building.id}-${floor.floorId})`} />

          {/* Optional Floorplan Image Layer */}
          {floor.mapImageUrl && (
            <image
              href={floor.mapImageUrl}
              width="1000"
              height="600"
              preserveAspectRatio="xMidYMid slice"
              opacity="0.3"
            />
          )}

          {/* Outer Building Perimeter */}
          <rect x="20" y="20" width="960" height="560" rx="14" fill="none" stroke="#334155" strokeWidth="6" />

          {/* Central Connecting Corridor */}
          <rect x="50" y="270" width="900" height="60" fill="#0f172a" stroke="#1e293b" strokeWidth="2" rx="4" />
          <text x="500" y="305" fill="#475569" fontSize="12" fontWeight="bold" textAnchor="middle" letterSpacing="2">
            MAIN ACCESSIBLE CORRIDOR ({building.code} - {floor.name.toUpperCase()})
          </text>

          {/* Render Floor Rooms */}
          {floor.rooms.map((room) => {
            const rx = (room.x / 100) * 1000;
            const ry = (room.y / 100) * 600;
            const rw = (room.width / 100) * 1000;
            const rh = (room.height / 100) * 600;
            const colors = getCategoryColor(room.category, room.isAccessible);
            const isSelected = 
              (selectedRoomId && selectedRoomId === room.id) || 
              (selectedRoomName && selectedRoomName === room.name);

            return (
              <g 
                key={room.id} 
                className="group cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); // Stop SVG background handler from firing
                  const centerX = Math.round(room.x + room.width / 2);
                  const centerY = Math.round(room.y + room.height / 2);
                  if (onSelectLocation) {
                    onSelectLocation({ x: centerX, y: centerY }, room);
                  }
                }}
              >
                {/* Active Highlight Ring around Room */}
                {isSelected && (
                  <rect
                    x={rx - 6}
                    y={ry - 6}
                    width={rw + 12}
                    height={rh + 12}
                    rx="12"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                )}

                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx="8"
                  fill={isSelected ? '#1e3a8a' : colors.fill}
                  stroke={isSelected ? '#38bdf8' : colors.stroke}
                  strokeWidth={isSelected ? '4' : '2'}
                  className={`transition-all duration-200 ${isSelected ? 'brightness-125' : 'group-hover:fill-slate-800'}`}
                />

                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 - 4}
                  fill={isSelected ? '#60a5fa' : '#f8fafc'}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {room.name}
                </text>
                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 + 12}
                  fill={isSelected ? '#93c5fd' : colors.text}
                  fontSize="10"
                  fontWeight="semibold"
                  textAnchor="middle"
                >
                  {isSelected ? '★ SELECTED' : (room.isAccessible ? '✓ Accessible' : '⚠️ Limited Access')}
                </text>
              </g>
            );
          })}

          {/* Render Existing Floor Accessibility Features (Context) */}
          {features.filter(f => f.buildingId === building.id && f.floorId === floor.floorId).map((feat) => {
            const fx = (feat.x / 100) * 1000;
            const fy = (feat.y / 100) * 600;
            return (
              <g key={feat.id} transform={`translate(${fx}, ${fy})`} className="opacity-80">
                <circle r="12" fill={feat.status === 'working' ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth="2" />
                <text y="3.5" fontSize="10" textAnchor="middle" fill="#ffffff" fontWeight="bold">
                  {feat.type === 'ramp' ? '♿' : feat.type === 'lift' ? '🛗' : '📍'}
                </text>
              </g>
            );
          })}

          {/* Selected Location Pin Marker */}
          {selectedLocation && (
            <g transform={`translate(${(selectedLocation.x / 100) * 1000}, ${(selectedLocation.y / 100) * 600})`}>
              <circle r="26" fill="#0284c7" className="animate-ping opacity-75" />
              <circle r="16" fill="#0284c7" stroke="#ffffff" strokeWidth="3.5" className="shadow-xl" />
              <text y="4" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">📍</text>
              
              {/* Pin Label Card */}
              {selectedRoomName && (
                <g transform="translate(0, -32)">
                  <rect x="-80" y="-18" width="160" height="24" rx="6" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
                  <text x="0" y="-3" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                    {selectedRoomName.length > 22 ? `${selectedRoomName.substring(0, 20)}...` : selectedRoomName}
                  </text>
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Overlay Instruction Banner if no location selected in picker mode */}
        {isPickerMode && !selectedLocation && !unmappedError && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-blue-500/40 px-4 py-2 rounded-xl text-center shadow-lg pointer-events-none flex items-center space-x-2 text-xs">
            <MapPin className="w-4 h-4 text-blue-400 animate-bounce" />
            <span className="text-blue-100 font-semibold">Click on a marked room or location on this floor map</span>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="bg-slate-900 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Map Selection:</span>
          {selectedLocation && selectedRoomName ? (
            <span className="font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800/60 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Selected: {selectedRoomName}</span>
            </span>
          ) : unmappedError ? (
            <span className="text-rose-400 font-medium bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{unmappedError}</span>
            </span>
          ) : (
            <span className="text-amber-400 font-medium bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>No Location Selected</span>
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          {floor.rooms.length} Mapped Locations on {floor.name}
        </span>
      </div>
    </div>
  );
};

