import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { TableStand } from '../../types/dining';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  table?: TableStand | null;
  allTables?: TableStand[];
  restaurantName: string;
  branchName: string;
}

export const TableQrPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  table,
  allTables = [],
  restaurantName,
  branchName,
}) => {
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate real QR code image data URLs
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsGenerating(true);

    const generateQrs = async () => {
      const targets = table ? [table] : allTables;
      const results: Record<string, string> = {};

      for (const t of targets) {
        try {
          const origin = window.location.origin;
          const token = t.qrCodeToken || (t.path.includes('token=') ? t.path.split('token=')[1] : 'qr_ff_table_07_live');
          const fullScanUrl = `${origin}/menu?table_token=${token}`;
          const dataUrl = await QRCode.toDataURL(fullScanUrl, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: {
              dark: '#171717',
              light: '#FFFFFF',
            },
          });
          results[t.id] = dataUrl;
        } catch (err) {
          console.error(`Failed to generate QR code for ${t.label}:`, err);
        }
      }

      if (mounted) {
        setQrDataUrls(results);
        setIsGenerating(false);
      }
    };

    generateQrs();
    return () => {
      mounted = false;
    };
  }, [isOpen, table, allTables]);

  if (!isOpen) return null;

  const isBulk = !table && allTables.length > 0;
  const tablesToPrint = table ? [table] : allTables;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 flex flex-col gap-5 max-h-[90vh]">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 print:hidden">
          <div>
            <h3 className="font-extrabold text-lg text-neutral-900">
              {isBulk ? `Print All Stand Cards (${allTables.length} Tables)` : `Print Table Stand — ${table?.label}`}
            </h3>
            <p className="text-xs text-neutral-500">
              High-contrast vector QR codes configured for smartphone camera scanning.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Send to Printer / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isGenerating && (
          <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#F97316]">
              progress_activity
            </span>
            <span>Generating high-resolution QR codes...</span>
          </div>
        )}

        {/* Printable Stand Cards Container */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className={`grid gap-6 ${isBulk ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 max-w-sm mx-auto'}`}>
            {tablesToPrint.map((tbl) => {
              const qrUrl = qrDataUrls[tbl.id];
              const token = tbl.qrCodeToken || (tbl.path.includes('token=') ? tbl.path.split('token=')[1] : 'token');

              return (
                <div
                  key={tbl.id}
                  className="bg-white border-2 border-neutral-900 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm relative overflow-hidden"
                >
                  {/* Brand Ribbon */}
                  <div className="w-full bg-[#171717] text-white py-1.5 px-3 rounded-lg mb-3 flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#F97316] text-[10px] font-black flex items-center justify-center">
                      F
                    </span>
                    <span className="text-xs font-black tracking-wider uppercase">
                      {restaurantName}
                    </span>
                  </div>

                  {/* Table Identifier */}
                  <div className="mb-2">
                    <span className="text-2xl font-black text-neutral-900 tracking-tight block">
                      {tbl.label}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-full inline-block">
                      {tbl.locationZone} Zone
                    </span>
                  </div>

                  {/* High-Resolution Scannable QR Code */}
                  <div className="w-44 h-44 p-2 bg-white rounded-xl border border-neutral-200 my-2 flex items-center justify-center shadow-inner">
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt={`QR code for ${tbl.label}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
                        Generating...
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <p className="text-xs font-bold text-neutral-800 leading-snug mt-1">
                    Scan with Phone Camera to Order
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    No app download required • Pay at table
                  </p>

                  {/* Footer Wi-Fi credentials */}
                  <div className="w-full mt-3 pt-2.5 border-t border-neutral-200 text-[9px] text-neutral-600 flex items-center justify-between font-mono">
                    <span>Wi-Fi: {restaurantName.replace(/\s+/g, '')}_Guest</span>
                    <span>Pass: frankfoods2026</span>
                  </div>

                  {/* Token Reference */}
                  <span className="text-[8px] text-neutral-400 font-mono mt-1 truncate max-w-full">
                    {token}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden in Print) */}
        <div className="pt-3 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 print:hidden">
          <span>{branchName} • Standard A6 / Table Stand Format</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-semibold hover:bg-neutral-100 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold cursor-pointer shadow-md"
            >
              Print Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
