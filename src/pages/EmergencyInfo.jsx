import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

export default function EmergencyInfo() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      const ref = doc(db, "users", id);
      const snap = await getDoc(ref);
      if (snap.exists()) setData(snap.data());
    };
    fetchInfo();
  }, [id]);

  if (!data) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-xl">
        Loading emergency info...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex justify-center items-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-700 mb-4">
          🆘 Emergency Health Info
        </h1>
        <p><strong>Name:</strong> {data.name}</p>
        <p><strong>Blood Group:</strong> {data.bloodGroup || "Not Provided"}</p>
        <p><strong>Allergies:</strong> {data.allergies || "None"}</p>
        <p><strong>Emergency Contact:</strong> {data.emergencyContact || "Not Provided"}</p>
        <p className="text-gray-600 mt-4 text-sm">
          ⚠️ For medical use only — shared by MediConnect
        </p>
      </div>
    </div>
  );
}
