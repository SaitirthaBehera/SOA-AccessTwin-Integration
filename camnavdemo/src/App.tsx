import React, { useState, useEffect } from 'react';
import { Building, AccessibilityFeature, AccessibilityReport, Recommendation, RouteResult } from './types';
import { api } from './services/api';
import { MOCK_BUILDINGS, MOCK_FEATURES, MOCK_REPORTS, MOCK_RECOMMENDATIONS } from './data/mockData';
import { supabase, isSupabaseConfigured, signOutAdminFromSupabase, checkIsAdminUser } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeDashboard } from './components/HomeDashboard';
import { DigitalTwinMap } from './components/DigitalTwinMap';
import { ReportIssue } from './components/ReportIssue';
import { AiDetection } from './components/AiDetection';
import { AccessibleNavigation } from './components/AccessibleNavigation';
import { AdminDashboard } from './components/AdminDashboard';
import { BuildingScoreCard } from './components/BuildingScoreCard';
import { HowItWorksModal } from './components/HowItWorksModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [buildings, setBuildings] = useState<Building[]>(MOCK_BUILDINGS);
  const [selectedBuilding, setSelectedBuilding] = useState<Building>(MOCK_BUILDINGS[0]);
  const [features, setFeatures] = useState<AccessibilityFeature[]>(MOCK_FEATURES);
  const [reports, setReports] = useState<AccessibilityReport[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);

  const [prefilledLocation, setPrefilledLocation] = useState<{ buildingId: string; floorId: number; x: number; y: number } | null>(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Initialize Supabase Auth state listener and check active session
  useEffect(() => {
    async function checkAdminAuth() {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const isAdmin = await checkIsAdminUser(data.session.user.id, data.session.user.email);
            setIsAdminLoggedIn(isAdmin);
            return;
          }
        } catch (e) {
          console.warn('Supabase session check error:', e);
        }
      }
      setIsAdminLoggedIn(false);
    }

    checkAdminAuth();

    // Subscribe to Supabase Auth state changes
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const isAdmin = await checkIsAdminUser(session.user.id, session.user.email);
          setIsAdminLoggedIn(isAdmin);
        } else {
          setIsAdminLoggedIn(false);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const handleLoginAdmin = () => {
    setIsAdminLoggedIn(true);
  };

  const handleLogoutAdmin = async () => {
    await signOutAdminFromSupabase();
    setIsAdminLoggedIn(false);
    setActiveTab('admin');
  };

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      const bList = await api.getBuildings();
      if (bList && bList.length > 0) {
        setBuildings(bList);
        setSelectedBuilding(bList[0]);
      }
      const fList = await api.getFeatures(bList[0]?.id || 'bldg-iter-main');
      if (fList) setFeatures(fList);

      const rList = await api.getReports();
      if (rList) setReports(rList);

      const recList = await api.getRecommendations();
      if (recList) setRecommendations(recList);
    }
    loadInitialData();
  }, []);

  // Update features whenever selected building changes
  useEffect(() => {
    async function updateFeatures() {
      const fList = await api.getFeatures(selectedBuilding.id);
      if (fList) setFeatures(fList);
    }
    updateFeatures();
  }, [selectedBuilding]);

  const handleReportIssueAtLocation = (bId: string, floorId: number, x: number, y: number) => {
    setPrefilledLocation({ buildingId: bId, floorId, x, y });
    setActiveTab('report-issue');
  };

  const handleReportSubmitted = (newReport: AccessibilityReport) => {
    setReports(prev => {
      const idx = prev.findIndex(r => r.id === newReport.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = newReport;
        return updated;
      }
      return [newReport, ...prev];
    });
  };

  const handleReportVerified = (reportId: string, status: 'admin_verified' | 'rejected', notes?: string) => {
    const isVerified = status === 'admin_verified';
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status: isVerified ? 'verified' : 'rejected',
          resolutionStatus: 'pending',
          verificationStatus: isVerified ? 'admin_verified' : 'rejected',
          confidenceScore: isVerified ? 100 : 0,
          confidenceLevel: isVerified ? 'HIGH' : 'LOW',
          adminNotes: notes,
          rejectionNote: !isVerified ? notes : r.rejectionNote,
        };
      }
      return r;
    }));

    // If verified as accessible or barrier, update matching feature confidence
    const rep = reports.find(r => r.id === reportId);
    if (rep && status === 'admin_verified') {
      setFeatures(prev => prev.map(f => {
        if (f.buildingId === rep.buildingId && f.floorId === rep.floorId && f.name === rep.featureName) {
          return {
            ...f,
            verificationStatus: 'admin_verified',
            confidenceScore: 100,
            confidenceLevel: 'HIGH',
          };
        }
        return f;
      }));
    }
  };

  const handleReportResolved = (reportId: string) => {
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status: 'resolved',
          resolutionStatus: 'resolved',
          verificationStatus: 'admin_verified',
          confidenceScore: 100,
          confidenceLevel: 'HIGH',
        };
      }
      return r;
    }));

    const rep = reports.find(r => r.id === reportId);
    if (rep) {
      setFeatures(prev => prev.map(f => {
        if (f.buildingId === rep.buildingId && f.floorId === rep.floorId && f.name === rep.featureName) {
          return {
            ...f,
            verificationStatus: 'admin_verified',
            confidenceScore: 100,
            confidenceLevel: 'HIGH',
            status: 'working'
          };
        }
        return f;
      }));
    }
  };

  const handleAddDetectedFeatureToTwin = (label: string, type: any, confidence: number) => {
    const newFeature: AccessibilityFeature = {
      id: `feat-ai-${Date.now()}`,
      buildingId: selectedBuilding.id,
      floorId: 0,
      name: `${label} (AI Detected)`,
      type: type || 'ramp',
      status: 'working',
      x: 45 + Math.floor(Math.random() * 20),
      y: 45 + Math.floor(Math.random() * 20),
      description: `Automatically identified from uploaded photo with ${confidence}% confidence score by computer vision pipeline.`,
      confidenceScore: confidence,
      confidenceLevel: confidence >= 70 ? 'HIGH' : 'MEDIUM',
      verificationStatus: 'community_verified',
      lastUpdated: new Date().toISOString().split('T')[0],
      upvotes: 1
    };

    setFeatures(prev => [newFeature, ...prev]);
  };

  const handleRecommendationStatusUpdated = (recId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: newStatus } : r));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedBuilding={selectedBuilding}
        buildings={buildings}
        onSelectBuilding={(b) => setSelectedBuilding(b)}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Content Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <HomeDashboard
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            reports={reports}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'digital-twin' && (
          <DigitalTwinMap
            building={selectedBuilding}
            features={features}
            activeRoute={activeRoute}
            onReportIssueAtLocation={handleReportIssueAtLocation}
            onOpenReportTab={() => setActiveTab('report-issue')}
            onNavigateToRoute={() => setActiveTab('navigation')}
          />
        )}

        {activeTab === 'report-issue' && (
          <ReportIssue
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            reports={reports}
            onReportSubmitted={handleReportSubmitted}
            prefilledLocation={prefilledLocation}
          />
        )}

        {activeTab === 'ai-detection' && (
          <AiDetection
            onAddDetectedFeatureToTwin={handleAddDetectedFeatureToTwin}
          />
        )}

        {activeTab === 'navigation' && (
          <AccessibleNavigation
            building={selectedBuilding}
            onRouteCalculated={(route) => setActiveRoute(route)}
            onViewOnDigitalTwin={() => setActiveTab('digital-twin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            reports={reports}
            buildings={buildings}
            recommendations={recommendations}
            onReportVerified={handleReportVerified}
            onReportResolved={handleReportResolved}
            onRecommendationStatusUpdated={handleRecommendationStatusUpdated}
            isAdminLoggedIn={isAdminLoggedIn}
            onLoginAdmin={handleLoginAdmin}
            onLogoutAdmin={handleLogoutAdmin}
            onCancelLogin={() => setActiveTab('dashboard')}
            defaultSubTab="audit-queue"
          />
        )}

        {activeTab === 'recommendations' && (
          <AdminDashboard
            reports={reports}
            buildings={buildings}
            recommendations={recommendations}
            onReportVerified={handleReportVerified}
            onReportResolved={handleReportResolved}
            onRecommendationStatusUpdated={handleRecommendationStatusUpdated}
            isAdminLoggedIn={isAdminLoggedIn}
            onLoginAdmin={handleLoginAdmin}
            onLogoutAdmin={handleLogoutAdmin}
            onCancelLogin={() => setActiveTab('dashboard')}
            defaultSubTab="fix-suggestions"
          />
        )}

        {activeTab === 'score' && (
          <BuildingScoreCard
            building={selectedBuilding}
            allBuildings={buildings}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            isAdminLoggedIn={isAdminLoggedIn}
            onNavigateToRecommendations={() => {
              if (isAdminLoggedIn) {
                setActiveTab('recommendations');
              } else {
                setActiveTab('admin');
              }
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onOpenAdminLogin={() => setActiveTab('admin')} />

      {/* Educational How It Works Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
}
