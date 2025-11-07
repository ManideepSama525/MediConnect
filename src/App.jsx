import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ✅ Import all pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import LocalRecords from "./pages/LocalRecords";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import SummaryDashboard from "./pages/SummaryDashboard";
import DoctorPatientView from "./pages/DoctorPatientView";
import EmergencyInfo from "./pages/EmergencyInfo"; // 🆘 Emergency QR page
import MedicineReminder from "./pages/MedicineRemainder"; // 💊 New Reminder page

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 🔐 Authentication */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🧑‍⚕️ Doctor & 🧑‍🦰 Patient Dashboards */}
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />

        {/* 📂 Local Records (optional patient data) */}
        <Route path="/records" element={<LocalRecords />} />

        {/* 🧑‍⚕️ Doctor viewing a specific patient's details */}
        <Route path="/doctor/patient/:patientId" element={<DoctorPatientView />} />

        {/* 📊 Summary / Analytics Page */}
        <Route path="/summary" element={<SummaryDashboard />} />

        {/* 🆘 Emergency Info (QR Code scan page) */}
        <Route path="/emergency/:id" element={<EmergencyInfo />} />

        {/* 💊 Medicine Reminder Page */}
        <Route path="/reminder" element={<MedicineReminder />} />
      </Routes>
    </Router>
  );
}
