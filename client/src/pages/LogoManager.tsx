import { useState, useRef, useEffect } from "react";
import { Upload, Trash2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

interface Logo {
  name: string;
  path: string;
}

export default function LogoManager() {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<{ file: File; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteLogoMutation = trpc.logo.deleteLogo.useMutation();
  const { data: logosData } = trpc.logo.listLogos.useQuery();

  useEffect(() => {
    if (logosData?.logos) {
      setLogos(logosData.logos);
    }
  }, [logosData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Apenas arquivos PNG, JPG e JPEG são permitidos");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo não pode exceder 5MB");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);

    const logoName = file.name;
    const exists = logos.some((logo) => logo.name === logoName);

    if (exists) {
      setConfirmReplace({ file, name: logoName });
    } else {
      uploadLogo(file);
    }
  };

  const uploadLogo = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/logo/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer upload do logo");
      }

      setSuccess(`Logo "${file.name}" enviado com sucesso!`);
      setSelectedFile(null);
      setConfirmReplace(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLogo = async (logoName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteLogoMutation.mutateAsync({ logoName });
      setSuccess(`Logo "${logoName}" deletado com sucesso!`);
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar logo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">

      {/* BOTÃO VOLTAR */}
      <div>
        <Button
          onClick={() => window.location.href = "/"}
          variant="outline"
          className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <Card className="p-6 bg-slate-900 border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">Gerenciador de Logos</h2>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300 mb-4">
              Clique para selecionar um arquivo ou arraste aqui
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Enviando..." : "Selecionar Logo"}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-300">
              <CheckCircle2 className="w-5 h-5" />
              {success}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-slate-900 border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Logos Disponíveis</h3>

        {logos.filter(logo => logo.name !== 'blank.png').length === 0 ? (
          <p className="text-slate-400">Nenhum logo disponível</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {logos.filter(logo => logo.name !== 'blank.png').map((logo) => (
              <div
                key={logo.name}
                className="relative group bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition"
              >
                <img
                  src={`/logos/${logo.name}`}
                  alt={logo.name}
                  className="w-full h-32 object-contain mb-2"
                />
                <p className="text-sm text-slate-300 truncate">{logo.name}</p>

                <button
                  onClick={() => setConfirmDelete(logo.name)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-red-600 hover:bg-red-700 p-2 rounded"
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}
