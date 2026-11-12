import React, { useMemo, useState } from "react";
import axios from "axios";
import { ArrowLeft, Download, FileText, FileUp, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_URL = "https://humorous-fulfillment-production-1f5e.up.railway.app/api/document-generator/convert";

function DocumentGenerator() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [converting, setConverting] = useState(false);

  const formats = useMemo(() => {
    if (!files.length) return ["pdf", "docx", "xlsx", "txt"];
    if (files.length > 1) return ["pdf"];
    const extension = files[0].name.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg"].includes(extension)) return ["pdf"];
    if (extension === "pdf") return ["docx", "xlsx", "txt"];
    return ["pdf", "docx", "xlsx", "txt"];
  }, [files]);

  const chooseFiles = (selectedFiles, { appendImages = false } = {}) => {
    const selected = Array.from(selectedFiles || []);
    if (!selected.length) return;
    if (selected.some((item) => item.size > 10 * 1024 * 1024)) return toast.error("Each file must be smaller than 10 MB.");
    const allImages = selected.every((item) => item.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(item.name));
    if (appendImages && !allImages) return toast.error("Only JPG and PNG images can be added to the PDF.");
    if (appendImages) {
      const existingImages = files.every((item) => item.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(item.name)) ? files : [];
      const combined = [...existingImages, ...selected];
      if (combined.length > 20) return toast.error("Choose up to 20 images per PDF.");
      setFiles(combined);
    } else {
      setFiles([selected[0]]);
    }
    setOutputFormat("pdf");
  };

  const convert = async () => {
    if (!files.length) return toast.error("Choose a document or images first.");
    setConverting(true);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      form.append("outputFormat", outputFormat);
      const response = await axios.post(API_URL, form, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      const name = files.length > 1 ? "marketlence-images" : (files[0].name.replace(/\.[^/.]+$/, "") || "document");
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
          <h1 className="text-3xl font-extrabold sm:text-4xl">Docs Converter</h1>
          <p className="mx-auto mt-3 max-w-2xl text-indigo-100">Convert images, PDF, Word, Excel, CSV, and text files in a few clicks.</p>
        </div>
        <div className="p-6 sm:p-10">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 px-6 py-12 text-center transition hover:border-indigo-500 hover:bg-indigo-50">
            <FileUp className="mb-3 text-indigo-600" size={38} />
            <span className="font-bold text-slate-800">{files.length ? files.length + " file" + (files.length === 1 ? "" : "s") + " selected" : "Select images for PDF"}</span>
            <span className="mt-1 text-sm text-slate-500">Choose one or several JPG/PNG images, then add more if needed · maximum 10 MB each</span>
            <input className="hidden" type="file" multiple accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => { chooseFiles(event.target.files, { appendImages: true }); event.target.value = ""; }} />
          </label>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or</span>
            <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50">
              Choose one document
              <input className="hidden" type="file" accept=".pdf,.docx,.xlsx,.xls,.csv,.txt" onChange={(event) => { chooseFiles(event.target.files); event.target.value = ""; }} />
            </label>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          {files.length > 0 && <div className="mt-4 space-y-2" aria-label="Selected files">
            {files.map((selectedFile, index) => <div key={[selectedFile.name, selectedFile.lastModified, index].join("-")} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{selectedFile.name}</span>
              <button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label={"Remove " + selectedFile.name}><X size={17} /></button>
            </div>)}
            {files.length > 1 && <p className="px-1 text-xs text-slate-500">PDF pages will follow this order.</p>}
            {files.length < 20 && files.every((item) => item.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(item.name)) && (
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 font-bold text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-100">
                <FileUp size={18} /> Add more images
                <input className="hidden" type="file" multiple accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => { chooseFiles(event.target.files, { appendImages: true }); event.target.value = ""; }} />
              </label>
            )}
          </div>}
          <div className="mt-7 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block text-sm font-bold text-slate-700">Convert to
              <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-base font-medium outline-none focus:ring-2 focus:ring-indigo-500">
                {formats.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}
              </select>
            </label>
            <button onClick={convert} disabled={!files.length || converting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white shadow-md transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {converting ? <><RefreshCw size={18} className="animate-spin" /> Converting...</> : <><Download size={18} /> Convert & Download</>}
            </button>
          </div>
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>Note:</b> Each selected image becomes one PDF page in the order shown above. Word, Excel, PDF, and text conversions preserve readable content; complex formatting, formulas, and scanned PDFs may need a quick review after conversion.</p>
        </div>
      </section>
    </div>
  </main>;
}

export default DocumentGenerator;
