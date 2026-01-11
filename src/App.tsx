import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Kyc from "./pages/Kyc";
import Activity from "./pages/Activity";
import Wallet from "./pages/Wallet";
import PayRequest from "./pages/PayRequest";
import Settings from "./pages/Settings";
import IdentityVerification from "./pages/IdentityVerification";
import Redeem from "./pages/Redeem";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/kyc" element={<Kyc />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/activity" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <Activity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pay"
              element={
                <ProtectedRoute>
                  <PayRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/identity-verification"
              element={
                <ProtectedRoute>
                  <IdentityVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/redeem"
              element={
                <ProtectedRoute>
                  <Redeem />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
