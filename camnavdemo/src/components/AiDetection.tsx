import React, { useState } from 'react';
import { AiDetectionResult, Building, AccessibilityFeature } from '../types';
import { api } from '../services/api';
import { navigationApi, VisionDetectionResponse } from '../services/navigationApi';
import { MOCK_AI_DETECTION_SAMPLES, MOCK_BUILDINGS } from '../data/mockData';
import { 
  Scan, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Sparkles, 
  Plus, 
  Eye, 
  Zap,
  ArrowRight,
  Volume2,
  VolumeX,
  Radio,
  Server,
  Building2,
  Layers,
  X,
  Loader2,
  Check,
  ShieldAlert
} from 'lucide-react';

interface DetectedFeatureItem {
  id: string;
  label: string;
  type: string;
  confidence: number;
  bbox: [number, number, number, number];
  status: 'working' | 'broken';
  recommendation: string;
}

interface AiDetectionProps {
  isAdmin?: boolean;
  buildings?: Building[];
  onFeatureAddedToTwin?: (newFeature: AccessibilityFeature) => void;
  onAddDetectedFeatureToTwin?: (featureName: string, featureType: string, confidence: number) => void;
}

export const AiDetection: React.FC<AiDetectionProps> = ({ 
  isAdmin = false,
  buildings = MOCK_BUILDINGS,
  onFeatureAddedToTwin,
  onAddDetectedFeatureToTwin 
}) => {
  const [selectedSample, setSelectedSample] = useState<AiDetectionResult | null>(MOCK_AI_DETECTION_SAMPLES[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<AiDetectionResult>(MOCK_AI_DETECTION_SAMPLES[0]);
  const [fastApiVoiceMessage, setFastApiVoiceMessage] = useState<string | null>(null);
  const [isFastApiVerified, setIsFastApiVerified] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const uploadRequestIdRef = React.useRef<number>(0);

  // Twin Map Modal State (Admin Only)
  const [selectedFeatureForModal, setSelectedFeatureForModal] = useState<DetectedFeatureItem | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [isSubmittingToTwin, setIsSubmittingToTwin] = useState<boolean>(false);
  const [twinModalError, setTwinModalError] = useState<string | null>(null);
  const [addedFeatureIds, setAddedFeatureIds] = useState<Set<string>>(new Set());

  // Find currently selected building for dependent floor list
  const activeModalBuilding = buildings.find(b => b.id === selectedBuildingId);
  const availableFloors = activeModalBuilding ? activeModalBuilding.floors : [];

  const handleSpeakVoice = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentRequestId = ++uploadRequestIdRef.current;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      setSelectedSample(null); // Clear preset selection
      setIsAnalyzing(true);
      setFastApiVoiceMessage(null);
      setIsFastApiVerified(false);
      setAddedFeatureIds(new Set()); // Reset added status for new upload

      // Clear previous detection results during analysis
      setDetectionResult({
        imageId: `img-${Date.now()}`,
        imageUrl: base64,
        analyzedAt: new Date().toISOString(),
        overallAccessibility: 'Moderate',
        summary: 'Analyzing image for accessibility features and physical barriers...',
        detectedObjects: []
      });

      console.log('[AI Detection] Uploaded image:', file.name, file.size, file.type);

      try {
        const res: VisionDetectionResponse = await navigationApi.detectAccessibility(file);

        if (currentRequestId !== uploadRequestIdRef.current) return;

        console.log('[AI Detection] API response:', res);

        if (res && res.status === 'success') {
          setIsFastApiVerified(true);
          setFastApiVoiceMessage(res.voice_message || null);

          // Map real detections from the backend response
          const rawItems = res.results || (res as any).detectedObjects || [];
          const detectedObjs = rawItems.map((item: any, idx: number) => {
            const label = item.class || item.label || item.type || `Accessibility Feature ${idx + 1}`;
            const conf = typeof item.confidence === 'number'
              ? (item.confidence > 1 ? Math.round(item.confidence) : Math.round(item.confidence * 100))
              : 90;
            const status = item.status === 'broken' || item.status === 'blocked' ? 'broken' : 'working';

            // Normalize bbox to percentages (0-100)
            let bbox: [number, number, number, number] = [20, 20, 80, 80];
            if (Array.isArray(item.bbox) && item.bbox.length === 4) {
              const b = item.bbox.map((v: number) => (v <= 1.0 && v > 0 ? Math.round(v * 100) : Math.round(v)));
              const scale = b.some((v: number) => v > 100) ? 10 : 1;
              const scaled = b.map((v: number) => Math.min(100, Math.max(0, Math.round(v / scale))));
              bbox = [scaled[0], scaled[1], scaled[2], scaled[3]];
            } else if (item.position === 'left') {
              bbox = [10, 20, 45, 80];
            } else if (item.position === 'right') {
              bbox = [55, 20, 90, 80];
            } else {
              bbox = [25, 20, 75, 80];
            }

            return {
              id: item.id || `det-${idx + 1}`,
              label: label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, ' '),
              type: (item.type || (label.toLowerCase().includes('ramp') ? 'ramp' : label.toLowerCase().includes('stair') ? 'stairs' : label.toLowerCase().includes('lift') ? 'lift' : label.toLowerCase().includes('tactile') ? 'tactile_path' : 'other')) as any,
              confidence: conf,
              bbox,
              status,
              recommendation: item.recommendation || (status === 'working' ? `Verified accessible feature (${label}).` : `Identified barrier (${label}) requiring attention.`)
            };
          });

          console.log('[AI Detection] Parsed detections:', detectedObjs);

          setDetectionResult({
            imageId: (res as any).imageId || `img-${Date.now()}`,
            imageUrl: base64,
            analyzedAt: (res as any).analyzedAt || new Date().toISOString(),
            overallAccessibility: (res as any).overallAccessibility || (detectedObjs.some(o => o.status === 'broken') ? 'Moderate' : 'High'),
            summary: res.summary || res.message || (detectedObjs.length > 0 ? `AI identified ${detectedObjs.length} accessibility features.` : 'No accessibility features or barriers detected in this image.'),
            detectedObjects: detectedObjs
          });
        }
      } catch (err: any) {
        if (currentRequestId !== uploadRequestIdRef.current) return;
        console.error('[AI Detection] Error during detection:', err);
        setDetectionResult({
          imageId: `img-${Date.now()}`,
          imageUrl: base64,
          analyzedAt: new Date().toISOString(),
          overallAccessibility: 'Poor',
          summary: `Analysis notice: ${err.message || 'Detection service returned an error.'}`,
          detectedObjects: []
        });
      } finally {
        if (currentRequestId === uploadRequestIdRef.current) {
          setIsAnalyzing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: AiDetectionResult) => {
    setSelectedSample(sample);
    setUploadedImage(null);
    setDetectionResult(sample);
    setFastApiVoiceMessage(null);
    setIsFastApiVerified(false);
    setAddedFeatureIds(new Set());
  };

  // Open Add to Twin Map modal for specific detected feature
  const handleOpenAddModal = (feature: DetectedFeatureItem) => {
    setSelectedFeatureForModal(feature);
    setSelectedBuildingId(buildings[0]?.id || '');
    setSelectedFloorId('');
    setTwinModalError(null);
  };

  // Handle building dropdown change
  const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBuildingId(e.target.value);
    setSelectedFloorId(''); // Reset floor selection when building changes
    setTwinModalError(null);
  };

  // Submit feature to Digital Twin Map
  const handleConfirmAddToTwin = async () => {
    if (!selectedFeatureForModal) return;
    if (!selectedBuildingId) {
      setTwinModalError('Please select a building.');
      return;
    }
    if (selectedFloorId === '' || isNaN(Number(selectedFloorId))) {
      setTwinModalError('Please select a floor for the chosen building.');
      return;
    }

    setIsSubmittingToTwin(true);
    setTwinModalError(null);

    const targetBldg = buildings.find(b => b.id === selectedBuildingId);
    const targetFloor = targetBldg?.floors.find(f => f.floorId === Number(selectedFloorId));

    try {
      const result = await api.addFeatureToTwin({
        building_id: selectedBuildingId,
        floor_id: Number(selectedFloorId),
        feature_type: selectedFeatureForModal.type,
        label: selectedFeatureForModal.label,
        confidence: selectedFeatureForModal.confidence,
        status: selectedFeatureForModal.status,
        bbox: selectedFeatureForModal.bbox,
        source: 'AI_DETECTION',
        description: selectedFeatureForModal.recommendation
      });

      // Mark this feature as added in UI
      setAddedFeatureIds(prev => new Set(prev).add(selectedFeatureForModal.id));
      
      const successMessage = `✓ ${selectedFeatureForModal.label} added to ${targetBldg?.name || 'Building'} — ${targetFloor?.name || 'Selected Floor'}`;
      setExportSuccess(successMessage);

      // Notify parent app of new feature
      if (result.feature && onFeatureAddedToTwin) {
        onFeatureAddedToTwin(result.feature);
      } else if (onAddDetectedFeatureToTwin) {
        onAddDetectedFeatureToTwin(selectedFeatureForModal.label, selectedFeatureForModal.type, selectedFeatureForModal.confidence);
      }

      // Close modal
      setSelectedFeatureForModal(null);

      // Auto dismiss success toast after 5 seconds
      setTimeout(() => {
        setExportSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('[AI Detection] Failed to add feature to Twin Map:', err);
      setTwinModalError(err.message || 'Failed to save feature to Twin Map. Please verify admin privileges.');
    } finally {
      setIsSubmittingToTwin(false);
    }
  };

  const activeImage = uploadedImage || detectionResult.imageUrl || selectedSample?.imageUrl || MOCK_AI_DETECTION_SAMPLES[0].imageUrl;

  return (
    <div id="section-ai-detection" className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" />
            <span>Computer Vision & Deep Learning Subsystem</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">AI Accessibility Feature & Barrier Detection</h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated visual inference using FastAPI YOLOv8 object identification and Gemini multimodal vision models.</p>
        </div>

        <div className="flex items-center space-x-2 bg-purple-50 text-purple-800 font-bold px-3.5 py-2 rounded-xl border border-purple-200 text-xs">
          <Zap className="w-4 h-4 text-purple-600" />
          <span>FastAPI /api/detect Endpoint</span>
        </div>
      </div>

      {/* Pipeline Status Indicator */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Detection Pipeline</span>
          <span className="text-xs text-slate-400 font-mono">POST /api/detect (multipart/form-data)</span>
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
              <div>YOLOv8 & Gemini Vision</div>
              <div className="text-[10px] font-normal text-slate-400">Spatial boundary & barrier classification</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center space-x-3 ${!isAnalyzing && detectionResult ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">3</span>
            <div>
              <div>Verified Classification</div>
              <div className="text-[10px] font-normal text-slate-400">
                {isAdmin ? 'Admin Twin Map Integration' : 'Visual Accessibility Inspection'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Message Notification (if returned by FastAPI) */}
      {fastApiVoiceMessage && (
        <div className="bg-purple-50 border border-purple-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-purple-900">
              <Radio className="w-4 h-4 text-purple-700" />
              <span>FastAPI Vision Audio Feedback</span>
            </div>
            <p className="text-xs text-purple-950 font-medium italic">
              &quot;{fastApiVoiceMessage}&quot;
            </p>
          </div>

          <button
            id="btn-speak-ai-detection"
            type="button"
            onClick={() => handleSpeakVoice(fastApiVoiceMessage)}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 cursor-pointer transition-all shrink-0 ${
              isSpeaking ? 'bg-rose-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Listen Audio</span>
              </>
            )}
          </button>
        </div>
      )}

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
                <p className="text-xs text-purple-300 font-semibold">Running Neural Vision & YOLOv8 Inference...</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={activeImage}
                  alt="Detection Target"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Bounding Box Overlays */}
                {detectionResult.detectedObjects.map((obj) => {
                  const [b0, b1, b2, b3] = obj.bbox;
                  const isAccessible = obj.status === 'working';
                  const left = Math.max(2, Math.min(Math.min(b0, b2), 80));
                  const top = Math.max(2, Math.min(Math.min(b1, b3), 80));
                  const width = Math.max(15, Math.min(Math.abs(b2 - b0), 96 - left));
                  const height = Math.max(12, Math.min(Math.abs(b3 - b1), 96 - top));

                  return (
                    <div
                      key={obj.id}
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${width}%`,
                        height: `${height}%`
                      }}
                      className={`absolute border-2 rounded-lg shadow-lg transition-transform hover:scale-105 ${
                        isAccessible ? 'border-emerald-400 bg-emerald-500/20' : 'border-rose-500 bg-rose-500/20'
                      }`}
                    >
                      {/* Bounding Box Badge */}
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

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
            <span className="font-bold text-white">AI Vision Analysis Summary:</span>
            <p className="text-slate-400">{detectionResult.summary}</p>
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
                <span className="text-xs font-bold text-purple-900 block">Upload Campus Infrastructure Photo</span>
                <span className="text-[11px] text-slate-500 block">Automatically analyze ramp, elevator, stairs or doors</span>
              </div>
              <input
                id="input-ai-custom-upload"
                type="file"
                accept="image/*"
                onChange={handleCustomUpload}
                className="hidden"
              />
            </label>

            <span className="text-[11px] text-slate-400 block text-center uppercase tracking-wider font-bold">Or Select Demo Presets</span>

            <div className="grid grid-cols-2 gap-2">
              {MOCK_AI_DETECTION_SAMPLES.map((sample, idx) => (
                <button
                  key={sample.imageId}
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    selectedSample?.imageId === sample.imageId && !uploadedImage
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

          {/* Detected Features Breakdown List */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Detected Features</h3>
              <span className="text-xs text-slate-500">{detectionResult.detectedObjects.length} identified</span>
            </div>

            {exportSuccess && (
              <div id="msg-twin-export-success" className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{exportSuccess}</span>
              </div>
            )}

            <div className="space-y-3">
              {detectionResult.detectedObjects.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No features detected. Upload an image to start detection.
                </div>
              ) : (
                detectionResult.detectedObjects.map((obj) => {
                  const isAdded = addedFeatureIds.has(obj.id);

                  return (
                    <div key={obj.id} id={`card-detected-feature-${obj.id}`} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{obj.label}</span>
                        <span className="font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-[11px]">
                          {obj.confidence}% Match
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600">{obj.recommendation}</p>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          obj.status === 'working' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {obj.status === 'working' ? 'Accessible' : 'Barrier Detected'}
                        </span>

                        {/* Admin-only "Add to Twin Map" Action */}
                        {isAdmin && (
                          isAdded ? (
                            <span 
                              id={`badge-added-twin-${obj.id}`}
                              className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Added to Twin</span>
                            </span>
                          ) : (
                            <button
                              id={`btn-add-feature-${obj.id}`}
                              type="button"
                              onClick={() => handleOpenAddModal(obj as DetectedFeatureItem)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Twin Map</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN DIALOG / MODAL: Add Feature to Twin Map */}
      {isAdmin && selectedFeatureForModal && (
        <div 
          id="modal-add-to-twin-backdrop"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingToTwin) {
              setSelectedFeatureForModal(null);
            }
          }}
        >
          <div 
            id="modal-add-to-twin"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-add-to-twin-title"
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-add-to-twin-title" className="text-base font-bold text-slate-900">
                    Add Feature to Twin Map
                  </h3>
                  <p className="text-xs text-slate-500">
                    Link AI detection directly to campus spatial map
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-modal-close"
                onClick={() => setSelectedFeatureForModal(null)}
                disabled={isSubmittingToTwin}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notification inside modal */}
            {twinModalError && (
              <div id="modal-error-alert" className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{twinModalError}</div>
              </div>
            )}

            {/* Pre-populated Detected Feature Information */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Detected Feature Details
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{selectedFeatureForModal.label}</span>
                <span className="font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-xs">
                  {selectedFeatureForModal.confidence}% Match
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedFeatureForModal.status === 'working' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedFeatureForModal.status === 'working' ? 'Accessible' : 'Barrier'}
                </span>
                <span className="text-slate-500 text-[11px]">Type: {selectedFeatureForModal.type}</span>
              </div>

              {selectedFeatureForModal.recommendation && (
                <p className="text-[11px] text-slate-600 italic">
                  {selectedFeatureForModal.recommendation}
                </p>
              )}
            </div>

            {/* Building and Floor Selector */}
            <div className="space-y-4">
              {/* Building Selector */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="select-twin-modal-building" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Building <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="select-twin-modal-building"
                    value={selectedBuildingId}
                    onChange={handleBuildingChange}
                    disabled={isSubmittingToTwin}
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold cursor-pointer outline-none transition-all"
                  >
                    <option value="">-- Select Building --</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Floor Selector (Dynamically populated from chosen building) */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="select-twin-modal-floor" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Floor <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="select-twin-modal-floor"
                    value={selectedFloorId}
                    onChange={(e) => {
                      setSelectedFloorId(e.target.value);
                      setTwinModalError(null);
                    }}
                    disabled={!selectedBuildingId || isSubmittingToTwin}
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold cursor-pointer outline-none transition-all"
                  >
                    <option value="">
                      {selectedBuildingId ? '-- Select Floor --' : '-- Select a Building First --'}
                    </option>
                    {availableFloors.map(floor => (
                      <option key={floor.floorId} value={floor.floorId}>
                        {floor.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!selectedBuildingId && (
                  <p className="text-[10px] text-slate-400">
                    Select a building to view its available floors.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                id="btn-twin-modal-cancel"
                onClick={() => setSelectedFeatureForModal(null)}
                disabled={isSubmittingToTwin}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-twin-modal-confirm"
                onClick={handleConfirmAddToTwin}
                disabled={!selectedBuildingId || selectedFloorId === '' || isSubmittingToTwin}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20"
              >
                {isSubmittingToTwin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add to Twin Map</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};