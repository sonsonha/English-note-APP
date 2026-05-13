import { useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import CaptureFAB from './components/CaptureFAB.jsx';
import Auth from './screens/Auth.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Library from './screens/Library.jsx';
import WordDetail from './screens/WordDetail.jsx';
import Review from './screens/Review.jsx';
import Results from './screens/Results.jsx';
import Calendar from './screens/Calendar.jsx';
import Settings from './screens/Settings.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('dashboard');
  const [activeWordId, setActiveWordId] = useState(null);
  const [sessionResults, setSessionResults] = useState([]);
  const [libraryScope, setLibraryScope] = useState(null);
  const [wordCount, setWordCount] = useState(0);

  const openWord = (id) => { setActiveWordId(id); setScreen('word'); };
  const finishSession = (results) => { setSessionResults(results); setScreen('results'); };
  const goToLibrary = (scope) => { setLibraryScope(scope || null); setScreen('library'); };

  if (loading) {
    return (
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user) return <Auth />;

  let content;
  switch (screen) {
    case 'dashboard':
      content = (
        <Dashboard
          setScreen={setScreen}
          openWord={openWord}
          goToLibrary={goToLibrary}
          onWordCount={setWordCount}
        />
      );
      break;
    case 'library':
      content = (
        <Library
          openWord={openWord}
          scope={libraryScope}
          setScope={setLibraryScope}
        />
      );
      break;
    case 'word':
      content = (
        <WordDetail
          wordId={activeWordId}
          setScreen={setScreen}
          goToLibrary={goToLibrary}
        />
      );
      break;
    case 'review':
      content = (
        <Review
          setScreen={setScreen}
          openWord={openWord}
          finishSession={finishSession}
        />
      );
      break;
    case 'results':
      content = (
        <Results
          results={sessionResults}
          setScreen={setScreen}
          openWord={openWord}
        />
      );
      break;
    case 'calendar':
      content = (
        <Calendar
          setScreen={setScreen}
          openWord={openWord}
          goToLibrary={goToLibrary}
        />
      );
      break;
    case 'settings':
      content = <Settings />;
      break;
    default:
      content = (
        <Dashboard
          setScreen={setScreen}
          openWord={openWord}
          goToLibrary={goToLibrary}
          onWordCount={setWordCount}
        />
      );
  }

  return (
    <>
      <div className="app">
        <Sidebar screen={screen} setScreen={setScreen} wordCount={wordCount} />
        <main>{content}</main>
      </div>
      <CaptureFAB onSaved={() => { if (screen === 'dashboard') setScreen('library'); }} />
    </>
  );
}
