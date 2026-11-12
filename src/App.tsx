import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { CreateGroupPage } from './pages/CreateGroupPage';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { JoinGroupPage } from './pages/JoinGroupPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { PrivacyPage } from './pages/PrivacyPage';
import { RecoverLinkPage } from './pages/RecoverLinkPage';
import { ResultPage } from './pages/ResultPage';
import { TermsPage } from './pages/TermsPage';

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 space-y-4">
        <h1 className="font-editorial text-3xl font-semibold text-[#262A27]">Page not found</h1>
        <p className="text-sm text-[#777B76]">
          The page you are looking for does not exist or the link is incomplete.
        </p>
        <Link
          to="/"
          className="inline-flex rounded-full bg-[#315B46] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#274938]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/create" element={<CreateGroupPage />} />
          <Route path="/join" element={<JoinGroupPage />} />
          <Route path="/join/:groupId" element={<JoinGroupPage />} />
          <Route path="/recover" element={<RecoverLinkPage />} />
          <Route path="/recover/:groupId" element={<RecoverLinkPage />} />
          <Route path="/organizer/:groupId" element={<OrganizerDashboard />} />
          <Route path="/participant/:privateToken" element={<ParticipantDashboard />} />
          <Route path="/result/:privateToken" element={<ResultPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
