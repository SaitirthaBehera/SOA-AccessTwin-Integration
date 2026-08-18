import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Building } from '../types';

interface BuildingSelectorProps {
  onSelect: (buildingId: string) => void;
  selectedBuildingId: string | null;
}

export const BuildingSelector: React.FC<BuildingSelectorProps> = ({ onSelect, selectedBuildingId }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBuildings() {
      setLoading(true);
      setError(null);

      try {
        const data = await api.getSupabaseBuildings();
        if (data && data.length > 0) {
          setBuildings(data);
          
          // Automatically select the very first building if none is currently selected
          if (!selectedBuildingId) {
            onSelect(data[0].id);
          }
        } else {
          setBuildings([]);
        }
      } catch (err: any) {
        console.error('Error fetching buildings:', err);
        setError('Failed to load buildings');
      } finally {
        setLoading(false);
      }
    }
    fetchBuildings();
  }, [selectedBuildingId, onSelect]);

  if (loading) return <div className="text-sm text-slate-500 px-3 py-1.5">Loading...</div>;
  if (error) return <div className="text-sm text-red-500 px-3 py-1.5">{error}</div>;

  return (
    <select
      value={selectedBuildingId || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="text-sm font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
    >
      {buildings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
};
