// Updated App.jsx with fixed routing
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './contexts/WalletContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ClientLayout from './pages/layout/ClientLayout';
import InstitutionLayout from './pages/layout/InstitutionLayout';
import ClientDashboard from './pages/Client/ClientDashboard';
import ClientDocument from './pages/Client/ClientDocument';
import ClientProfile from './pages/Client/ClientProfile';
import ClientSettings from './pages/Client/ClientSettings';
import InstitutionDashboard from './pages/Institution/InstitutionDashboard';
import InstitutionSettings from './pages/Institution/InstitutionSettings';
import PendingVerification from './pages/Institution/verification/PendingVerification';
import VerificationDocument from './pages/Institution/verification/VerificationDocument';
import VerificationHistory from './pages/Institution/verification/VerificationHistory';
import Clients from './pages/Institution/Clients';
import VerifiedDocument from './pages/Institution/verification/VerifiedDocument';
import StatusPage from './pages/verification/StatusPage';
import AddVerifier from './pages/Institution/verification/AddVerifier';
import { NotificationProvider } from './contexts/NotificationContext'

function App() {
  return (
    <WalletProvider>
     <NotificationProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Client Routes */}
          <Route path="/client" element={<ClientLayout />}>
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="documents" element={<ClientDocument />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="settings" element={<ClientSettings />} />
          </Route>

          {/* Institution Routes */}
          <Route path="/institution" element={<InstitutionLayout />}>
            <Route path="dashboard" element={<InstitutionDashboard />} />
            <Route path="pending" element={<PendingVerification />} />
            <Route path="verification" element={<VerificationDocument />} />
            {/* Fixed route - Add :id as a parameter */}
            <Route path="verification/:id" element={<VerificationDocument />} />
            <Route path="history" element={<VerificationHistory />} />
            <Route path="verified" element={<VerifiedDocument />} />
            <Route path="settings" element={<InstitutionSettings />} />
            <Route path="clients" element={<Clients />} />
            <Route path="status" element={<StatusPage />} />
            <Route path="blockchain-status" element={<StatusPage />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin" element={<InstitutionLayout />}>
            <Route path="add-verifier" element={<AddVerifier />} />
          </Route>

          {/* Redirect root to login */}
          <Route path="/" element={<Login />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </WalletProvider>
  )
}

export default App;