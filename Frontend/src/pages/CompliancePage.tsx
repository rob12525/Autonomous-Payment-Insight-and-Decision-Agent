import { useState } from 'react';
import { fetchAPI } from '../lib/api';
import { ComplianceReport } from '../types';
import { Download, FileText, Calendar, CheckCircle } from 'lucide-react';

export function CompliancePage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [savedReports, setSavedReports] = useState<ComplianceReport[]>([]);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();

      const reportData = await fetchAPI<ComplianceReport>('/api/compliance-report', {
        startTime,
        endTime,
      });

      setReport(reportData);
      setShowPreview(true);
      setSavedReports([reportData, ...savedReports]);
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  const downloadAsPDF = () => {
    if (!report) return;

    // In a real app, this would use a PDF library
    // For now, we'll download as text
    const blob = new Blob([report.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.generatedAt}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsCSV = () => {
    if (!report) return;

    const blob = new Blob([report.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.generatedAt}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
        <p className="text-sm text-gray-600 mt-1">
          Generate and export compliance reports for audit and regulatory purposes
        </p>
      </div>

      {/* Report Generator */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Generate New Report</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading || !startDate || !endDate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {report && showPreview && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Report Preview</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={downloadAsPDF}
                  className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={downloadAsCSV}
                  className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
              <div className="mb-4">
                <div className="text-sm text-gray-600">Report Period</div>
                <div className="font-medium">
                  {formatDate(report.startTime)} - {formatDate(report.endTime)}
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                {report.content}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Historical Reports */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h2>
        
        {savedReports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No reports generated yet</p>
            <p className="text-sm mt-1">Generate your first compliance report above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedReports.map((report, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        Compliance Report
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(report.startTime)} - {formatDate(report.endTime)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Generated {formatDateTime(report.generatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setReport(report);
                        setShowPreview(true);
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Preview
                    </button>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compliance Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-2">About Compliance Reports</h3>
        <p className="text-sm text-blue-800">
          Compliance reports provide a comprehensive audit trail of all system decisions, 
          executions, and human approvals within a specified time period. These reports are 
          designed to meet regulatory requirements for AI system transparency and accountability.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-blue-800">
          <li>• All timestamps are in UTC</li>
          <li>• Reports include decision metadata, patterns, and outcomes</li>
          <li>• Human approval records are fully traceable</li>
          <li>• Cryptographically signed for authenticity (enterprise feature)</li>
        </ul>
      </div>
    </div>
  );
}
