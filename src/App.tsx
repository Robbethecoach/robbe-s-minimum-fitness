import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import WeeklyOverview from "./pages/WeeklyOverview";
import ContentLibrary from "./pages/ContentLibrary";
import Fuel from "./pages/Fuel";
import HowIEat from "./pages/HowIEat";
import WhatIEat from "./pages/WhatIEat";
import NotFound from "./pages/NotFound";

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
            <Route path="/fuel" element={<Fuel />} />
            <Route path="/fuel/how-i-eat" element={<HowIEat />} />
            <Route path="/fuel/what-i-eat" element={<ProtectedRoute><WhatIEat /></ProtectedRoute>} />
            <Route path="/weekly" element={<ProtectedRoute><WeeklyOverview /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
