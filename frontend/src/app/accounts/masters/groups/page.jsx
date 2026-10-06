/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { groupApi } from '@/features/accounts/api/groupApi';
import GroupForm from '@/features/accounts/components/GroupForm';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await groupApi.getAll();
      const payload = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.data) ? payload.data : []);
      setGroups(list);
    } catch (err) {
      console.error(err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = (group) => {
    setEditData(group);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditData(null);
    setLoading(true);
    load();
  };

  return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        {/* Page header - Odoo/SAP style */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Account Groups</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Chart of accounts hierarchy · {Array.isArray(groups) ? groups.length : 0} groups
              </p>
            </div>
            <button
                onClick={() => {
                  setEditData(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 bg-[#714B67] hover:bg-[#5a3c53] text-white px-4 py-2 rounded text-sm font-medium shadow-sm transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              New Group
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Form panel */}
          {showForm && (
              <div className="mb-6 bg-white border border-gray-200 rounded shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-800">
                    {editData ? 'Edit Group' : 'Create Group'}
                  </h2>
                </div>
                <div className="p-4">
                  <GroupForm
                      initialData={editData}
                      onSuccess={handleSuccess}
                      onCancel={() => {
                        setShowForm(false);
                        setEditData(null);
                      }}
                  />
                </div>
              </div>
          )}

          {/* Data table */}
          <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            {loading ? (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">
                  Loading groups…
                </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Nature</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Parent</th>
                      <th className="px-4 py-3 w-24">Action</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {(Array.isArray(groups) ? groups : []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                            No account groups found. Create one to get started.
                          </td>
                        </tr>
                    ) : (
                        (Array.isArray(groups) ? groups : []).map((g) => (
                            <tr
                                key={g.id}
                                className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-mono text-gray-800">
                                {g.code}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-gray-900">
                                {g.name}
                              </td>
                              <td className="px-4 py-2.5">
                          <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  g.nature === 'ASSET'
                                      ? 'bg-blue-50 text-blue-700'
                                      : g.nature === 'LIABILITY'
                                          ? 'bg-amber-50 text-amber-700'
                                          : g.nature === 'INCOME'
                                              ? 'bg-green-50 text-green-700'
                                              : g.nature === 'EXPENSE'
                                                  ? 'bg-red-50 text-red-700'
                                                  : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {g.nature || '—'}
                          </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-700">{g.type || '—'}</td>
                              <td className="px-4 py-2.5 text-gray-600">
                                {g.parent?.name || '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <button
                                    onClick={() => handleEdit(g)}
                                    className="text-[#714B67] hover:text-[#5a3c53] text-sm font-medium hover:underline"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}