import React, { useState, useEffect } from "react";
import axios from "axios";

function ChatbotForm() {

  // ✅ GET applicationId from URL
  const params = new URLSearchParams(window.location.search);
  const applicationId = params.get("applicationId");

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState([]);

  const handleAnswer = async (answer) => {
    if (!answer) return;

    const question = questions[step];

    await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/chatbot-response",
      {
        applicationId,
        question,
        answer
      }
    );

    setAnswers([...answers, { question, answer }]);
    setStep(step + 1);
    setInput("");
  };

  useEffect(() => {
  const fetchQuestions = async () => {
    
    try {
      // 1. get application details
      const appRes = await axios.get(
        `https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/${applicationId}`
      );
      console.log("FULL APPLICATION RESPONSE:", appRes.data);

      const jobId = appRes.data.jobid;

      if (!jobId) {
  console.log("❌ jobId missing", appRes.data);
  return;
}

      // 2. get job details
      const jobRes = await axios.get(
        `https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs/${jobId}`
      );

      // 3. parse questions
      const qs = jobRes.data.chatbot_questions || [];   
      
      console.log("QUESTIONS:", jobRes.data.chatbot_questions);

      setQuestions(qs);

    } catch (err) {
      console.log(err);
    }
  };

  fetchQuestions();
}, [applicationId]);

  return (
    <div className="bg-white p-4 rounded shadow max-w-md mx-auto mt-10">
      {step < questions.length ? (
        <>
          <p className="mb-2 font-semibold">{questions[step]}</p>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <button
            onClick={() => handleAnswer(input)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </>
      ) : (
        <p className="text-green-600 font-semibold">
          ✅ Thank you! Submission complete.
        </p>
      )}
    </div>
  );
}

export default ChatbotForm;