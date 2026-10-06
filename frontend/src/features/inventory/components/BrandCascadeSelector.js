'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';
import { API_ENDPOINTS } from '@/config/apiEndpoints';

export default function BrandCascadeSelector({ onSelectionChange }) {
  const [allBrands, setAllBrands] = useState([]);
  const [rootBrands, setRootBrands] = useState([]);
  const [subBrands, setSubBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedParent, setSelectedParent] = useState('');
  const [selectedChild, setSelectedChild] = useState('');

  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(API_ENDPOINTS.CATALOG.BRANDS);

        // FLEXIBLE DATA EXTRACTION:
        // Checks for response.data.data (the nested one) OR response.data (the flat one)
        const data = response?.data?.data || response?.data || [];

        // Debug log to confirm what we got
        console.log("DEBUG: Final Brand Data Array:", data);

        if (Array.isArray(data) && data.length > 0) {
          setAllBrands(data);
          // Assuming 'parentId' exists in your brand data for filtering
          setRootBrands(data.filter(b => !b.parentId));
        } else {
          console.warn("⚠️ API returned no brand data.");
          setAllBrands([]);
          setRootBrands([]);
        }
      } catch (err) {
        console.error("Failed to fetch brands:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    onSelectionChange({
      brandId: selectedParent,
      subBrandId: selectedChild
    });
  }, [selectedParent, selectedChild, onSelectionChange]);

  const handleParentChange = (e) => {
    const parentId = e.target.value;
    setSelectedParent(parentId);
    setSelectedChild('');

    if (parentId) {
      setSubBrands(allBrands.filter(b => b.parentId === parentId));
    } else {
      setSubBrands([]);
    }
  };

  return (
      <div className="space-y-4">
        {loading && <p className="text-xs text-blue-600 animate-pulse">Loading brands...</p>}

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Master Brand Line</label>
          <select
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedParent}
              onChange={handleParentChange}
          >
            <option value="">{loading ? "Loading..." : "Select Brand Line"}</option>
            {rootBrands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Sub-Brand Classification</label>
          <select
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              disabled={!selectedParent || subBrands.length === 0}
          >
            <option value="">
              {!selectedParent
                  ? 'Awaiting Master Brand...'
                  : subBrands.length === 0
                      ? 'No Sub-brands Available'
                      : 'Select Variant Family'
              }
            </option>
            {subBrands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
  );
}