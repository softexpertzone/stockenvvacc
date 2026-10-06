'use client';

import { useState } from 'react';
import { Download, Loader2, Database, Shield, Cloud, KeyRound } from 'lucide-react';
import axiosInstance from '@/api/axiosConfig';

export default function BackupPage() {
    const [loadingLocal, setLoadingLocal] = useState(false);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [message, setMessage] = useState('');
    const [driveResult, setDriveResult] = useState(null);
    const [needsAuth, setNeedsAuth] = useState(false);

    // ========== Local Download ==========
    const handleLocalBackup = async () => {
        try {
            setLoadingLocal(true);
            setMessage('');
            setDriveResult(null);

            const res = await axiosInstance.get('/api/admin/backup/download', {
                responseType: 'blob',
            });

            const blob = new Blob([res.data], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            a.href = url;
            a.download = `stockenv-backup-${date}.sql`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setMessage('Local backup downloaded successfully!');
        } catch (err) {
            console.error('Local backup error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to download backup';
            setMessage(errorMsg);
        } finally {
            setLoadingLocal(false);
        }
    };

    // ========== Authorize Google Drive ==========
    const handleAuthorizeDrive = async () => {
        try {
            setLoadingAuth(true);
            const res = await axiosInstance.get('/api/admin/backup/google-drive/auth-url');
            if (res.data?.url) {
                window.open(res.data.url, '_blank', 'width=600,height=700');
                setMessage('Authorization window opened. Grant access in Google, then try backup again.');
                setNeedsAuth(false);
            }
        } catch (err) {
            console.error('Auth fetch error:', err);
            setMessage(err.response?.data?.error || err.message || 'Failed to generate Google Drive authorization URL');
        } finally {
            setLoadingAuth(false);
        }
    };

    // ========== Google Drive Backup ==========
    const handleGoogleDriveBackup = async () => {
        if (!confirm('Create a database backup and upload it to Google Drive?')) {
            return;
        }

        try {
            setLoadingDrive(true);
            setMessage('');
            setDriveResult(null);

            const res = await axiosInstance.post('/api/admin/backup/google-drive');
            const data = res.data;

            if (!data.success) {
                throw new Error(data.error || data.message || 'Google Drive backup failed');
            }

            setDriveResult(data);
            setMessage('Backup uploaded to Google Drive successfully!');
        } catch (err) {
            console.error('Google Drive backup error:', err);
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to backup to Google Drive';
            setMessage(errorMsg);
            setDriveResult({ success: false, message: errorMsg });

            if (errorMsg.toLowerCase().includes('not authorized') || errorMsg.toLowerCase().includes('token')) {
                setNeedsAuth(true);
            }
        } finally {
            setLoadingDrive(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Database className="w-6 h-6 text-blue-600" />
                    Database Backup
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Download a full backup or upload it directly to Google Drive.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Local Download Card */}
                <div className="bg-white border rounded-xl shadow-sm p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Shield className="w-6 h-6 text-blue-600" />
                        </div>

                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Local Download
                            </h2>
                            <p className="text-sm text-gray-600 mt-1 mb-5">
                                Create a complete SQL backup and download it to your computer.
                            </p>

                            <button
                                onClick={handleLocalBackup}
                                disabled={loadingLocal || loadingDrive}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition cursor-pointer"
                            >
                                {loadingLocal ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating Backup...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Download Backup
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Google Drive Card */}
                <div className="bg-white border rounded-xl shadow-sm p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                            <Cloud className="w-6 h-6 text-green-600" />
                        </div>

                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Google Drive Backup
                            </h2>
                            <p className="text-sm text-gray-600 mt-1 mb-5">
                                Create a compressed dump and upload it directly to Google Drive.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleGoogleDriveBackup}
                                    disabled={loadingLocal || loadingDrive || loadingAuth}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition cursor-pointer"
                                >
                                    {loadingDrive ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Uploading to Drive...
                                        </>
                                    ) : (
                                        <>
                                            <Cloud className="w-4 h-4" />
                                            Backup to Google Drive
                                        </>
                                    )}
                                </button>

                                {needsAuth && (
                                    <button
                                        onClick={handleAuthorizeDrive}
                                        disabled={loadingAuth}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition cursor-pointer"
                                    >
                                        {loadingAuth ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <KeyRound className="w-4 h-4" />
                                        )}
                                        Authorize Drive
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`mt-6 p-4 rounded-xl border text-sm ${
                    message.toLowerCase().includes('success') || message.toLowerCase().includes('opened')
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {message}
                </div>
            )}

            {/* Drive Result Details */}
            {driveResult?.success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 space-y-1">
                    <p><strong>File name:</strong> {driveResult.fileName}</p>
                    <p><strong>Drive File ID:</strong> {driveResult.driveFileId}</p>
                    {driveResult.webViewLink && (
                        <p>
                            <strong>Open:</strong>{' '}
                            <a
                                href={driveResult.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-green-900"
                            >
                                View in Google Drive
                            </a>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}