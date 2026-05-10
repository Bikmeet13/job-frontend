import React, { useState } from "react";
import axios from "axios";

function ChatbotForm({ applicationId = 1 }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [input, setInput] = useState("");

  const questions = [
    "Tell me about yourself",
    "What are your skills?",
    "Why should we hire you?"
  ];

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