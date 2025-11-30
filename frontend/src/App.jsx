import React, { Component } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import VolunteerActivities from "./pages/VolunteerActivities";
import Donation from "./pages/Donation";
import UserProfile from "./pages/UserProfile";
import AdminTemplate from "./templates/AdminTemplate";
import UserTemplate from "./templates/UserTemplate";
import EventManagerTemplate from "./templates/EventManagerTemplate";
import Users from "./pages/Admin/User/User";
import NotFound from "./pages/NotFound";
import EventDetail from "./pages/EventDetail";
import Dashboard from "./pages/Dashboard";
import AdminEvents from "./pages/Admin/Events/AdminEvents";
import PendingEvents from "./pages/Admin/Events/PendingAdminEvents";
import EventManagerEvents from "./pages/EventManager/Event/EventManagerEvents";
import CreateEvent from "./pages/EventManager/Event/CreatEvents";
import AdminEventDetail from "./pages/Admin/Events/AdminEventDetail";
import Participants from "./pages/EventManager/Participant/Participant";
import EditEvent from "./pages/EventManager/Event/EditEvent";

class App extends Component {
  render() {
    return (
      <Router>
        <Routes>
          {/* User routes */}
          <Route path='/' element={<UserTemplate />}>
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/khong-co" element={<NotFound />} />
            <Route path="/trang-chu" element={<HomePage />} />
            <Route path="/hoat-dong" element={<VolunteerActivities />} />
            <Route path="/quyen-gop" element={<Donation />} />
            <Route path="/thong-tin-ca-nhan" element={<UserProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="su-kien/:eventId" element={<EventDetail />} />
          </Route>
          {/* Admin routes */}
          <Route path="/admin" element={<AdminTemplate />}>
            <Route path="nguoi-dung" element={<Users />} />
            <Route path="su-kien" element={<AdminEvents />} />
            <Route path="su-kien/cho-duyet" element={<PendingEvents />} />
            <Route path="su-kien/:eventId" element={<AdminEventDetail />} />
          </Route>
          {/* Manager routes */}
          <Route path="/quanlisukien" element={<EventManagerTemplate />}>
            <Route path="su-kien/:eventId/participants" element={<Participants />} />
            <Route path="su-kien" element={<EventManagerEvents />} />
            <Route path="su-kien/tao" element={<CreateEvent />} />
            <Route path="su-kien/sua/:eventId" element={<EditEvent />} />
            <Route path="su-kien/:eventId" element={<AdminEventDetail />} />
          </Route>
        </Routes>
      </Router>
    );
  }
}

export default App;
