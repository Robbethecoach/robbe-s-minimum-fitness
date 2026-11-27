import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import WeeklyOverview from "./pages/WeeklyOverview";
import ContentLibrary from "./pages/ContentLibrary";
import Fuel from "./pages/Fuel";
import HowIEat from "./pages/HowIEat";
import WhatIEat from "./pages/WhatIEat";
import TheChain from "./pages/TheChain";
import Move from "./pages/Move";
import Onboarding from "./pages/Onboarding";
import Think from "./pages/Think";
import NotFound from "./pages/NotFound";
import FeedLibrary from "./pages/feed/FeedLibrary";
import FeedBlocks from "./pages/feed/FeedBlocks";
import BlockOverview from "./pages/BlockOverview";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/fuel" element={<Fuel />} />
            <Route path="/fuel/how-i-eat" element={<HowIEat />} />
            <Route path="/fuel/what-i-eat" element={<ProtectedRoute><WhatIEat /></ProtectedRoute>} />
            <Route path="/move" element={<ProtectedRoute><Move /></ProtectedRoute>} />
            <Route path="/chain" element={<ProtectedRoute><TheChain /></ProtectedRoute>} />
            <Route path="/think" element={<ProtectedRoute><Think /></ProtectedRoute>} />
            <Route path="/weekly" element={<ProtectedRoute><WeeklyOverview /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
            <Route path="/move/overview" element={<ProtectedRoute><BlockOverview /></ProtectedRoute>} />
            <Route path="/feed" element={<Navigate to="/feed/library" replace />} />
            <Route path="/feed/library" element={<AdminRoute><FeedLibrary /></AdminRoute>} />
            <Route path="/feed/blocks" element={<AdminRoute><FeedBlocks /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
