import React from 'react';
import { FeatureStatus } from '../types';
import { CheckCircle2, Clock, Globe, AlertTriangle, XCircle, Wrench, ShieldAlert } from 'lucide-react';

interface Props {
  status: FeatureStatus;
  size?: 'sm' | 'md';
}

export const FeatureStatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  switch (status) {
    case 'FULLY_INTEGRATED':
      return (
        <span className="badge badge-native">
          <CheckCircle2 size={12} />
          Fully Integrated
        </span>
      );
    case 'NATIVE_READY':
    case 'NATIVE_IMPLEMENTED':
      return (
        <span className="badge badge-native">
          <CheckCircle2 size={12} />
          {status === 'NATIVE_READY' ? 'Native Ready' : 'Native Implemented'}
        </span>
      );
    case 'WEBVIEW_FALLBACK':
      return (
        <span className="badge badge-webview">
          <Globe size={12} />
          WebView Fallback
        </span>
      );
    case 'NEEDS_CONFIGURATION':
      return (
        <span className="badge badge-config">
          <Wrench size={12} />
          Needs Config
        </span>
      );
    case 'TESTING':
    case 'ANALYSING':
    case 'DISCOVERED':
      return (
        <span className="badge badge-analysing">
          <Clock size={12} />
          {status}
        </span>
      );
    case 'FAILED_VALIDATION':
      return (
        <span className="badge badge-unavailable">
          <ShieldAlert size={12} />
          Failed Validation
        </span>
      );
    case 'UNAVAILABLE':
    default:
      return (
        <span className="badge badge-unavailable">
          <XCircle size={12} />
          Unavailable
        </span>
      );
  }
};
