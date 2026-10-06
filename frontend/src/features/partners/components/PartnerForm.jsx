'use client';
import { useState } from 'react';

export default function PartnerForm({ type }) {
  const [formData, setFormData] = useState({
    type: type,
    companyName: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 0,
    bankName: '',
    accountNo: '',
    ifscCode: '',
    taxId: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit button clicked! Data:", formData); // ADD THIS
    
    try {
      const res = await fetch('http://localhost:5000/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json(); // Capture the response
      console.log("Server response:", result); // ADD THIS
      
      if (res.ok) {
        alert(`${type} saved successfully!`);
        // ... reset logic
      } else {
        alert(`Error: ${result.error || 'Check console'}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      alert('Failed to connect to server.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white shadow-lg border border-slate-200 rounded-xl space-y-4">
      <h3 className="font-bold text-xl uppercase text-slate-800 mb-4">New {type} Registration</h3>
      
      {/* Basic Required Fields */}
      <input required className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Company Name" 
             value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
      <input required className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Contact Name" 
             value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
      <input required className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Phone Number" 
             value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />

      {/* Optional Details Section */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase">Optional Financial & Tax Details</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Email Address" type="email"
                 value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Tax ID / GSTIN" 
                 value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} />
          <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Bank Name" 
                 value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
          <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Account Number" 
                 value={formData.accountNo} onChange={(e) => setFormData({...formData, accountNo: e.target.value})} />
          <input className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="IFSC / Routing Code" 
                 value={formData.ifscCode} onChange={(e) => setFormData({...formData, ifscCode: e.target.value})} />
        </div>

        <textarea className="w-full border p-3 rounded-lg text-slate-900 border-slate-300" placeholder="Business Address" 
                  value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
      </div>
      
      <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
        Register {type}
      </button>
    </form>
  );
}