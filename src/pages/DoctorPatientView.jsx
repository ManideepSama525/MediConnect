import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

export default function DoctorPatientView() {
  const { patientId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [patient, setPatient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [filteredTreatments, setFilteredTreatments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [searchDiagnosis, setSearchDiagnosis] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Authenticate doctor & load data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) navigate("/");
      else {
        setDoctor(user);
        await fetchPatient();
        await incrementViewCount();
        listenForTreatments();
        listenForPrescriptions();
      }
    });
    return () => unsub();
  }, []);

  // ✅ Fetch patient details
  const fetchPatient = async () => {
    const q = query(collection(db, "users"), where("__name__", "==", patientId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      setPatient(data);
    }
  };

  // ✅ Increment doctor view count
  const incrementViewCount = async () => {
    const ref = doc(db, "users", patientId);
    try {
      await updateDoc(ref, { viewCount: increment(1) });
    } catch (err) {
      console.error("Error updating view count:", err);
    }
  };

  // ✅ Listen for treatments
  const listenForTreatments = () => {
    const q = query(collection(db, "records"), where("patientId", "==", patientId));
    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort(
        (a, b) =>
          new Date(b.timestamp?.toDate?.() || 0) -
          new Date(a.timestamp?.toDate?.() || 0)
      );
      setTreatments(data);
      setFilteredTreatments(data);
      setLoading(false);
    });
  };

  // ✅ Listen for prescriptions
  const listenForPrescriptions = () => {
    const q = query(collection(db, "prescriptions"), where("patientId", "==", patientId));
    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort(
        (a, b) =>
          new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
      );
      setPrescriptions(data);
    });
  };

  // ✅ Handle image download correctly
  const handleDownload = (base64Data, uploadedAt) => {
    try {
      const imageData = base64Data.split(",")[1]; // remove 'data:image/png;base64,'
      const byteChars = atob(imageData);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Prescription_${uploadedAt
        .replaceAll(" ", "_")
        .replaceAll("/", "-")}.png`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
      alert("Failed to download the image. Please try again.");
    }
  };

  // ✅ Filter treatment history
  const applyFilters = () => {
    let filtered = [...treatments];
    if (searchDiagnosis.trim()) {
      filtered = filtered.filter((t) =>
        t.diagnosis?.toLowerCase().includes(searchDiagnosis.toLowerCase())
      );
    }
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      filtered = filtered.filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= from && tDate <= to;
      });
    }
    setFilteredTreatments(filtered);
  };

  const clearFilters = () => {
    setSearchDiagnosis("");
    setDateFrom("");
    setDateTo("");
    setFilteredTreatments(treatments);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-600">
        Loading patient data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-6">
        {/* 🧑‍🦰 Patient Info */}
        {patient && (
          <div className="mb-6 border-b pb-4">
            <h1 className="text-3xl font-bold text-green-700 mb-2">
              🧑‍🦰 Patient: {patient.name}
            </h1>
            <p className="text-gray-600">
              <strong>Email:</strong> {patient.email}
            </p>
            <p className="text-gray-600">
              <strong>Profile Views:</strong> {patient.viewCount || 0}
            </p>
            <p className="text-gray-500 text-sm">ID: {patientId}</p>
          </div>
        )}

        {/* 📋 Uploaded Prescriptions */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          📋 Uploaded Prescriptions / Reports
        </h2>

        {prescriptions.length === 0 ? (
          <p className="text-gray-500 mb-6">
            No prescriptions uploaded by this patient yet.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {prescriptions.map((p) => (
              <div
                key={p.id}
                className="relative border border-gray-200 bg-gray-50 p-4 rounded-lg shadow-sm"
              >
                {p.imageBase64 ? (
                  <div className="relative">
                    <img
                      src={p.imageBase64}
                      alt="Prescription"
                      className="rounded-lg shadow-md border w-full mb-3"
                    />

                    {/* ✅ Fixed Download Button */}
                    <button
                      onClick={() => handleDownload(p.imageBase64, p.uploadedAt)}
                      title="Download Prescription"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-green-600 text-green-600 hover:text-white rounded-full p-2 shadow transition"
                    >
                      ⬇️
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No image uploaded</p>
                )}

                {p.notes && (
                  <p className="text-gray-700 text-sm mb-1">📝 Notes: {p.notes}</p>
                )}
                <p className="text-sm text-gray-500">{p.uploadedAt}</p>
              </div>
            ))}
          </div>
        )}

        {/* 🔍 Filters */}
        <div className="bg-gray-100 p-4 rounded-xl mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            🔍 Filter Treatments
          </h3>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Search by Diagnosis (e.g. Fever)"
              value={searchDiagnosis}
              onChange={(e) => setSearchDiagnosis(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-green-400"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={applyFilters}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500"
            >
              Clear
            </button>
          </div>
        </div>

        {/* 🩺 Treatment History */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          🩺 Treatment History
        </h2>
        {filteredTreatments.length === 0 ? (
          <p className="text-gray-500">No treatments match your filters.</p>
        ) : (
          <div className="space-y-4">
            {filteredTreatments.map((t) => (
              <div
                key={t.id}
                className="border border-gray-200 bg-gray-50 p-4 rounded-lg shadow-sm"
              >
                <p className="text-green-700 font-semibold text-lg">
                  {t.diagnosis}
                </p>
                <p className="text-gray-700">{t.prescription}</p>
                {t.photoURL && (
                  <div className="mt-3">
                    <p className="text-gray-600 mb-1">📷 Attached Image:</p>
                    <img
                      src={t.photoURL}
                      alt="Treatment"
                      className="rounded-lg shadow-md border w-64"
                    />
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">{t.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* 🔙 Back Button */}
        <button
          onClick={() => navigate("/doctor-dashboard")}
          className="mt-8 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
