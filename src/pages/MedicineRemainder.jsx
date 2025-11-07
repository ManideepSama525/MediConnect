import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function MedicineReminder() {
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [medicineName, setMedicineName] = useState("");
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🧠 Track user login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) navigate("/");
      else setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // 🔁 Fetch reminders
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "reminders"),
      where("patientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReminders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // 🔔 Ask for notification permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") console.log("✅ Notifications allowed");
        else console.warn("⚠️ Notifications blocked by user");
      });
    }
  }, []);

  // 🕒 Check reminders every 60s
  useEffect(() => {
    if (!reminders.length) return;

    const checkReminders = () => {
      const now = new Date();
      const hour = now.getHours().toString().padStart(2, "0");
      const minute = now.getMinutes().toString().padStart(2, "0");
      const currentTime = `${hour}:${minute}`;

      console.log("⏰ Checking reminders at:", currentTime);

      reminders.forEach((r) => {
        const reminderTime = (r.time || "").trim().slice(0, 5); // Normalize HH:MM
        if (reminderTime === currentTime) {
          console.log("✅ Reminder matched:", r.medicineName);

          try {
            if (Notification.permission === "granted") {
              new Notification("💊 Medicine Reminder", {
                body: `Time to take ${r.medicineName}`,
                icon: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
              });
            } else {
              alert(`💊 Time to take ${r.medicineName}!`);
            }
          } catch (err) {
            console.error("Notification error:", err);
            alert(`💊 Reminder: Time to take ${r.medicineName}`);
          }
        }
      });
    };

    checkReminders(); // Run once immediately
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

  // ➕ Add new reminder
  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!medicineName.trim() || !time)
      return alert("Please fill all fields.");
    try {
      await addDoc(collection(db, "reminders"), {
        patientId: user.uid,
        medicineName,
        time,
        createdAt: serverTimestamp(),
      });
      setMedicineName("");
      setTime("");
      alert("✅ Reminder added successfully!");
    } catch (err) {
      console.error("Error adding reminder:", err);
      alert("Failed to add reminder.");
    }
  };

  // 🗑 Delete one
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reminder?")) return;
    await deleteDoc(doc(db, "reminders", id));
  };

  // ✅ Select / Deselect
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ✅ Select All / Deselect All
  const toggleSelectAll = () => {
    if (selected.length === reminders.length) setSelected([]);
    else setSelected(reminders.map((r) => r.id));
  };

  // ❌ Delete selected
  const handleMultiDelete = async () => {
    if (selected.length === 0) return alert("No reminders selected.");
    if (!window.confirm(`Delete ${selected.length} selected reminders?`)) return;
    await Promise.all(selected.map((id) => deleteDoc(doc(db, "reminders", id))));
    setSelected([]);
    alert("🗑 Selected reminders deleted successfully!");
  };

  // 🔔 Manual test notification
  const testNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("💊 Reminder Test", {
        body: "This is a test notification!",
        icon: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
      });
    } else {
      alert("Please allow notifications first!");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading your medicine reminders...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-700">
            💊 Medicine Reminders
          </h1>
          <button
            onClick={() => navigate("/patient-dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            ← Back
          </button>
        </div>

        {/* Add Reminder Form */}
        <form onSubmit={handleAddReminder} className="mb-6">
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Medicine name (e.g., Paracetamol 500mg)"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full"
            />
            <button
              type="submit"
              className="bg-green-600 text-white rounded-md px-4 py-2 hover:bg-green-700 transition"
            >
              ➕ Add Reminder
            </button>
          </div>
        </form>

        {/* Bulk Delete */}
        {reminders.length > 0 && (
          <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-md shadow-sm">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                onChange={toggleSelectAll}
                checked={
                  selected.length === reminders.length && reminders.length > 0
                }
                className="w-5 h-5 accent-green-600 cursor-pointer"
              />
              <span className="text-gray-700 font-medium">
                {selected.length > 0
                  ? `${selected.length} selected`
                  : "Select all reminders"}
              </span>
            </div>

            {selected.length > 0 && (
              <button
                onClick={handleMultiDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
              >
                🗑 Delete Selected
              </button>
            )}
          </div>
        )}

        {/* Reminder List */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          🩺 Your Active Reminders
        </h2>

        {reminders.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            No reminders found. Add one above.
          </p>
        ) : (
          <div className="space-y-3">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`flex justify-between items-center border border-gray-200 rounded-lg p-4 shadow-sm transition ${
                  selected.includes(r.id) ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="w-5 h-5 accent-green-600 cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">
                      💊 {r.medicineName}
                    </p>
                    <p className="text-gray-600 text-sm">
                      🕒 {r.time || "Not set"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-red-600 hover:bg-red-100 px-3 py-1 rounded-md"
                >
                  🗑 Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Manual Test Button */}
        <div className="text-center mt-6">
          <button
            onClick={testNotification}
            className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700"
          >
            🔔 Test Notification
          </button>
        </div>
      </div>
    </div>
  );
}
