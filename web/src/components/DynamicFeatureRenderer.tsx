import React, { useState } from 'react';
import { DiscoveredFeature, ApiOperation } from '../types';
import { api } from '../services/api';
import {
  Play,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Upload,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  ExternalLink,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

interface Props {
  feature: DiscoveredFeature;
  userRole: 'OWNER' | 'MANAGER';
  onTriggerDestructive: (feature: DiscoveredFeature) => void;
  onOpenFallback: (feature: DiscoveredFeature) => void;
  onInspect: (feature: DiscoveredFeature) => void;
  onActionComplete?: (msg: string) => void;
}

export const DynamicFeatureRenderer: React.FC<Props> = ({
  feature,
  userRole,
  onTriggerDestructive,
  onOpenFallback,
  onInspect,
  onActionComplete
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fileUploadName, setFileUploadName] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileUploadSuccess, setFileUploadSuccess] = useState(false);
  const [fileUploadSize, setFileUploadSize] = useState<string | null>(null);

  const primaryOp = feature.apiOperations[0];
  const method = primaryOp?.method || (feature.isDestructive ? 'DELETE' : 'GET');

  const handleInputChange = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    // Validation check
    for (const field of feature.uiStructure.formFields) {
      if (field.required && !formData[field.name]) {
        setActionError(`Field '${field.label}' is required.`);
        return;
      }
    }

    if (feature.isDestructive) {
      onTriggerDestructive(feature);
      return;
    }

    setIsSubmitting(true);
    try {
      if (primaryOp) {
        if (primaryOp.method === 'POST') {
          await api.post(primaryOp.endpoint, formData);
        } else if (primaryOp.method === 'DELETE') {
          await api.delete(primaryOp.endpoint);
        } else if (primaryOp.method === 'PATCH' || primaryOp.method === 'PUT') {
          await api.patch(primaryOp.endpoint, formData);
        } else {
          await api.get(primaryOp.endpoint);
        }
      }
      setIsSubmitting(false);
      if (onActionComplete) {
        onActionComplete(`Action '${feature.name}' executed successfully (HTTP 200 OK).`);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setActionError(err.message || 'Operation failed on target website backend.');
    }
  };

  // If WebView Fallback is required
  if (feature.chosenOption === 'WEBVIEW_FALLBACK') {
    return (
      <div className="glass-panel p-5 space-y-4 border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <ExternalLink size={18} />
            <span>{feature.name}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
            WEBVIEW FALLBACK
          </span>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {feature.description}
        </p>

        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-muted)] space-y-1">
          <div>Route: <span className="text-cyan-400">{feature.route}</span></div>
          <div>Reason: Requires complex WebGL/HTML5 interactive web canvas</div>
        </div>

        <button
          onClick={() => onOpenFallback(feature)}
          className="btn-primary w-full text-xs py-2.5 shadow-lg shadow-cyan-500/20"
        >
          <ExternalLink size={14} />
          Open Secure Authenticated Embedded Browser
        </button>
      </div>
    );
  }

  // Render Form / Card / Table natively based on UI structure
  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                method === 'GET'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : method === 'POST'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                  : method === 'DELETE'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
              }`}
            >
              {method}
            </span>
            <h4 className="font-bold text-sm text-[var(--text-primary)]">{feature.name}</h4>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">{feature.route}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onInspect(feature)}
            className="btn-secondary px-2.5 py-1 text-xs"
          >
            <Info size={13} />
            Spec
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feature.description}</p>

      {/* Error Alert */}
      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Dynamic Inputs Form if present */}
      {feature.uiStructure.hasForm && feature.uiStructure.formFields.length > 0 && (
        <form onSubmit={handleFormSubmit} className="space-y-3 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {feature.uiStructure.formFields.map((field, idx) => (
              <div key={idx}>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">
                  {field.label.toUpperCase()} {field.required && '*'}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="input-field text-xs"
                    required={field.required}
                  >
                    <option value="">Select option...</option>
                    <option value="MANAGER">MANAGER Scope</option>
                    <option value="OWNER">OWNER Scope</option>
                    <option value="OPERATOR">OPERATOR Scope</option>
                  </select>
                ) : field.type === 'file' ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <label className="btn-secondary px-3 py-1.5 text-xs cursor-pointer">
                        <Upload size={13} />
                        {isUploadingFile ? 'Uploading...' : 'Choose File'}
                        <input
                          type="file"
                          className="hidden"
                          disabled={isUploadingFile}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFileUploadName(file.name);
                              setFileUploadSize(`${(file.size / 1024).toFixed(1)} KB`);
                              setIsUploadingFile(true);
                              setFileUploadSuccess(false);

                              const reader = new FileReader();
                              reader.onload = async () => {
                                try {
                                  const dataUrl = reader.result as string;
                                  const res = await fetch('/api/v1/uploads', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      fileName: file.name,
                                      fileType: file.type,
                                      dataUrl
                                    })
                                  });
                                  if (res.ok) {
                                    const uploadData = await res.json();
                                    handleInputChange(field.name, uploadData.url);
                                    setFileUploadSuccess(true);
                                  } else {
                                    handleInputChange(field.name, file.name);
                                  }
                                } catch {
                                  handleInputChange(field.name, file.name);
                                } finally {
                                  setIsUploadingFile(false);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-xs font-mono text-[var(--text-muted)] truncate max-w-[150px]">
                        {fileUploadName || 'No file selected'}
                      </span>
                      {fileUploadSuccess && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 size={11} />
                          {fileUploadSize}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.label}...`}
                    className="input-field text-xs"
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary text-xs px-5 py-2 ${
                feature.isDestructive ? 'bg-rose-600 hover:bg-rose-500' : ''
              }`}
            >
              {isSubmitting ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : feature.isDestructive ? (
                <ShieldAlert size={13} />
              ) : (
                <Play size={13} />
              )}
              {feature.isDestructive ? 'Request Destructive Action' : 'Submit Payload'}
            </button>
          </div>
        </form>
      )}

      {/* Buttons Action Bar */}
      {!feature.uiStructure.hasForm && feature.uiStructure.buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-color)]">
          {feature.uiStructure.buttons.map((btn, i) => (
            <button
              key={i}
              onClick={() => {
                if (btn.isDestructive || feature.isDestructive) {
                  onTriggerDestructive(feature);
                } else {
                  handleFormSubmit({ preventDefault: () => {} } as any);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                btn.isDestructive || feature.isDestructive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                  : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25'
              }`}
            >
              {btn.isDestructive || feature.isDestructive ? <ShieldAlert size={13} /> : <Play size={13} />}
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
