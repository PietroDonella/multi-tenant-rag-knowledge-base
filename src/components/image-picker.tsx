"use client";

import { useEffect, useRef, useState } from "react";

type Shape = "circle" | "banner";

const FRAME = {
  circle: { width: 420, height: 420, crop: 280 },
  banner: { width: 640, height: 280, cropWidth: 560, cropHeight: 160 },
};

export function ImagePicker({
  name,
  label,
  shape,
  initialUrl,
}: {
  name: string;
  label: string;
  shape: Shape;
  initialUrl?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [source, setSource] = useState<string | null>(null);

  return (
    <div className="block text-sm font-medium">
      <span>{label}</span>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {preview ? (
          <img
            src={preview}
            alt=""
            className={
              shape === "circle"
                ? "h-20 w-20 rounded-full object-cover"
                : "h-16 w-40 rounded-lg object-cover"
            }
          />
        ) : (
          <span
            className={
              shape === "circle"
                ? "flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-[var(--line)] text-xs font-normal text-stone-500"
                : "flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-[var(--line)] text-xs font-normal text-stone-500"
            }
          >
            Sem imagem
          </span>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)]"
        >
          {shape === "circle" ? "Escolher foto" : "Escolher banner"}
        </button>
      </div>
      <input
        ref={fileRef}
        name={name}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setSource(URL.createObjectURL(file));
        }}
      />
      {source ? (
        <CropDialog
          src={source}
          shape={shape}
          onCancel={() => {
            URL.revokeObjectURL(source);
            setSource(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
          onConfirm={(file) => {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            if (fileRef.current) fileRef.current.files = transfer.files;
            setPreview(URL.createObjectURL(file));
            URL.revokeObjectURL(source);
            setSource(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CropDialog({
  src,
  shape,
  onCancel,
  onConfirm,
}: {
  src: string;
  shape: Shape;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const frame = shape === "circle" ? FRAME.circle : FRAME.banner;
  const cropWidth = shape === "circle" ? FRAME.circle.crop : FRAME.banner.cropWidth;
  const cropHeight = shape === "circle" ? FRAME.circle.crop : FRAME.banner.cropHeight;
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  const swapped = rotation % 180 !== 0;
  const visualW = image ? (swapped ? image.naturalHeight : image.naturalWidth) : 1;
  const visualH = image ? (swapped ? image.naturalWidth : image.naturalHeight) : 1;
  const base = image ? Math.max(cropWidth / visualW, cropHeight / visualH) : 1;
  const drawnW = image ? image.naturalWidth * base : 0;
  const drawnH = image ? image.naturalHeight * base : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 p-4 text-white">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Editar imagem</p>
          <button type="button" onClick={onCancel} className="px-2 text-lg" aria-label="Fechar">
            ×
          </button>
        </div>
        <div
          className="relative mx-auto overflow-hidden bg-neutral-800"
          style={{ width: frame.width, height: frame.height, maxWidth: "100%" }}
          onPointerDown={(event) => {
            drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setPan({
              x: drag.current.panX + event.clientX - drag.current.x,
              y: drag.current.panY + event.clientY - drag.current.y,
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          {image ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                width: drawnW,
                height: drawnH,
                left: frame.width / 2 - drawnW / 2 + pan.x,
                top: frame.height / 2 - drawnH / 2 + pan.y,
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: "center center",
              }}
            />
          ) : null}
          <div
            className="pointer-events-none absolute overflow-hidden border-2 border-white"
            style={{
              width: cropWidth,
              height: cropHeight,
              left: (frame.width - cropWidth) / 2,
              top: (frame.height - cropHeight) / 2,
              borderRadius: shape === "circle" ? "999px" : "12px",
              boxShadow: "0 0 0 999px rgba(0,0,0,0.55)",
            }}
          >
            <span className="absolute inset-y-0 left-1/3 w-px bg-white/80" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-white/80" />
            <span className="absolute inset-x-0 top-1/3 h-px bg-white/80" />
            <span className="absolute inset-x-0 top-2/3 h-px bg-white/80" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span aria-hidden className="text-xs">−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(event) => setZoom(Number(event.target.value))}
            className="min-w-0 flex-1"
          />
          <span aria-hidden className="text-xs">+</span>
          <button
            type="button"
            onClick={() => setRotation((value) => (value + 90) % 360)}
            className="rounded-lg border border-white/30 px-3 py-2 text-sm"
          >
            Girar
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-900"
            onClick={() => {
              if (!image) return;
              const file = exportCrop({
                image,
                shape,
                zoom,
                rotation,
                pan,
                cropWidth,
                cropHeight,
                base,
              });
              onConfirm(file);
            }}
          >
            Usar esta área
          </button>
        </div>
      </div>
    </div>
  );
}

function exportCrop({
  image,
  shape,
  zoom,
  rotation,
  pan,
  cropWidth,
  cropHeight,
  base,
}: {
  image: HTMLImageElement;
  shape: Shape;
  zoom: number;
  rotation: number;
  pan: { x: number; y: number };
  cropWidth: number;
  cropHeight: number;
  base: number;
}) {
  const outW = shape === "circle" ? 512 : 1400;
  const outH = shape === "circle" ? 512 : 400;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const context = canvas.getContext("2d");
  if (!context) return new File([], "image.jpg", { type: "image/jpeg" });

  const scaleX = outW / cropWidth;
  const scaleY = outH / cropHeight;
  context.translate(outW / 2 + pan.x * scaleX, outH / 2 + pan.y * scaleY);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(zoom * base * scaleX, zoom * base * scaleY);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  const blob = dataUrlToBlob(canvas.toDataURL("image/jpeg", 0.92));
  return new File([blob], shape === "circle" ? "foto.jpg" : "banner.jpg", { type: "image/jpeg" });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}
