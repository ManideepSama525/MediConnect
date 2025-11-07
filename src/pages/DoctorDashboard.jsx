import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";

export default function DoctorDashboard() {
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Load doctor info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
      } else {
        setDoctor(user);
        await loadPatients();
      }
    });
    return () => unsubscribe();
  }, []);

  // Load all patients from Firestore
  const loadPatients = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "patient"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPatients(data);
      setFilteredPatients(data);
    } catch (err) {
      console.error("Error loading patients:", err);
    }
  };

  // Search filter
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    if (!value) {
      setFilteredPatients(patients);
      return;
    }

    const fuse = new Fuse(patients, {
      keys: ["name", "email"],
      threshold: 0.3,
    });
    const results = fuse.search(value);
    setFilteredPatients(results.map((r) => r.item));
  };

  // Track when doctor views a patient
  const handleViewPatient = async (patient) => {
    try {
      await addDoc(collection(db, "views"), {
        doctorId: doctor.uid,
        patientId: patient.id,
        viewedAt: new Date().toISOString(),
      });
      navigate(`/doctor/patient/${patient.id}`);
      // Navigate to patient record page later
    } catch (err) {
      console.error("Error saving view:", err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-green-700">👨‍⚕️ Doctor Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Search Box */}
      <div className="max-w-2xl mx-auto mb-6">
        <input
          type="text"
          placeholder="Search patient by name or email..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {/* Patient List */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredPatients.length === 0 && (
          <p className="text-center text-gray-500 col-span-2">
            No patients found.
          </p>
        )}

        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white shadow-md rounded-xl p-4 border border-gray-100"
          >
            <h2 className="text-xl font-semibold text-green-700">
              {patient.name}
            </h2>
            <p className="text-gray-600">Email: {patient.email}</p>
            <button
              onClick={() => handleViewPatient(patient)}
              className="mt-3 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
            >
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
