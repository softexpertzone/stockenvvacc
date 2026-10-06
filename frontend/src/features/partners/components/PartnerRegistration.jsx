'use client';
import { useState, useEffect } from 'react';

export default function PartnerForm({ type }) {
  const [formData, setFormData] = useState({
    type: type,
    companyName: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '',
    taxId: '',
    bankName: '',
    accountNo: '',
    ifscCode: ''
  });

  // CRITICAL: Reset state when the 'type' prop changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, type: type }));
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert(`${type} saved successfully!`);
        setFormData({ type, companyName: '', name: '', phone: '', email: '', address: '', creditLimit: '', taxId: '', bankName: '', accountNo: '', ifscCode: '' });
      } else {
        alert('Error: Could not save data.');
      }
    } catch (err) {
      alert('Failed to connect to the backend server.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white shadow-xl border border-slate-200 rounded-2xl space-y-6">
      <h3 className="text-2xl font-extrabold uppercase text-slate-800 border-b pb-4">
        New {formData.type} Registration
      </h3>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input required className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Company Name" 
               value={formData.companyName}
               onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
        <input required className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Contact Name" 
               value={formData.name}
               onChange={(e) => setFormData({...formData, name: e.target.value})} />
        <input required className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Phone Number" 
               value={formData.phone}
               onChange={(e) => setFormData({...formData, phone: e.target.value})} />
        <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Email Address" type="email"
               value={formData.email}
               onChange={(e) => setFormData({...formData, email: e.target.value})} />
      </div>

      <textarea className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Business Address" rows="2"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})} />

      {/* Financial & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
        <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Credit Limit" type="number"
               value={formData.creditLimit}
               onChange={(e) => setFormData({...formData, creditLimit: e.target.value})} />
        <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Tax ID / GSTIN" 
               value={formData.taxId}
               onChange={(e) => setFormData({...formData, taxId: e.target.value})} />
        <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Bank Name" 
               value={formData.bankName}
               onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
        <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Account Number" 
               value={formData.accountNo}
               onChange={(e) => setFormData({...formData, accountNo: e.target.value})} />
        <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="IFSC / Routing Code" 
               value={formData.ifscCode}
               onChange={(e) => setFormData({...formData, ifscCode: e.target.value})} />
      </div>
      
      <button className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition shadow-lg">
        Register {formData.type}
      </button>
    </form>
  );
}