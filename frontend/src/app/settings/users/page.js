'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { ALL_MODULES } from '@/config/modules';

const MODULE_LABELS = {
    dashboard: 'Dashboard',
    warehouse: 'Warehouse',
    inventory: 'Inventory',
    purchase: 'Purchase / Procurement',
    sales: 'Sales',
    catalog: 'Catalog',
    accounts: 'Accounts',
    system: 'System Settings',
};

export default function UserManagementPage() {
    const router = useRouter();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'SALES_VIEWER',
        status: 'ACTIVE',
        allowedModules: [],
    });

    // ===== 1. Only Super Admin & Admin can access =====
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.role || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            router.replace('/dashboard');
        }
    }, [router]);

    // ===== 2. Load users =====
    useEffect(() => {
        let cancelled = false;

        async function loadUsers() {
            try {
                const res = await apiClient.get('/users', {
                    params: { page: 1, limit: 50 },
                });
                if (!cancelled && res.data?.success) {
                    setUsers(res.data.data?.data || res.data.data || []);
                }
            } catch (err) {
                console.error(err);
                if (!cancelled) {
                    setMessage(err.response?.data?.message || 'Failed to load users');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadUsers();

        return () => {
            cancelled = true;
        };
    }, []);

    const currentUser =
        typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('user') || '{}')
            : {};

    const availableModules =
        currentUser.role === 'SUPER_ADMIN'
            ? ALL_MODULES
            : currentUser.allowedModules || [];

    const openCreate = () => {
        setEditingUser(null);
        setForm({
            name: '',
            email: '',
            phone: '',
            password: '',
            role: 'SALES_VIEWER',
            status: 'ACTIVE',
            allowedModules: [],
        });
        setMessage('');
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '',
            role: user.role || 'SALES_VIEWER',
            status: user.status || 'ACTIVE',
            allowedModules: user.allowedModules || [],
        });
        setMessage('');
        setShowModal(true);
    };

    const handleModuleToggle = (moduleKey) => {
        setForm((prev) => {
            const exists = prev.allowedModules.includes(moduleKey);
            return {
                ...prev,
                allowedModules: exists
                    ? prev.allowedModules.filter((m) => m !== moduleKey)
                    : [...prev.allowedModules, moduleKey],
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            if (editingUser) {
                const payload = {
                    name: form.name.trim(),
                    phone: form.phone?.trim() ? form.phone.trim() : null, // ← important
                    role: form.role,
                    status: form.status,
                    allowedModules: form.allowedModules,
                };

                await apiClient.patch(`/users/${editingUser.id}`, payload);
                setMessage('User updated successfully');
            } else {
                const createPayload = {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phone: form.phone?.trim() ? form.phone.trim() : null,
                    password: form.password,
                    role: form.role,
                    status: form.status,
                    allowedModules: form.allowedModules,
                };

                await apiClient.post('/users', createPayload);
                setMessage('User created successfully');
            }

            setShowModal(false);

            // Reload users
            const res = await apiClient.get('/users', {
                params: { page: 1, limit: 50 },
            });
            if (res.data?.success) {
                setUsers(res.data.data?.data || res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data?.errors?.[0]?.message ||
                'Operation failed';
            setMessage(errorMsg);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <p className="text-gray-600 text-sm">Loading users...</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Create users and assign module access
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-[#714B67] hover:bg-[#5d3d55] text-white px-4 py-2 rounded text-sm font-medium shadow-sm transition-colors"
                >
                    + Create User
                </button>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`mb-4 px-4 py-2.5 rounded text-sm border ${
                        message.toLowerCase().includes('success')
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                >
                    {message}
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Name</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Email</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Role</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Modules</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Status</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Action</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                No users found
                            </td>
                        </tr>
                    ) : (
                        users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 font-medium text-gray-900">{user.name}</td>
                                <td className="px-4 py-2.5 text-gray-600">{user.email}</td>
                                <td className="px-4 py-2.5">
                                        <span className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                                            {user.role}
                                        </span>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex flex-wrap gap-1">
                                        {(user.allowedModules || []).length === 0 ? (
                                            <span className="text-gray-400 text-xs">None</span>
                                        ) : (
                                            (user.allowedModules || []).map((m) => (
                                                <span
                                                    key={m}
                                                    className="inline-block bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs"
                                                >
                                                        {MODULE_LABELS[m] || m}
                                                    </span>
                                            ))
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                        <span
                                            className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                                                user.status === 'ACTIVE'
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}
                                        >
                                            {user.status}
                                        </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <button
                                        onClick={() => openEdit(user)}
                                        className="text-[#714B67] hover:text-[#5d3d55] text-sm font-medium"
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

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-base font-semibold text-gray-900">
                                {editingUser ? 'Edit User' : 'Create User'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!editingUser}
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67] disabled:bg-gray-100 disabled:text-gray-500"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="Optional"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
                                />
                            </div>

                            {/* Password (only on create) */}
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Min 8 characters, include uppercase, lowercase & number
                                    </p>
                                </div>
                            )}

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
                                >
                                    {currentUser.role === 'SUPER_ADMIN' && (
                                        <>
                                            <option value="SUPER_ADMIN">Super Admin</option>
                                            <option value="ADMIN">Admin</option>
                                        </>
                                    )}
                                    <option value="PURCHASER">Purchaser</option>
                                    <option value="SALESPERSON">Salesperson</option>
                                    <option value="PURCHASE_VIEWER">Purchase Viewer</option>
                                    <option value="SALES_VIEWER">Sales Viewer</option>
                                    <option value="PICKER">Picker</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="SUSPENDED">Suspended</option>
                                </select>
                            </div>

                            {/* Allowed Modules */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Allowed Modules
                                </label>
                                <div className="border border-gray-300 rounded p-3 space-y-2 max-h-44 overflow-y-auto bg-white">
                                    {availableModules.length === 0 ? (
                                        <p className="text-sm text-gray-400">
                                            No modules available to assign
                                        </p>
                                    ) : (
                                        availableModules.map((mod) => (
                                            <label
                                                key={mod}
                                                className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.allowedModules.includes(mod)}
                                                    onChange={() => handleModuleToggle(mod)}
                                                    className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67]"
                                                />
                                                <span>{MODULE_LABELS[mod] || mod}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    {currentUser.role === 'ADMIN'
                                        ? 'You can only assign modules that Super Admin gave you.'
                                        : 'Select which modules this user can access.'}
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="submit"
                                    className="flex-1 bg-[#714B67] hover:bg-[#5d3d55] text-white py-2 rounded text-sm font-medium transition-colors"
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}