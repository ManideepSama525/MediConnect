import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function LocalRecords({ onLogout }) {
  const [records, setRecords] = useState([]);
  const [patient, setPatient] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [file, setFile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // 👈 to track editing record

  // 👤 Track logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchRecords(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 🔄 Fetch records from Firestore
  const fetchRecords = async (uid) => {
    try {
      const q = query(collection(db, "records"), where("userId", "==", uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  // 💾 Add new record
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!patient || !diagnosis || !prescription) {
      alert("Please fill all fields!");
      return;
    }
    if (!user) {
      alert("Please log in again!");
      return;
    }

    const newRecord = {
      patient,
      diagnosis,
      prescription,
      date: new Date().toLocaleString(),
      userId: user.uid,
      fileName: file ? file.name : null,
    };

    try {
      const docRef = await addDoc(collection(db, "records"), newRecord);
      setRecords([...records, { id: docRef.id, ...newRecord }]);
      setPatient("");
      setDiagnosis("");
      setPrescription("");
      setFile(null);
      alert("Record saved successfully!");
    } catch (err) {
      console.error("Error saving to Firestore:", err);
      alert("Failed to save record.");
    }
  };

  // 🗑️ Delete record
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "records", id));
      setRecords(records.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  // ✏️ Edit record
  const handleEdit = (record) => {
    setEditingId(record.id);
    setPatient(record.patient);
    setDiagnosis(record.diagnosis);
    setPrescription(record.prescription);
  };

  // 💾 Save updated record
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const recordRef = doc(db, "records", editingId);
      await updateDoc(recordRef, {
        patient,
        diagnosis,
        prescription,
      });

      setRecords(
        records.map((rec) =>
          rec.id === editingId
            ? { ...rec, patient, diagnosis, prescription }
            : rec
        )
      );
      setEditingId(null);
      setPatient("");
      setDiagnosis("");
      setPrescription("");
      alert("Record updated successfully!");
    } catch (err) {
      console.error("Error updating record:", err);
    }
  };

  // 🚪 Logout
  const handleLogout = async () => {
    await signOut(auth);
    onLogout();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">
          🩺 MediConnect Dashboard
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Add/Edit Record Form */}
      <form
        onSubmit={editingId ? handleUpdate : handleAdd}
        className="bg-white shadow-lg rounded-2xl p-6 max-w-xl mx-auto mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {editingId ? "Edit Record" : "Add New Health Record"}
        </h2>

        <input
          type="text"
          placeholder="Patient Name"
          value={patient}
          onChange={(e) => setPatient(e.target.value)}
          className="border border-gray-300 rounded-md w-full p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="text"
          placeholder="Diagnosis"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          className="border border-gray-300 rounded-md w-full p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <textarea
          placeholder="Prescription / Notes"
          value={prescription}
          onChange={(e) => setPrescription(e.target.value)}
          className="border border-gray-300 rounded-md w-full p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        ></textarea>

        <button
          type="submit"
          className={`${
            editingId ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
          } text-white px-4 py-2 rounded-md w-full transition`}
        >
          {editingId ? "Update Record" : "Save Record"}
        </button>
      </form>

      {/* Records List */}
      <div className="grid md:grid-cols-2 gap-4">
        {records.length === 0 && (
          <p className="text-center text-gray-600">No records added yet.</p>
        )}

        {records.map((rec) => (
          <div
            key={rec.id}
            className="bg-white shadow-lg rounded-xl p-4 border border-gray-100"
          >
            <h3 className="text-lg font-semibold text-blue-700">
              {rec.patient}
            </h3>
            <p className="text-gray-700">
              <strong>Diagnosis:</strong> {rec.diagnosis}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Prescription:</strong> {rec.prescription}
            </p>
            <p className="text-sm text-gray-500">Added: {rec.date}</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleEdit(rec)}
                className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(rec.id)}
                className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
