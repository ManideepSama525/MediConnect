import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

export default function SummaryDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalPrescriptions: 0,
    totalTreatments: 0,
  });
  const [diseaseStats, setDiseaseStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Collections
        const patientsSnap = await getDocs(collection(db, "users"));
        const prescriptionsSnap = await getDocs(collection(db, "prescriptions"));
        const recordsSnap = await getDocs(collection(db, "records"));

        // Count
        const totalPatients = patientsSnap.size;
        const totalPrescriptions = prescriptionsSnap.size;
        const totalTreatments = recordsSnap.size;

        // Disease frequency (for bar chart)
        const diseaseCount = {};
        recordsSnap.docs.forEach((doc) => {
          const diagnosis = doc.data().diagnosis || "Unknown";
          diseaseCount[diagnosis] = (diseaseCount[diagnosis] || 0) + 1;
        });

        const chartData = Object.entries(diseaseCount).map(([name, count]) => ({
          name,
          count,
        }));

        setStats({
          totalPatients,
          totalPrescriptions,
          totalTreatments,
        });
        setDiseaseStats(chartData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching summary:", err);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-xl">
        Fetching summary data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">📊 Summary Dashboard</h1>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            ← Back
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-100 border border-blue-300 p-6 rounded-xl text-center shadow">
            <h2 className="text-4xl font-bold text-blue-700">{stats.totalPatients}</h2>
            <p className="text-gray-700 font-medium">Total Patients</p>
          </div>
          <div className="bg-green-100 border border-green-300 p-6 rounded-xl text-center shadow">
            <h2 className="text-4xl font-bold text-green-700">{stats.totalTreatments}</h2>
            <p className="text-gray-700 font-medium">Total Treatments</p>
          </div>
          <div className="bg-yellow-100 border border-yellow-300 p-6 rounded-xl text-center shadow">
            <h2 className="text-4xl font-bold text-yellow-700">{stats.totalPrescriptions}</h2>
            <p className="text-gray-700 font-medium">Total Prescriptions</p>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🩺 Most Common Diseases / Treatments
          </h2>
          {diseaseStats.length === 0 ? (
            <p className="text-gray-500">No treatment data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={diseaseStats} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
