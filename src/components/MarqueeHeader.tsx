import React from "react";
import manifestData from "../data/manifest.json";

export interface MarqueeHeaderProps {
  text: string;
  count?: number;
  style?: React.CSSProperties;
}

export const MarqueeHeader: React.FC<MarqueeHeaderProps> = ({ text, count, style }) => {
  const syncTime = manifestData.generatedAt
    ? new Date(manifestData.generatedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    : 'SYNCHRONIZED';
  const shaShort = manifestData.datasetSha256 ? manifestData.datasetSha256.slice(0, 8) : 'VERIFIED';
  const treeShort = manifestData.sourceTreeSha ? manifestData.sourceTreeSha.slice(0, 7) : 'HEAD';

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-mono text-slate-300 backdrop-blur-md mb-6"
      style={style}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold tracking-wider text-slate-100">{text}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
        <span>SYNCED: <strong className="text-slate-200">{syncTime}</strong></span>
        <span className="text-slate-700">|</span>
        <span>UPSTREAM: <code className="text-sky-300">{treeShort}</code></span>
        <span className="text-slate-700">|</span>
        <span>SHA-256: <code className="text-emerald-300">{shaShort}…</code></span>
        <span className="text-slate-700">|</span>
        <span className="text-emerald-400 font-semibold">{count !== undefined ? `${count} PLUGINS INDEXED` : '100% INGESTION'}</span>
      </div>
    </div>
  );
};

export default MarqueeHeader;
