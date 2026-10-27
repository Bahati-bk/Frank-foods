/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  querySqlite,
  resetSqliteDb,
  exportSqliteDbBinary,
} from '../../lib/sqliteDatabase';
import { POSTGRES_COMPLETE_SETUP_SQL, getPostgresNodeSetupScript } from '../../lib/postgresDatabase';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTenantId: string;
}

export function DatabaseManagerModal({ isOpen, onClose }: DatabaseManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'sqlite' | 'postgres' | 'query'>('sqlite');
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT id, order_number, table_id, status, payment_status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 10;');
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [tableStats, setTableStats] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedTable, setSelectedTable] = useState<string>('orders');
  const [tableData, setTableData] = useState<any[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Load SQLite table statistics
  const loadStats = async () => {
    try {
      const tables = [
        'restaurants',
        'profiles',
        'menu_categories',
        'menu_items',
        'restaurant_tables',
        'orders',
        'order_items',
        'payments',
      ];
      const stats = [];
      for (const t of tables) {
        const res = await querySqlite(`SELECT COUNT(*) as count FROM ${t}`);
        stats.push({ name: t, count: res[0]?.count || 0 });
      }
      setTableStats(stats);

      // Load selected table preview
      const preview = await querySqlite(`SELECT * FROM ${selectedTable} LIMIT 25`);
      setTableData(preview);
    } catch (err: any) {
      console.error('Failed to load table stats:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, selectedTable]);

  if (!isOpen) return null;

  const handleRunQuery = async () => {
    setQueryError(null);
    setQueryResults(null);
    try {
      const res = await querySqlite(sqlQuery);
      setQueryResults(res);
      loadStats();
    } catch (err: any) {
      setQueryError(err.message || 'SQL execution failed');
    }
  };

  const handleDownloadSqliteFile = async () => {
    try {
      const binary = await exportSqliteDbBinary();
      const blob = new Blob([binary as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frank_foods_${new Date().toISOString().slice(0, 10)}.sqlite`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export SQLite file: ' + err.message);
    }
  };

  const handleResetDb = async () => {
    if (!confirm('Reset on-device SQLite database to pristine seed data?')) return;
    setIsResetting(true);
    try {
      await resetSqliteDb();
      await loadStats();
      alert('SQLite database reset successfully with all 8 tables and seeds!');
      window.location.reload();
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#171717] text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[#F97316] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">database</span>
            </span>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Database & Tables Engine
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  SQLite Active On-Device
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                On-device SQLite database engine + automated PostgreSQL setup scripts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('sqlite')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'sqlite'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">table_chart</span>
            SQLite Tables & Data ({tableStats.reduce((acc, s) => acc + s.count, 0)} records)
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'query'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            Run SQL Queries
          </button>
          <button
            onClick={() => setActiveTab('postgres')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'postgres'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dns</span>
            PostgreSQL Setup Code & Script
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          {/* TAB 1: SQLite Tables & Data */}
          {activeTab === 'sqlite' && (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-100 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-700">Select Table:</span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="bg-white border border-neutral-300 rounded-lg text-xs font-semibold py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    {tableStats.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.count} rows)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadSqliteFile}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    Download .sqlite File
                  </button>
                  <button
                    onClick={handleResetDb}
                    disabled={isResetting}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                    Reset SQLite DB
                  </button>
                </div>
              </div>

              {/* Table stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {tableStats.map((t) => (
                  <div
                    key={t.name}
                    onClick={() => setSelectedTable(t.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTable === t.name
                        ? 'border-[#F97316] bg-orange-50/50 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-[11px] font-mono text-neutral-500 truncate">{t.name}</div>
                    <div className="text-xl font-black text-neutral-900 mt-1">{t.count}</div>
                  </div>
                ))}
              </div>

              {/* Selected table data viewer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Table Data: <span className="text-[#F97316] font-mono">{selectedTable}</span> (Showing up to 25 rows)
                  </h3>
                  <button
                    onClick={loadStats}
                    className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
                  </button>
                </div>

                {tableData.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400 text-xs bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                    No records found in {selectedTable}
                  </div>
                ) : (
                  <div className="border border-neutral-200 rounded-xl overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                        <tr>
                          {Object.keys(tableData[0] || {}).map((col) => (
                            <th key={col} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {tableData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50">
                            {Object.values(row).map((val: any, colIdx) => (
                              <td
                                key={colIdx}
                                className="py-2 px-3 whitespace-nowrap text-neutral-800 font-mono text-[11px]"
                              >
                                {val === null ? (
                                  <span className="text-neutral-300 italic">null</span>
                                ) : typeof val === 'object' ? (
                                  JSON.stringify(val)
                                ) : (
                                  String(val)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Run SQL Queries */}
          {activeTab === 'query' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Execute SQL on On-Device SQLite Database
                </label>
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  rows={4}
                  className="w-full p-3 font-mono text-xs bg-neutral-900 text-orange-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="SELECT * FROM orders;"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSqlQuery('SELECT * FROM orders ORDER BY created_at DESC;')}
                    className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-mono cursor-pointer"
                  >
                    SELECT orders
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT item_name, unit_price, quantity, line_total FROM order_items;')}
                    className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-mono cursor-pointer"
                  >
                    SELECT order_items
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT * FROM payments;')}
                    className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-mono cursor-pointer"
                  >
                    SELECT payments
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT id, name, price, is_available FROM menu_items;')}
                    className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-mono cursor-pointer"
                  >
                    SELECT menu_items
                  </button>
                </div>

                <button
                  onClick={handleRunQuery}
                  className="px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  Run SQL Query
                </button>
              </div>

              {queryError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                  Error: {queryError}
                </div>
              )}

              {queryResults && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-700 mb-2">
                    Query Results ({queryResults.length} rows returned)
                  </h4>
                  {queryResults.length === 0 ? (
                    <div className="p-4 rounded-xl bg-neutral-50 text-neutral-500 text-xs">
                      Query executed successfully with 0 rows returned.
                    </div>
                  ) : (
                    <div className="border border-neutral-200 rounded-xl overflow-x-auto max-h-72">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200 sticky top-0">
                          <tr>
                            {Object.keys(queryResults[0] || {}).map((c) => (
                              <th key={c} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {queryResults.map((r, i) => (
                            <tr key={i} className="hover:bg-neutral-50">
                              {Object.values(r).map((v: any, vi) => (
                                <td key={vi} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                                  {v === null ? (
                                    <span className="text-neutral-300 italic">null</span>
                                  ) : (
                                    String(v)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PostgreSQL Setup Code & Script */}
          {activeTab === 'postgres' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 mt-0.5 text-[20px]">info</span>
                <div>
                  <h4 className="font-bold mb-1">PostgreSQL Database & Tables Automation</h4>
                  <p className="leading-relaxed">
                    You can spin up the full PostgreSQL database, all 8 tables, foreign keys, and seeds
                    automatically using the included Node/TypeScript script or by running the SQL directly in psql/pgAdmin.
                  </p>
                </div>
              </div>

              {/* Run Terminal Command */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">
                    1. Run Automated Setup Script (Terminal)
                  </span>
                  <button
                    onClick={() => copyToClipboard('npx tsx scripts/setupPostgres.ts', 'cmd')}
                    className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    {copiedText === 'cmd' ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>
                <div className="p-3 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs flex items-center justify-between">
                  <code>npx tsx scripts/setupPostgres.ts</code>
                </div>
                <p className="text-[11px] text-neutral-500">
                  This connects to PostgreSQL, creates database <code className="text-neutral-800 font-bold">frank_foods</code>, creates all tables, seeds tenants, and performs read/write verification tests.
                </p>
              </div>

              {/* Full PostgreSQL DDL Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">
                    2. Complete PostgreSQL Creation & Seeding SQL
                  </span>
                  <button
                    onClick={() => copyToClipboard(POSTGRES_COMPLETE_SETUP_SQL, 'sql')}
                    className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    {copiedText === 'sql' ? 'Copied SQL!' : 'Copy Full SQL'}
                  </button>
                </div>
                <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed">
                  {POSTGRES_COMPLETE_SETUP_SQL}
                </pre>
              </div>

              {/* Node.js Client Integration Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">
                    3. Node.js / TypeScript Script Code (scripts/setupPostgres.ts)
                  </span>
                  <button
                    onClick={() => copyToClipboard(getPostgresNodeSetupScript(), 'node')}
                    className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    {copiedText === 'node' ? 'Copied Script!' : 'Copy Script Code'}
                  </button>
                </div>
                <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed">
                  {getPostgresNodeSetupScript()}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
          <div>Storage: Persistent in browser local SQLite store &bull; Zero external servers required</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-900 text-white font-bold hover:bg-neutral-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
