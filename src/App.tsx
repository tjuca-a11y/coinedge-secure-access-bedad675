import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { SalesRepAuthProvider } from "@/contexts/SalesRepAuthContext";
import { MerchantAuthProvider } from "@/contexts/MerchantAuthContext";
import { DynamicProvider } from "@/providers/DynamicProvider";
import { DynamicWalletProvider } from "@/contexts/DynamicWalletContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { SalesRepProtectedRoute } from "@/components/sales-rep/SalesRepProtectedRoute";
import { MerchantProtectedRoute } from "@/components/merchant/MerchantProtectedRoute";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Kyc from "./pages/Kyc";
import Activity from "./pages/Activity";
import Wallet from "./pages/Wallet";
import SendRequest from "./pages/SendRequest";
import Settings from "./pages/Settings";
import IdentityVerification from "./pages/IdentityVerification";
import Redeem from "./pages/Redeem";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSalesReps from "./pages/admin/AdminSalesReps";
import AdminMerchants from "./pages/admin/AdminMerchants";
import AdminBitcards from "./pages/admin/AdminBitcards";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminMap from "./pages/admin/AdminMap";
import AdminInventoryDashboard from "./pages/admin/AdminInventoryDashboard";
import AdminInventoryLots from "./pages/admin/AdminInventoryLots";
import AdminFulfillmentQueue from "./pages/admin/AdminFulfillmentQueue";
import AdminSystemControls from "./pages/admin/AdminSystemControls";
import AdminSwapOrders from "./pages/admin/AdminSwapOrders";
import AdminTreasuryDashboard from "./pages/admin/AdminTreasuryDashboard";
import AdminReconciliation from "./pages/admin/AdminReconciliation";

// Sales Rep pages
import SalesRepLogin from "./pages/sales-rep/SalesRepLogin";
import SalesRepResetPassword from "./pages/sales-rep/SalesRepResetPassword";
import SalesRepDashboard from "./pages/sales-rep/SalesRepDashboard";
import SalesRepMerchants from "./pages/sales-rep/SalesRepMerchants";
import SalesRepMerchantDetail from "./pages/sales-rep/SalesRepMerchantDetail";
import SalesRepAddMerchant from "./pages/sales-rep/SalesRepAddMerchant";
import SalesRepCommissions from "./pages/sales-rep/SalesRepCommissions";
import SalesRepMap from "./pages/sales-rep/SalesRepMap";
import SalesRepSettings from "./pages/sales-rep/SalesRepSettings";

