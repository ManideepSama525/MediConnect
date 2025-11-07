import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import Tesseract from "tesseract.js";

export default function PatientDashboard() {
  const [user, setUser] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [emergencyInfo, setEmergencyInfo] = useState(null);
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [tempEmergency, setTempEmergency] = useState({
    bloodGroup: "",
    allergies: "",
    emergencyContact: "",
  });
  const navigate = useNavigate();

  // 🧠 Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) navigate("/");
      else {
        setUser(currentUser);
        listenForPrescriptions(currentUser.uid);
        await loadEmergencyData(currentUser.uid);
      }
    });
    return () => unsub();
  }, []);

  // 🩺 Load emergency info
  const loadEmergencyData = async (uid) => {
    const q = query(collection(db, "users"), where("__name__", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      if (data.bloodGroup || data.allergies || data.emergencyContact) {
        setEmergencyInfo(data);
      } else {
        setEditingEmergency(true); // first login setup
      }
    }
    setLoading(false);
  };

  // 💾 Save emergency info
  const saveEmergencyInfo = async () => {
    if (!tempEmergency.bloodGroup || !tempEmergency.emergencyContact) {
      alert("Please fill all required fields.");
      return;
    }
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        bloodGroup: tempEmergency.bloodGroup,
        allergies: tempEmergency.allergies,
        emergencyContact: tempEmergency.emergencyContact,
      });
      alert("✅ Emergency info saved successfully!");
      setEmergencyInfo(tempEmergency);
      setEditingEmergency(false);
    } catch (err) {
      console.error("Error saving emergency info:", err);
      alert("❌ Failed to save info. Try again.");
    }
  };

  // ☁️ Upload image to ImgBB
  async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=beb84081a67f94e5dd148b2c6bd50e1c`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error("Image upload failed");
  }

  // 💊 Extract medicines from OCR text
  const extractMedicines = (text) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const medicines = [];
    lines.forEach((line) => {
      const medMatch = line.match(/^([A-Za-z][\w\s]*)\s*(\d+mg|\d+ml)?/);
      const timeMatch = line.match(/(morning|evening|night|daily|once|twice|thrice)/i);
      if (medMatch) {
        const name = medMatch[1].trim();
        if (name.length > 2 && !name.toLowerCase().includes("tablet")) {
          medicines.push({
            name,
            dosage: medMatch[2] || "",
            time: timeMatch ? timeMatch[0] : "unspecified",
          });
        }
      }
    });
    return medicines.filter(
      (v, i, a) => a.findIndex((t) => t.name === v.name) === i
    );
  };

  // 🖼️ File preview
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    setFile(selected);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selected);
  };

  // ⚙️ Upload + OCR
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please choose a file!");
    setOcrLoading(true);
    try {
      alert("Analyzing your prescription... This may take a few seconds.");
      const image = preview.replace("data:image/png;", "data:image/jpeg;");
      const result = await Tesseract.recognize(image, "eng", {
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789mg ",
      });
      const extractedText = result.data.text.trim();
      const medicines = extractMedicines(extractedText);
      setSummary(medicines);

      const imageUrl = await uploadToImgBB(file);

      await addDoc(collection(db, "prescriptions"), {
        patientId: user.uid,
        notes,
        imageUrl,
        extractedText,
        medicines,
        uploadedAt: new Date().toLocaleString(),
        timestamp: serverTimestamp(),
      });

      for (const med of medicines) {
        await addDoc(collection(db, "reminders"), {
          patientId: user.uid,
          medicineName: `${med.name} ${med.dosage}`,
          time: med.time,
          createdAt: serverTimestamp(),
        });
      }

      alert("✅ Uploaded, analyzed & reminders created!");
      setFile(null);
      setPreview(null);
      setNotes("");
    } catch (err) {
      console.error("Error uploading:", err);
      alert("❌ OCR failed. Try a clearer image.");
    } finally {
      setOcrLoading(false);
    }
  };

  // 🔁 Listen for prescriptions
  const listenForPrescriptions = (uid) => {
    const q = query(
      collection(db, "prescriptions"),
      where("patientId", "==", uid),
      orderBy("timestamp", "desc")
    );
    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPrescriptions(data);
      setLoading(false);
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const qrLink = `${window.location.origin}/emergency/${user?.uid}`;

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-600">
        Loading your data...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">🧑‍🦰 Patient Dashboard</h1>
          <button
            onClick={() => navigate("/reminder")}
            className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            💊 Manage Medicine Reminders
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Emergency Info */}
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">🆘 Emergency Health Info</h2>
        {editingEmergency ? (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Blood Group (e.g. O+)"
              value={tempEmergency.bloodGroup}
              onChange={(e) =>
                setTempEmergency({ ...tempEmergency, bloodGroup: e.target.value })
              }
              className="border border-gray-300 rounded-md p-2 w-full"
              required
            />
            <input
              type="text"
              placeholder="Allergies (if any)"
              value={tempEmergency.allergies}
              onChange={(e) =>
                setTempEmergency({ ...tempEmergency, allergies: e.target.value })
              }
              className="border border-gray-300 rounded-md p-2 w-full"
            />
            <input
              type="text"
              placeholder="Emergency Contact (Phone Number)"
              value={tempEmergency.emergencyContact}
              onChange={(e) =>
                setTempEmergency({
                  ...tempEmergency,
                  emergencyContact: e.target.value,
                })
              }
              className="border border-gray-300 rounded-md p-2 w-full"
              required
            />
            <button
              onClick={saveEmergencyInfo}
              className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700"
            >
              Save Info
            </button>
          </div>
        ) : (
          <div>
            <p><strong>Blood Group:</strong> {emergencyInfo?.bloodGroup}</p>
            <p><strong>Allergies:</strong> {emergencyInfo?.allergies || "None"}</p>
            <p><strong>Emergency Contact:</strong> {emergencyInfo?.emergencyContact}</p>
            <button
              onClick={() => {
                setTempEmergency(emergencyInfo);
                setEditingEmergency(true);
              }}
              className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
            >
              ✏️ Edit Info
            </button>
          </div>
        )}
      </div>

      {/* 📱 Emergency QR Section */}
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-2xl p-6 mb-8 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">📱 Emergency QR</h2>
        {!showQR ? (
          <button
            onClick={() => setShowQR(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Generate QR
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <QRCodeCanvas value={qrLink} size={180} />
            <p className="text-sm text-gray-500">
              Scan this QR to access your emergency profile instantly.
            </p>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          📤 Upload Prescription / Report
        </h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            type="file"
            onChange={handleFileChange}
            className="border border-gray-300 rounded-md w-full p-2"
          />
          <textarea
            placeholder="Add notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
          />
          {preview && (
            <div>
              <p className="text-gray-600 mb-1">Preview:</p>
              <img src={preview} alt="Preview" className="w-64 border rounded-lg shadow" />
            </div>
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white w-full py-2 rounded-md hover:bg-blue-700 transition"
            disabled={ocrLoading}
          >
            {ocrLoading ? "Analyzing..." : "Upload & Analyze"}
          </button>
        </form>
      </div>

      {/* Summary */}
      {summary && summary.length > 0 && (
        <div className="max-w-3xl mx-auto bg-green-50 shadow-md rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-green-800 mb-3">💊 Detected Medicines</h2>
          <ul className="list-disc pl-5 text-gray-800">
            {summary.map((m, i) => (
              <li key={i}>
                {m.name} {m.dosage} — {m.time}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uploaded Prescriptions */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          📋 Uploaded Prescriptions
        </h2>
        {prescriptions.length === 0 ? (
          <p className="text-gray-500 text-center">No prescriptions uploaded yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {prescriptions.map((p) => (
              <div key={p.id} className="border border-gray-200 p-4 rounded-xl bg-gray-50 relative">
                {p.imageUrl && (
                  <div className="relative">
                    <img
                      src={p.imageUrl}
                      alt="Prescription"
                      className="w-full rounded-lg shadow mb-2"
                    />
                    <a
                      href={p.imageUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2 right-2 bg-white text-blue-600 px-2 py-1 rounded shadow hover:bg-blue-600 hover:text-white text-sm"
                    >
                      ⬇️ Download
                    </a>
                  </div>
                )}
                {p.medicines && p.medicines.length > 0 && (
                  <ul className="text-sm text-gray-700">
                    {p.medicines.map((m, idx) => (
                      <li key={idx}>💊 {m.name} {m.dosage} — {m.time}</li>
                    ))}
                  </ul>
                )}
                {p.notes && (
                  <p className="text-gray-700 text-sm mb-1">📝 Notes: {p.notes}</p>
                )}
                <p className="text-sm text-gray-500">{p.uploadedAt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
