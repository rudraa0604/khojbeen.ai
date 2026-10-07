import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';

export default function CampusSelector({ onCampusChange, className = '' }) {
  const [campuses, setCampuses] = useState([
    { id: 1, name: 'Jagran Main Campus (Kanpur)', city: 'Kanpur' },
    { id: 2, name: 'Jagran City Campus (Civil Lines)', city: 'Kanpur' },
    { id: 3, name: 'Jagran Institute of Management (South City)', city: 'Kanpur' },
  ]);
  const [selectedCampusId, setSelectedCampusId] = useState(() => {
    return localStorage.getItem('khojbeen_campus_id') || '1';
  });

  useEffect(() => {
    async function loadCampuses() {
      try {
        const data = await api.getCampuses();
        if (Array.isArray(data) && data.length > 0) {
          setCampuses(data);
        }
      } catch (err) {
        // Fall back to default seeded list
      }
    }
    loadCampuses();
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setSelectedCampusId(val);
    localStorage.setItem('khojbeen_campus_id', val);
    window.dispatchEvent(new Event('campusChanged'));
    if (onCampusChange) {
      onCampusChange(val);
    }
  };

  const selectedName =
    selectedCampusId === 'all'
      ? 'All Campuses'
      : campuses.find((c) => String(c.id) === String(selectedCampusId))?.name || 'Main Campus';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
        <Building2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 flex-shrink-0" />
        <select
          value={selectedCampusId}
          onChange={handleChange}
          className="bg-transparent text-slate-700 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer pr-1"
          aria-label="Select Campus"
        >
          <option value="all" className="dark:bg-slate-900 dark:text-slate-100">
            🏢 All Campuses (Global)
          </option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id} className="dark:bg-slate-900 dark:text-slate-100">
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
