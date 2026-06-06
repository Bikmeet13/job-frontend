import React, { useState, useEffect } from "react";
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
    localStorage.setItem("projects", projects);
    localStorage.setItem("education", education);
localStorage.setItem("experience", experience);
    localStorage.setItem("skills", skills);
    localStorage.setItem("username", user.name);
    localStorage.setItem("email", user.email);
    localStorage.setItem("bio", user.bio);

    toast.success("Profile updated ✅");
    setIsEditing(false);
  };

     const [resume, setResume] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
const [uploadedImage, setUploadedImage] = useState("");
  const [uploadedResume, setUploadedResume] = useState("");
  const username = localStorage.getItem("username");
const email = localStorage.getItem("email");
const [skills, setSkills] = useState(
  localStorage.getItem("skills") || "React, Node.js, PostgreSQL, Tailwind CSS"
);
const [education, setEducation] = useState(
  localStorage.getItem("education") || ""
);

const [experience, setExperience] = useState(
  localStorage.getItem("experience") || ""
);
const [projects, setProjects] = useState(
  localStorage.getItem("projects") || ""
);
const [recommendedJobs, setRecommendedJobs] = useState([]);

 useEffect(() => {
      const savedImage = localStorage.getItem("profilePic");
    const savedResume = localStorage.getItem("resume");

  console.log("IMAGE:", uploadedImage);
console.log("LOCAL:", localStorage.getItem("profilePic"));

    if (savedImage) setUploadedImage(savedImage);
    if (savedResume) setUploadedResume(savedResume);
  },
   []);
   useEffect(() => {
  const fetchRecommendations = async () => {
    try {
      const res = await fetch(
        `https://humorous-fulfillment-production-1f5e.up.railway.app/api/recommended-jobs/${skills}`
      );

      const data = await res.json();

      setRecommendedJobs(data);
    } catch (err) {
      console.log(err);
    }
  };

  fetchRecommendations();
}, [skills]);

  const handleResumeAnalysis = async () => {

  if (!uploadedResume) {
    alert("Please upload a resume first 📄");
    return;
  }

  try {

    const formData = new FormData();

   formData.append("resume", resume);

    const res = await fetch(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/extract-resume",
      {
        method: "POST",
        body: formData
      }
    );

    const data = await res.json();

    console.log("AI DATA:", data);

    if (data.skills) {
  setSkills(Array.isArray(data.skills)
    ? data.skills.join(", ")
    : data.skills);
}

if (data.education) setEducation(data.education);
if (data.experience) setExperience(data.experience);

if (data.projects) {
  setProjects(Array.isArray(data.projects)
    ? data.projects.join(", ")
    : data.projects);
}
    setEducation(data.education || "");
    setExperience(data.experience || "");
    setProjects(data.projects?.join(", ") || "");

    toast.success("Profile auto-filled 🤖");

  } catch (err) {
    console.log(err);
    toast.error("Resume analysis failed ❌");
  }
};
  

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      {/* Profile Card */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-10">

        <div className="flex items-center gap-6">

          {/* Profile Image */}
          <img
  src={
    uploadedImage ||
    `https://ui-avatars.com/api/?name=${user.name}`
  }
  onError={(e) => {
    e.target.src = `https://ui-avatars.com/api/?name=${user.name}`;
  }}
  alt="profile"
  className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover"
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
      if (!profileImage) {
      alert("Please select an image");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", profileImage);

      const response = await fetch(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/upload-image",
        {
          method: "POST",
          body: formData
        }
      );

      // ✅ check if request failed
      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log("UPLOAD RESPONSE:", data);

      console.log("UPLOAD RESPONSE:", data);
      console.log("IMAGE URL:", data.file);

      // ✅ save image URL
      setUploadedImage(data.file);

      // ✅ store in localStorage (important)
      localStorage.setItem("profilePic", data.file);

      alert("Profile image uploaded ✅");

    } catch (err) {
      console.log(err);
      alert("Upload failed ❌");
    }

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

  {isEditing ? (
    <textarea
      value={skills}
      onChange={(e) => setSkills(e.target.value)}
      placeholder="React, Node.js, PostgreSQL"
      className="w-full border p-3 rounded"
    />
  ) : (
    <div className="flex flex-wrap gap-3">
      {skills.split(",").map((skill, index) => (
        <span
          key={index}
          className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
        >
          {skill.trim()}
        </span>
      ))}
    </div>
  )}
</div>

<div className="mt-10">
  <h2 className="text-2xl font-bold mb-4">
    Education
  </h2>

  {isEditing ? (
    <textarea
      value={education}
      onChange={(e) => setEducation(e.target.value)}
      className="w-full border p-3 rounded"
      placeholder="B.Tech Computer Science - ABC University"
    />
  ) : (
    <div className="bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition">
  <h3 className="font-bold text-xl mb-2 text-blue-600">
    🎓 Education
  </h3>

  <p className="text-gray-700">
    {education || "No education added yet"}
  </p>
</div>

  )}
</div>

<div className="mt-10">
  <h2 className="text-2xl font-bold mb-4">
    Experience
  </h2>

  {isEditing ? (
    <textarea
      value={experience}
      onChange={(e) => setExperience(e.target.value)}
      className="w-full border p-3 rounded"
      placeholder="Frontend Developer Intern at XYZ Company"
    />
  ) : (
    <div className="bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition">
  <h3 className="font-bold text-xl mb-2 text-green-600">
    💼 Experience
  </h3>

  <p className="text-gray-700">
    {experience || "No experience added yet"}
  </p>
</div>

  )}
</div>

<div className="mt-10">
  <h2 className="text-2xl font-bold mb-4">
    Projects
  </h2>

  {isEditing ? (
    <textarea
      value={projects}
      onChange={(e) => setProjects(e.target.value)}
      className="w-full border p-3 rounded"
      placeholder="Describe your projects..."
    />
  ) : (
    <div className="bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition">
      <h3 className="font-bold text-xl mb-2 text-purple-600">
        🚀 Projects
      </h3>

      <p className="text-gray-700">
        {projects || "No projects added yet"}
      </p>
    </div>
  )}
</div>

<div className="mt-10">
  <h2 className="text-2xl font-bold mb-4">
    Recommended Jobs 🎯
  </h2>

  <div className="grid gap-4">
    {recommendedJobs.map((job) => (
      <div
        key={job.id}
        className="bg-white border rounded-xl p-4 shadow"
      >
        <h3 className="font-bold text-lg">
          {job.title}
        </h3>

        <p>{job.company}</p>

        <p className="text-blue-600">
          {job.skills}
        </p>
      </div>
    ))}
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
    if (!resume) {
  alert("Please select a resume");
  return;
}
    try {
      const formData = new FormData();
      formData.append("resume", resume);

      const response = await fetch(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/upload-resume",
        {
          method: "POST",
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      setUploadedResume(data.file);
      console.log("RESUME URL:", data.file);

      // ✅ store for reuse
      localStorage.setItem("resume", data.file);

      alert("Resume uploaded ✅");

    } catch (err) {
      console.log(err);
      alert("Upload failed ❌");
    }
  }}
   className="bg-purple-600 text-white px-6 py-3 rounded-xl"
>
    Upload Resume
  </button>
  {uploadedResume && (

  <>
    <a
      href={uploadedResume}
      target="_blank"
      rel="noreferrer"
      className="block mt-5 text-blue-600 font-semibold hover:underline"
    >
      📄 View Uploaded Resume
    </a>

    <button
      onClick={handleResumeAnalysis}
      className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
    >
      Auto Fill Profile 🤖
    </button>
  </>

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