// Merchant pages
import MerchantLogin from "./pages/merchant/MerchantLogin";
import MerchantResetPassword from "./pages/merchant/MerchantResetPassword";
import MerchantAdminDashboard from "./pages/merchant/admin/MerchantAdminDashboard";
import MerchantAddBalance from "./pages/merchant/admin/MerchantAddBalance";
import MerchantOrderCards from "./pages/merchant/admin/MerchantOrderCards";
import MerchantOrders from "./pages/merchant/admin/MerchantOrders";
import MerchantCashiers from "./pages/merchant/admin/MerchantCashiers";
import MerchantSettings from "./pages/merchant/admin/MerchantSettings";
import MerchantCashierPOS from "./pages/merchant/MerchantCashierPOS";
import MerchantActivationHistory from "./pages/merchant/MerchantActivationHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DynamicProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
            <Route path="/admin/*" element={
              <AdminAuthProvider>
                <Routes>
                  <Route path="dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                  <Route path="sales-reps" element={<AdminProtectedRoute><AdminSalesReps /></AdminProtectedRoute>} />
                  <Route path="merchants" element={<AdminProtectedRoute><AdminMerchants /></AdminProtectedRoute>} />
                  <Route path="bitcards" element={<AdminProtectedRoute><AdminBitcards /></AdminProtectedRoute>} />
                  <Route path="commissions" element={<AdminProtectedRoute><AdminCommissions /></AdminProtectedRoute>} />
                  <Route path="inventory" element={<AdminProtectedRoute><AdminInventoryDashboard /></AdminProtectedRoute>} />
                  <Route path="inventory-lots" element={<AdminProtectedRoute><AdminInventoryLots /></AdminProtectedRoute>} />
                  <Route path="fulfillment" element={<AdminProtectedRoute><AdminFulfillmentQueue /></AdminProtectedRoute>} />
                  <Route path="swap-orders" element={<AdminProtectedRoute><AdminSwapOrders /></AdminProtectedRoute>} />
                  <Route path="treasury" element={<AdminProtectedRoute><AdminTreasuryDashboard /></AdminProtectedRoute>} />
                  <Route path="reconciliation" element={<AdminProtectedRoute><AdminReconciliation /></AdminProtectedRoute>} />
                  <Route path="system-controls" element={<AdminProtectedRoute requireSuperAdmin><AdminSystemControls /></AdminProtectedRoute>} />
                  <Route path="audit-logs" element={<AdminProtectedRoute><AdminAuditLogs /></AdminProtectedRoute>} />
                  <Route path="map" element={<AdminProtectedRoute><AdminMap /></AdminProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
              </AdminAuthProvider>
            } />

            {/* Sales Rep Routes */}
            <Route path="/rep/login" element={<SalesRepAuthProvider><SalesRepLogin /></SalesRepAuthProvider>} />
            <Route path="/rep/*" element={
              <SalesRepAuthProvider>
                <Routes>
                  <Route path="reset-password" element={<SalesRepResetPassword />} />
                  <Route path="dashboard" element={<SalesRepProtectedRoute><SalesRepDashboard /></SalesRepProtectedRoute>} />
                  <Route path="merchants" element={<SalesRepProtectedRoute><SalesRepMerchants /></SalesRepProtectedRoute>} />
                  <Route path="merchants/:id" element={<SalesRepProtectedRoute><SalesRepMerchantDetail /></SalesRepProtectedRoute>} />
                  <Route path="add-merchant" element={<SalesRepProtectedRoute><SalesRepAddMerchant /></SalesRepProtectedRoute>} />
                  <Route path="commissions" element={<SalesRepProtectedRoute><SalesRepCommissions /></SalesRepProtectedRoute>} />
                  <Route path="map" element={<SalesRepProtectedRoute><SalesRepMap /></SalesRepProtectedRoute>} />
                  <Route path="settings" element={<SalesRepProtectedRoute><SalesRepSettings /></SalesRepProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/rep/dashboard" replace />} />
                </Routes>
              </SalesRepAuthProvider>
            } />

            {/* Merchant Routes */}
            <Route path="/merchant/login" element={<MerchantAuthProvider><MerchantLogin /></MerchantAuthProvider>} />
            <Route path="/merchant/*" element={
              <MerchantAuthProvider>
                <Routes>
                  <Route path="reset-password" element={<MerchantResetPassword />} />
                  <Route path="admin/dashboard" element={<MerchantProtectedRoute requireAdmin><MerchantAdminDashboard /></MerchantProtectedRoute>} />
                  <Route path="admin/add-balance" element={<MerchantProtectedRoute requireAdmin><MerchantAddBalance /></MerchantProtectedRoute>} />
                  <Route path="admin/order-cards" element={<MerchantProtectedRoute requireAdmin><MerchantOrderCards /></MerchantProtectedRoute>} />
                  <Route path="admin/orders" element={<MerchantProtectedRoute requireAdmin><MerchantOrders /></MerchantProtectedRoute>} />
                  <Route path="admin/cashiers" element={<MerchantProtectedRoute requireAdmin><MerchantCashiers /></MerchantProtectedRoute>} />
                  <Route path="admin/settings" element={<MerchantProtectedRoute requireAdmin><MerchantSettings /></MerchantProtectedRoute>} />
                  <Route path="cashier" element={<MerchantProtectedRoute><MerchantCashierPOS /></MerchantProtectedRoute>} />
                  <Route path="history" element={<MerchantProtectedRoute><MerchantActivationHistory /></MerchantProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/merchant/cashier" replace />} />
                </Routes>
              </MerchantAuthProvider>
            } />

            {/* Customer Routes */}
            <Route path="/*" element={
              <AuthProvider>
                <DynamicWalletProvider>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/kyc" element={<Kyc />} />
                    <Route path="/" element={<ProtectedRoute><Navigate to="/activity" replace /></ProtectedRoute>} />
                    <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
                    <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
                    <Route path="/send" element={<ProtectedRoute><SendRequest /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/settings/identity-verification" element={<ProtectedRoute><IdentityVerification /></ProtectedRoute>} />
                    <Route path="/redeem" element={<ProtectedRoute><Redeem /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </DynamicWalletProvider>
              </AuthProvider>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DynamicProvider>
  </QueryClientProvider>
);

export default App;
