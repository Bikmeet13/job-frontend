import React, { useState } from "react";

function Profile() {
  const [resume, setResume] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
const [uploadedImage, setUploadedImage] = useState("");
  const [uploadedResume, setUploadedResume] = useState("");
  const username = localStorage.getItem("username");
const email = localStorage.getItem("email");
  return (
    <div className="min-h-screen bg-gray-100 p-10">

      {/* Profile Card */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-10">

        <div className="flex items-center gap-6">

          {/* Profile Image */}
          <img
  src={
    uploadedImage
      ? `http://localhost:5000/uploads/${uploadedImage}`
      : `https://ui-avatars.com/api/?name=${username}`
  }
  alt="profile"
  className="w-32 h-32 rounded-full border-4 border-blue-500"
/>

          {/* User Info */}
          <div>

            <h1 className="text-3xl font-bold">
  {username || "User"}
            </h1>

            <p className="text-blue-600">
  {email || "No email"}
            </p>

            
          </div>

        </div>

        {/* About */}
        <div className="mt-10">

          <h2 className="text-2xl font-bold mb-4">
            About
          </h2>

          <p className="text-gray-600 leading-8">
            Passionate full-stack developer building modern web applications
            using React, Node.js, PostgreSQL, and Tailwind CSS.
          </p>

        </div>
        {/* 📸 Upload Profile Image */}
<div className="mt-8">

  <h2 className="text-2xl font-bold mb-4">
    Upload Profile Photo
  </h2>

  <input
    type="file"
    onChange={(e) => setProfileImage(e.target.files[0])}
    className="mb-4"
  />

  <br />

  <button
    onClick={async () => {

      const formData = new FormData();

      formData.append("image", profileImage);

      const response = await fetch(
        "http://localhost:5000/api/upload-image",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      setUploadedImage(data.file);

      alert("Profile image uploaded ✅");

    }}
    className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition"
  >
    Upload Photo
  </button>

</div>

        {/* Skills */}
        <div className="mt-10">

          <h2 className="text-2xl font-bold mb-4">
            Skills
          </h2>

          <div className="flex flex-wrap gap-3">

            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
              React
            </span>

            <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full">
              Node.js
            </span>

            <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full">
              PostgreSQL
            </span>

            <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
              Tailwind CSS
            </span>

          </div>

        </div>

        <div className="mt-10">

  <h2 className="text-2xl font-bold mb-4">
    Upload Resume
  </h2>

  <input
    type="file"
    onChange={(e) => setResume(e.target.files[0])}
    className="mb-4"
  />

  <br />

  <button
    onClick={async () => {

      const formData = new FormData();

      formData.append("resume", resume);

      const response = await fetch(
  "http://localhost:5000/api/upload-resume",
  {
    method: "POST",
    body: formData
  }
);

// ✅ SAFETY FIX
if (!response.ok) {
  throw new Error("Upload failed");
}

const data = await response.json();

setUploadedResume(data.file);

alert("Resume uploaded ✅");
    }}
    className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition"
  >
    Upload Resume
  </button>
  {uploadedResume && (

  <a
    href={`http://localhost:5000/uploads/${uploadedResume}`}
    target="_blank"
    rel="noreferrer"
    className="block mt-5 text-blue-600 font-semibold hover:underline"
  >
    📄 View Uploaded Resume
  </a>

)}

</div>

      </div>

    </div>
  );
}

export default Profile;