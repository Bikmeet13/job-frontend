import React, { useMemo, useState } from "react";
import axios from "axios";
import { ArrowLeft, Download, FileText, FileUp, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_URL = "https://humorous-fulfillment-production-1f5e.up.railway.app/api/document-generator/convert";

function DocumentGenerator() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [converting, setConverting] = useState(false);

  const formats = useMemo(() => {
    if (!file) return ["pdf", "docx", "xlsx", "txt"];
    const extension = file.name.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg"].includes(extension)) return ["pdf"];
    if (extension === "pdf") return ["docx", "xlsx", "txt"];
    return ["pdf", "docx", "xlsx", "txt"];
  }, [file]);

  const chooseFile = (selected) => {
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) return toast.error("Please choose a file smaller than 10 MB.");
    setFile(selected);
    const extension = selected.name.split(".").pop().toLowerCase();
    setOutputFormat(["png", "jpg", "jpeg"].includes(extension) ? "pdf" : "pdf");
  };

  const convert = async () => {
    if (!file) return toast.error("Choose a document first.");
    setConverting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("outputFormat", outputFormat);
      const response = await axios.post(API_URL, form, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      const name = file.name.replace(/\.[^/.]+$/, "") || "document";
      link.href = blobUrl;
      link.download = `${name}.${outputFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success("Your converted file is downloading.");
    } catch (error) {
      let message = "We could not convert that file.";
      if (error.response?.data instanceof Blob) {
        try { message = JSON.parse(await error.response.data.text()).error || message; } catch { /* keep default */ }
      }
      toast.error(message);
    } finally { setConverting(false); }
  };

  return <main className="min-h-screen bg-gradient-to-b from-slate-100 to-indigo-100 px-4 py-6 sm:px-8">
    <div className="mx-auto max-w-4xl">
      <nav className="mb-10 flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-indigo-700"><ArrowLeft size={18} /> Back</button>
        <button onClick={() => navigate("/")} className="font-bold text-indigo-700">Marketlence Jobs</button>
      </nav>
      <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-indigo-950/10">
        <div className="bg-gradient-to-r from-indigo-700 to-violet-700 px-6 py-10 text-center text-white sm:px-12">
          <FileText className="mx-auto mb-3" size={40} />
          <h1 className="text-3xl font-extrabold sm:text-4xl">Document Generator</h1>
          <p className="mx-auto mt-3 max-w-2xl text-indigo-100">Convert images, PDF, Word, Excel, CSV, and text files in a few clicks.</p>
        </div>
        <div className="p-6 sm:p-10">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 px-6 py-12 text-center transition hover:border-indigo-500 hover:bg-indigo-50">
            <FileUp className="mb-3 text-indigo-600" size={38} />
            <span className="font-bold text-slate-800">{file ? file.name : "Choose a document or image"}</span>
            <span className="mt-1 text-sm text-slate-500">PDF, DOCX, XLSX, CSV, TXT, JPG, or PNG · maximum 10 MB</span>
            <input className="hidden" type="file" accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg" onChange={(event) => chooseFile(event.target.files?.[0])} />
          </label>
          <div className="mt-7 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block text-sm font-bold text-slate-700">Convert to
              <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-base font-medium outline-none focus:ring-2 focus:ring-indigo-500">
                {formats.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}
              </select>
            </label>
            <button onClick={convert} disabled={!file || converting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white shadow-md transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {converting ? <><RefreshCw size={18} className="animate-spin" /> Converting...</> : <><Download size={18} /> Convert & Download</>}
            </button>
          </div>
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>Note:</b> Image-to-PDF keeps the image layout. Word, Excel, PDF, and text conversions preserve readable content; complex formatting, formulas, and scanned PDFs may need a quick review after conversion.</p>
        </div>
      </section>
    </div>
  </main>;
}

export default DocumentGenerator;
