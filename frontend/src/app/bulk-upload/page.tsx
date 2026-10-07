'use client';

import { useState, useRef } from 'react';
import { downloadEquipmentTemplate, bulkUploadEquipment } from '@/lib/api';

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: number; errorsList: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/equipment/template');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'equipment_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Failed to download template'); }
  };

  const handleFileChange = (f: File | null) => {
    if (f && !f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await bulkUploadEquipment(file);
      setResult(res.data);
    } catch (err: any) { alert(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileChange(e.dataTransfer.files[0]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-2">Bulk Upload Equipment</h1>
      <p className="text-sm text-slate-400 mb-6">Upload Excel to create or update equipment in bulk.</p>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Step 1: Download Template</h2>
        <p className="text-xs text-slate-400 mb-3">Download the Excel template with correct column format.</p>
        <button onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors">
          <span>📥</span> Download Template (.xlsx)
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Step 2: Upload Your File</h2>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
          {file ? (
            <div>
              <p className="text-lg mb-1">📄</p>
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                className="mt-2 text-xs text-red-500 hover:text-red-700 underline">Remove</button>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm text-slate-500 font-medium">Drop your Excel file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">.xlsx or .xls files only</p>
            </div>
          )}
        </div>
        {file && (
          <button onClick={handleUpload} disabled={uploading}
            className="mt-4 w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Uploading...</span> : `Upload ${file.name}`}
          </button>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Upload Results</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-lg font-bold text-emerald-700">{result.created}</p>
              <p className="text-xs text-emerald-600">Created</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
              <p className="text-lg font-bold text-blue-700">{result.updated}</p>
              <p className="text-xs text-blue-600">Updated</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
              <p className="text-lg font-bold text-red-700">{result.errors}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {result.errorsList.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-2">Error Details:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errorsList.map((err, i) => (
                  <p key={i} className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
