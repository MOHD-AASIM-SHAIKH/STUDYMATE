import { Route, Routes } from "react-router-dom";
import Nav from "./components/Nav";
import ChatPage from "./pages/ChatPage";
import LibraryPage from "./pages/LibraryPage";
import NotesPage from "./pages/NotesPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-paper sm:flex-row">
      <Nav />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}
