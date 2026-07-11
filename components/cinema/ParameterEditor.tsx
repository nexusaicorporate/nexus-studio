import React from 'react';
import type { LTXParams } from '@/lib/types';
import { DEFAULT_LTX_PARAMS } from '@/lib/types';
import { Settings2, RefreshCw } from 'lucide-react';

interface ParameterEditorProps {
  params?: Partial<LTXParams>;
  globalParams: LTXParams;
  onChange: (newParams: Partial<LTXParams>) => void;
  isGlobal?: boolean;
}

export function ParameterEditor({ params = {}, globalParams, onChange, isGlobal = false }: ParameterEditorProps) {
  // Merge current with global to show the effective value, but we only save overrides
  const effectiveParams = { ...globalParams, ...params };

  const handleChange = (key: keyof LTXParams, value: any) => {
    onChange({ ...params, [key]: value });
  };

  const handleClearOverride = (key: keyof LTXParams) => {
    const newParams = { ...params };
    delete newParams[key];
    onChange(newParams);
  };

  const hasOverride = (key: keyof LTXParams) => {
    return params[key] !== undefined;
  };

  return (
    <div className="flex flex-col gap-4 text-sm text-white/90">
      <div className="flex items-center gap-2 text-white/50 mb-2 border-b border-white/10 pb-2">
        <Settings2 size={16} />
        <span className="font-semibold text-xs uppercase tracking-wider">{isGlobal ? "Global Project Settings" : "Scene Parameter Overrides"}</span>
      </div>

      <div className="space-y-4">
        {/* Basic Settings */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-white/70">Resolution</label>
              {!isGlobal && hasOverride('resolution') && (
                <button onClick={() => handleClearOverride('resolution')} className="text-[10px] text-primary hover:text-primary-light flex items-center gap-1"><RefreshCw size={10}/> Clear Override</button>
              )}
            </div>
            <select
              value={effectiveParams.resolution}
              onChange={(e) => handleChange('resolution', e.target.value)}
              className={`bg-white/5 border rounded p-1.5 text-xs outline-none focus:border-primary ${!isGlobal && hasOverride('resolution') ? 'border-primary' : 'border-white/10'}`}
            >
              <option value="960x544">960x544 (16:9)</option>
              <option value="544x960">544x960 (9:16)</option>
              <option value="768x768">768x768 (1:1)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-white/70">Video Length (Frames)</label>
              {!isGlobal && hasOverride('video_length') && (
                <button onClick={() => handleClearOverride('video_length')} className="text-[10px] text-primary hover:text-primary-light flex items-center gap-1"><RefreshCw size={10}/> Clear Override</button>
              )}
            </div>
            <input
              type="number"
              value={effectiveParams.video_length}
              onChange={(e) => handleChange('video_length', parseInt(e.target.value))}
              className={`bg-white/5 border rounded p-1.5 text-xs outline-none focus:border-primary ${!isGlobal && hasOverride('video_length') ? 'border-primary' : 'border-white/10'}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-white/70">Guidance Scale (CFG)</label>
              {!isGlobal && hasOverride('guidance_scale') && (
                <button onClick={() => handleClearOverride('guidance_scale')} className="text-[10px] text-primary hover:text-primary-light flex items-center gap-1"><RefreshCw size={10}/> Clear Override</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={effectiveParams.guidance_scale}
                onChange={(e) => handleChange('guidance_scale', parseFloat(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs w-8 text-right font-mono">{effectiveParams.guidance_scale}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-white/70">Seed (-1 for random)</label>
              {!isGlobal && hasOverride('seed') && (
                <button onClick={() => handleClearOverride('seed')} className="text-[10px] text-primary hover:text-primary-light flex items-center gap-1"><RefreshCw size={10}/> Clear Override</button>
              )}
            </div>
            <input
              type="number"
              value={effectiveParams.seed}
              onChange={(e) => handleChange('seed', parseInt(e.target.value))}
              className={`bg-white/5 border rounded p-1.5 text-xs outline-none focus:border-primary font-mono ${!isGlobal && hasOverride('seed') ? 'border-primary' : 'border-white/10'}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-white/70">Negative Prompt</label>
              {!isGlobal && hasOverride('negative_prompt') && (
                <button onClick={() => handleClearOverride('negative_prompt')} className="text-[10px] text-primary hover:text-primary-light flex items-center gap-1"><RefreshCw size={10}/> Clear Override</button>
              )}
            </div>
            <textarea
              rows={3}
              value={effectiveParams.negative_prompt}
              onChange={(e) => handleChange('negative_prompt', e.target.value)}
              placeholder="worst quality, bad anatomy, deformed..."
              className={`bg-white/5 border rounded p-2 text-xs outline-none focus:border-primary resize-none ${!isGlobal && hasOverride('negative_prompt') ? 'border-primary' : 'border-white/10'}`}
            />
          </div>
          
          {/* Advanced Dropdown could go here for the other 70 parameters */}
          <div className="pt-4 text-center">
             <span className="text-[10px] text-white/30">Showing 5 of 82 LTX parameters</span>
          </div>

        </div>
      </div>
    </div>
  );
}
