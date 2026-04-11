import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import MobileNav from './components/MobileNav';
import Dashboard from './components/Dashboard';

import SubscriptionsGrid from './components/SubscriptionsGrid';
import Profile from './components/Profile';
import Login from './components/Login';

const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <TopNavBar />
        <main className="flex-1 pt-28 pb-20 px-10 max-w-[1600px] mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subscriptions" element={<SubscriptionsGrid />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
    </Router>
  );
};

export default App;
