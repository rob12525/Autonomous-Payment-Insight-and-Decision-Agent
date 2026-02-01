import { AuditLog } from '../types';
import { Info, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

interface AuditLogEntryProps {
  log: AuditLog;
}

export function AuditLogEntry({ log }: AuditLogEntryProps) {
  const levelConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
    },
    warn: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-900',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-900',
    },
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900',
    },
  };

  const config = levelConfig[log.level];
  const Icon = config.icon;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium uppercase ${config.textColor}`}>
              {log.level}
            </span>
            <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/50 text-gray-700">
              {log.module}
            </span>
            <span className="font-mono text-xs text-gray-500">{log.id.slice(0, 8)}</span>
          </div>
          <p className={`text-sm ${config.textColor}`}>{log.message}</p>
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                View metadata
              </summary>
              <pre className="mt-2 p-2 bg-white/50 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
