import React, { useState } from 'react';
import { AiDetectionResult } from '../types';
import { api } from '../services/api';
import { MOCK_AI_DETECTION_SAMPLES } from '../data/mockData';
import { 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Eye, 
  Zap,
  Plus,
  Volume2
} from 'lucide-react';

interface AiDetectionProps {
  onAddDetectedFeatureToTwin?: (featureName: string, featureType: string, confidence: number) => void;
}

export const AiDetection: React.FC<AiDetectionProps> = ({ onAddDetectedFeatureToTwin }) => {
  const [selectedSample, setSelectedSample] = useState<AiDetectionResult>(MOCK_AI_DETECTION_SAMPLES[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<AiDetectionResult>(MOCK_AI_DETECTION_SAMPLES[0]);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live Python Gemini AI Backend Upload
  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setUploadedImage(base64);
        setIsAnalyzing(true);
        setError(null);
        setVoiceMessage(null);

        try {
          // 🚀 Calls Python Backend: POST http://127.0.0.1:8000/api/detect
          const result = await api.analyzeImage(base64);
          setDetectionResult(result);
          if ((result as any).voice_message) {
            setVoiceMessage((result as any).voice_message);
          }
        } catch (err: any) {
          setError(err?.message || 'Python Backend connection error on port 8000');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Switch back to Demo Presets
  const handleSelectSample = (sample: AiDetectionResult) => {
    setSelectedSample(sample);
    setUploadedImage(null);
    setDetectionResult(sample);
    setVoiceMessage(null);
    setError(null);
  };

  const handleSpeakVoice = () => {
    if (voiceMessage && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(voiceMessage);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const activeImage = uploadedImage || detectionResult.imageUrl;

  return (
    <div id="section-ai-detection" className="space-y-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" />
            <span>Python Gemini Vision AI Subsystem</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">AI Accessibility Feature & Barrier Detection</h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated barrier & ramp detection powered by Python FastAPI & Gemini Vision AI.</p>
        </div>

        <div className="flex items-center space-x-2 bg-purple-50 text-purple-800 font-bold px-3.5 py-2 rounded-xl border border-purple-200 text-xs">
          <Zap className="w-4 h-4 text-purple-600" />
          <span>Python Backend Port 8000 Connected</span>
        </div>
      </div>

      {/* Pipeline Status Indicator */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Detection Pipeline</span>
          <span className="text-xs text-slate-400 font-mono">POST /api/detect → FastAPI (Port 8000)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
          <div className={`p-4 rounded-xl border flex items-center space-x-3 ${uploadedImage ? 'bg-purple-900/40 border-purple-500 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <span className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">1</span>
            <div>
              <div>Image Upload</div>
              <div className="text-[10px] font-normal text-slate-400">Photograph ingestion</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center space-x-3 ${isAnalyzing ? 'bg-amber-900/40 border-amber-500 text-amber-200 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <span className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center font-bold text-white text-xs">2</span>
            <div>
              <div>Gemini AI Vision Analysis</div>
              <div className="text-[10px] font-normal text-slate-400">Spatial Bounding Box inference</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center space-x-3 ${!isAnalyzing && detectionResult ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">3</span>
            <div>
              <div>Detected Classification</div>
              <div className="text-[10px] font-normal text-slate-400">Feature export to Digital Twin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio: Bounding Box Canvas + Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bounding Box Image Overlay Canvas */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold uppercase tracking-wider text-purple-400 flex items-center">
              <Eye className="w-4 h-4 mr-1.5" />
              Vision Analysis Viewport
            </span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-300">
              {detectionResult.detectedObjects.length} Objects Detected
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
            {isAnalyzing ? (
              <div className="space-y-3 text-center">
                <Cpu className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
                <p className="text-xs text-purple-300 font-semibold">Running Python Gemini Vision Model...</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={activeImage}
                  alt="Detection Target"
                  className="w-full h-full object-cover"
                />

                {/* Bounding Box Overlays */}
                {(detectionResult.detectedObjects || []).map((obj) => {
                  const [x1, y1, x2, y2] = obj.bbox;
                  const isAccessible = obj.status === 'working';
                  return (
                    <div
                      key={obj.id}
                      style={{
                        left: `${x1}%`,
                        top: `${y1}%`,
                        width: `${x2 - x1}%`,
                        height: `${y2 - y1}%`
                      }}
                      className={`absolute border-2 rounded-lg shadow-lg transition-transform hover:scale-105 ${
                        isAccessible ? 'border-emerald-400 bg-emerald-500/20' : 'border-rose-500 bg-rose-500/20'
                      }`}
                    >
                      <span className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md uppercase tracking-wider whitespace-nowrap ${
                        isAccessible ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        {obj.label} ({obj.confidence}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-2">
            <span className="font-bold text-white">AI Vision Analysis Summary:</span>
            <p className="text-slate-400">{detectionResult.summary}</p>
            
            {/* Voice Guidance Button */}
            {voiceMessage && (
              <button
                onClick={handleSpeakVoice}
                className="mt-2 flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>🔊 Play Voice Guidance</span>
              </button>
            )}
          </div>
        </div>

        {/* Upload & Detected Object Table Sidebar */}
        <div className="space-y-6">
          {/* Custom Photo Upload Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Test Your Own Photograph</h3>
            
            <label htmlFor="input-ai-custom-upload" className="block cursor-pointer">
              <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/50 hover:bg-purple-50 transition-all rounded-2xl p-5 text-center space-y-2">
                <Upload className="w-8 h-8 text-purple-600 mx-auto" />
                <span className="text-xs font-bold text-purple-900 block">Upload Building Photograph</span>
                <span className="text-[11px] text-slate-500 block">Analyze with Python Gemini AI</span>
              </div>
              <input
                id="input-ai-custom-upload"
                type="file"
                accept="image/*"
                onChange={handleCustomUpload}
                className="hidden"
              />
            </label>

            {/* DEMO PRESETS BUTTONS RESTORED */}
            <span className="text-[11px] text-slate-400 block text-center uppercase tracking-wider font-bold">Or Select Demo Presets</span>

            <div className="grid grid-cols-2 gap-2">
              {MOCK_AI_DETECTION_SAMPLES.map((sample, idx) => (
                <button
                  key={sample.imageId}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    selectedSample.imageId === sample.imageId && !uploadedImage
                      ? 'border-purple-600 bg-purple-50 font-bold text-purple-900 ring-2 ring-purple-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">Preset #{idx + 1}</div>
                  <div className="text-[10px] text-slate-500 truncate">{sample.detectedObjects[0]?.label || 'Sample'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Backend Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Detected Features Breakdown List */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Detected Features</h3>
              <span className="text-xs text-slate-500">{detectionResult.detectedObjects.length} identified</span>
            </div>

            {exportSuccess && (
              <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-200">
                ✓ {exportSuccess}
              </div>
            )}

            <div className="space-y-3">
              {(detectionResult.detectedObjects || []).map((obj) => (
                <div key={obj.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{obj.label}</span>
                    <span className="font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-[11px]">
                      {obj.confidence}% Match
                    </span>
                  </div>

                  {obj.recommendation && (
                    <p className="text-[11px] text-slate-600">{obj.recommendation}</p>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      obj.status === 'working' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {obj.status === 'working' ? 'Accessible' : 'Barrier Detected'}
                    </span>

                    <button
                      id={`btn-add-feature-${obj.id}`}
                      type="button"
                      onClick={() => {
                        if (onAddDetectedFeatureToTwin) {
                          onAddDetectedFeatureToTwin(obj.label, obj.type, obj.confidence);
                          setExportSuccess(`Added "${obj.label}" directly to Digital Twin Map!`);
                          setTimeout(() => setExportSuccess(null), 4000);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Twin Map</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};