import React, { useState } from "react";
import toast from "react-hot-toast";

function Profile() {
   const [isEditing, setIsEditing] = useState(false);

   
  const [user, setUser] = useState({
    name: localStorage.getItem("username") || "",
    email: localStorage.getItem("email") || "",
    bio: localStorage.getItem("bio") || ""
  });

    const [profilePic, setProfilePic] = useState(
    localStorage.getItem("profilePic") || ""
  );

   const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

   const handleSave = () => {
    localStorage.setItem("username", user.name);
    localStorage.setItem("email", user.email);
    localStorage.setItem("bio", user.bio);

    toast.success("Profile updated ✅");
    setIsEditing(false);
  };

   const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setProfilePic(url);

    localStorage.setItem("profilePic", url);
  };

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
    : profilePic ||
      `https://ui-avatars.com/api/?name=${user.name}`
}
  alt="profile"
  className="w-32 h-32 rounded-full border-4 border-blue-500"
/>

          {/* User Info */}
          <div>

            <div className="flex flex-col gap-2">

  <input
    type="text"
    name="name"
    value={user.name}
    onChange={handleChange}
    disabled={!isEditing}
    className="text-2xl font-bold border-b outline-none"
  />

  <input
    type="email"
    name="email"
    value={user.email}
    onChange={handleChange}
    disabled={!isEditing}
    className="text-blue-600 border-b outline-none"
  />

</div>
            
          </div>

        </div>

        {/* About */}
        <div className="mt-10">

          <h2 className="text-2xl font-bold mb-4">
            About
          </h2>

          <textarea
  name="bio"
  value={user.bio}
  onChange={handleChange}
  disabled={!isEditing}
  className="w-full border p-3 rounded text-gray-600"
  placeholder="Write about yourself..."
/>

        </div>
        {/* 📸 Upload Profile Image */}

{isEditing && (
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
          "https://humorous-fulfillment-production-1f5e.up.railway.app/api/upload-image",
          {
            method: "POST",
            body: formData
          }
        );

        const data = await response.json();
        setUploadedImage(data.file);

        alert("Profile image uploaded ✅");
      }}
      className="bg-purple-600 text-white px-6 py-3 rounded-xl"
    >
      Upload Photo
    </button>

  </div>
)}

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
  "https://humorous-fulfillment-production-1f5e.up.railway.app/api/upload-resume",
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

<div className="mt-8 flex gap-4">

  {isEditing ? (
    <>
      <button
        onClick={handleSave}
        className="bg-green-600 text-white px-6 py-2 rounded"
      >
        Save ✅
      </button>

      <button
        onClick={() => setIsEditing(false)}
        className="bg-gray-400 text-white px-6 py-2 rounded"
      >
        Cancel
      </button>
    </>
  ) : (
    <button
      onClick={() => setIsEditing(true)}
      className="bg-blue-600 text-white px-6 py-2 rounded"
    >
      Edit Profile ✏️
    </button>
  )}

</div>

</div>

      </div>

    </div>
  );
}

export default Profile;