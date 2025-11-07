import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("patient");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) {
      alert("Please fill all fields!");
      return;
    }
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const user = res.user;

      // save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        role, // "doctor" or "patient"
        createdAt: new Date().toISOString(),
        viewCount: 0, // initialize
      });

      alert("Registration successful!");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Error registering: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-blue-50">
      <form
        onSubmit={handleRegister}
        className="bg-white shadow-lg p-8 rounded-xl w-96"
      >
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-4">
          🏥 MediConnect Registration
        </h1>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full mb-3"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full mb-3"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full mb-3"
        />

        <label className="block text-gray-700 mb-1 font-medium">
          Select Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full mb-4"
        >
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white w-full py-2 rounded-md hover:bg-blue-700 transition"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-center text-sm text-gray-600 mt-3">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/")}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
