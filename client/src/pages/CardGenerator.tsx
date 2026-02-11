import { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle2, AlertCircle, Download, Hourglass, Moon, Sun } from "lucide-react";

interface ProgressData {
  total: number;
  processed: number;
  percentage: number;
  currentCard: string;
}

export default function CardGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isDark, setIsDark] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const generateCardsMutation = trpc.card.generateCards.useMutation();

  useEffect(() => {
    const socket = io({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      socket.emit("join", sessionId);
    });

    socket.on("progress", (data: ProgressData) => {
      setProgress(data);
    });

    socket.on("error", (message: string) => {
      setError(message);
      setIsProcessing(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx")) {
      setError("Por favor, selecione um arquivo .xlsx válido");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("O arquivo não pode exceder 10MB");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setZipPath(null);
    setProgress(null);
  };

  // 🔥 DRAG & DROP
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.name.endsWith(".xlsx")) {
      setError("Por favor, selecione um arquivo .xlsx válido");
      return;
    }

    if (droppedFile.size > 10 * 1024 * 1024) {
      setError("O arquivo não pode exceder 10MB");
      return;
    }

    setFile(droppedFile);
    setError(null);
    setZipPath(null);
    setProgress(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, selecione um arquivo");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(null);
    setZipPath(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Erro ao fazer upload do arquivo");
      }

      const { filePath } = await uploadResponse.json();

      const result = await generateCardsMutation.mutateAsync({
        filePath,
        sessionId,
      });

      if (result.success) {
        setZipPath(result.zipPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    } finally {
      setIsProcessing(false);
    }
  };

  const bgColor = isDark ? "bg-slate-950" : "bg-gradient-to-br from-slate-50 to-blue-50";
  const cardBg = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const accentColor = isDark ? "text-blue-400" : "text-blue-600";
  const uploadBg = isDark ? "bg-slate-800" : "bg-blue-50";
  const uploadBorder = isDark ? "border-slate-600 hover:border-slate-500" : "border-blue-300 hover:border-blue-400";

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${bgColor}`}>
      <div className="max-w-5xl mx-auto">

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className={`${cardBg} rounded-2xl p-8 shadow-xl border ${borderColor} transition-all duration-300`}>

              {!isProcessing && !zipPath && (
                <div className="space-y-6">

                  {/* UPLOAD AREA */}
                  <div
                    onClick={() => document.getElementById("file-input")?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      border-2 border-dashed ${uploadBorder} rounded-xl p-12 text-center cursor-pointer transition-all duration-300
                      ${uploadBg}
                      ${isDragging ? "ring-4 ring-blue-500/50 scale-[1.02]" : ""}
                    `}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <Upload className={`w-8 h-8 ${accentColor}`} />
                      <div>
                        <p className={`font-semibold ${textPrimary}`}>
                          Clique ou arraste seu arquivo
                        </p>
                        <p className={`text-sm ${textSecondary} mt-1`}>
                          Apenas arquivos .xlsx (máximo 10MB)
                        </p>
                      </div>
                    </div>
                    <input
                      id="file-input"
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {error && (
                    <div className="text-red-500 text-center">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleUpload}
                    disabled={!file}
                    className="w-full"
                  >
                    Processar Planilha
                  </Button>

                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
