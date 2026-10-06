export default function PartnerLayout({ children }) {
    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-900">
            {/* Reduced from 3xl to lg for a cleaner, compact ERP look */}
            <h1 className="text-lg font-bold text-slate-700 mb-6 uppercase tracking-wider">
                Partner Management
            </h1>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                {children}
            </div>
        </div>
    );
}