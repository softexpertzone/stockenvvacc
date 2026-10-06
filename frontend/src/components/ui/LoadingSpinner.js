export default function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center p-12">
            <div className="text-slate-500 font-medium animate-pulse">
                Loading records...
            </div>
        </div>
    );
}