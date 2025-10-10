import React, { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud, FiXCircle } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// internal import
import useAsync from "hooks/useAsync";
import SettingServices from "services/SettingServices";
import { notifyError, notifySuccess } from "../../utils/toast";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Container from "./Container";

const MAX_SIZE = 5_000_000; // 5MB

const LocalUploader = ({ setImageUrl, imageUrl, product, folder }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { data: globalSetting } = useAsync(SettingServices.getGlobalSetting);

  // Ensure consistent shapes
  const images = product ? (Array.isArray(imageUrl) ? imageUrl : []) : imageUrl || "";

  // Resolve maxFiles once globalSetting loads
  const maxFiles = useMemo(
    () => (product ? (globalSetting?.number_of_image_per_product || 5) : 1),
    [product, globalSetting]
  );

  // Re-init dropzone if constraints change
  const dzKey = useMemo(
    () => `dz-${product ? "multi" : "single"}-${maxFiles}`,
    [product, maxFiles]
  );

  const onDrop = (acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    setLoading(true);
    try {
      if (product) {
        const newUrls = acceptedFiles.map((f) => URL.createObjectURL(f));
        const all = [...images, ...newUrls];

        if (all.length > maxFiles) {
          notifyError(`Maximum ${maxFiles} images can be uploaded!`);
          return;
        }

        setImageUrl(all);

        // Keep raw files for submit
        window.pendingProductImages ??= [];
        window.pendingProductImages.push(...acceptedFiles);
      } else {
        const url = URL.createObjectURL(acceptedFiles[0]);
        setImageUrl(url);
        window.pendingSingleImage = acceptedFiles[0];
      }

      notifySuccess(`${acceptedFiles.length} image(s) ready for upload!`);
    } catch (e) {
      console.error(e);
      notifyError("Error processing images");
    } finally {
      setLoading(false);
    }
  };

  const onDropRejected = (fileRejections) => {
    fileRejections.forEach(({ file, errors }) => {
      errors.forEach((e) => {
        if (e.code === "file-too-large") {
          notifyError(`${file.name}: exceeds 5MB`);
        } else if (e.code === "file-invalid-type") {
          notifyError(`${file.name}: only image files are allowed`);
        } else if (e.code === "too-many-files") {
          notifyError(`Maximum ${maxFiles} images can be uploaded!`);
        } else {
          notifyError(`${file.name}: ${e.message}`);
        }
      });
    });
  };

  // Explicit validator so you ALWAYS get warnings (even on older react-dropzone)
  const validator = (file) => {
    if (!file.type?.startsWith("image/")) {
      return { code: "file-invalid-type", message: "Only image files are allowed." };
    }
    if (file.size > MAX_SIZE) {
      return { code: "file-too-large", message: "File exceeds 5MB limit." };
    }
    return null;
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    // String form works for older versions; validator enforces rules reliably
    accept: "image/*",
    multiple: !!product,
    noClick: true,      // prevent parent interference
    noKeyboard: true,   // we'll handle Enter/Space
    maxSize: MAX_SIZE,
    maxFiles,
    validator,
    onDrop,
    onDropRejected,
  });

  const handleOpenPicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    open();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      open();
    }
  };

  const handleRemoveImage = (img) => {
    try {
      if (product) {
        const list = Array.isArray(images) ? images : [];
        const idx = list.indexOf(img);
        const next = list.filter((i) => i !== img);
        setImageUrl(next);

        if (window.pendingProductImages && idx > -1) {
          window.pendingProductImages.splice(idx, 1);
        }
      } else {
        setImageUrl("");
        window.pendingSingleImage = null;
      }

      if (img?.startsWith("blob:")) URL.revokeObjectURL(img);
      notifySuccess("Image removed successfully!");
    } catch (err) {
      console.error("Error removing image:", err);
      notifyError("Error removing image");
    }
  };

  return (
    <div className="w-full text-center">
      <div
        key={dzKey} /* force re-mount when maxFiles changes */
        className="border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer px-6 pt-5 pb-6"
        {...getRootProps()}
        onClick={handleOpenPicker}
        onKeyDown={handleKey}
        role="button"
        tabIndex={0}
        aria-label={t("DragYourImage")}
      >
        <input {...getInputProps()} />
        <span className="mx-auto flex justify-center">
          <FiUploadCloud className="text-3xl text-green-500" />
        </span>
        <p className="text-sm mt-2">{t("DragYourImage")}</p>
        <em className="text-xs text-gray-400">
          Supports: JPEG, PNG, GIF, WebP (Max 5MB each)
        </em>
        {product && (
          <p className="text-xs text-gray-500 mt-1">
            {Array.isArray(images) ? images.length : 0} / {maxFiles} {t("images selected")}.
          </p>
        )}
        <div className="mt-3">
          <button
            type="button"
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white"
            onClick={handleOpenPicker}
          >
            {t("Browse")}
          </button>
        </div>
      </div>

      {loading && <div className="text-green-500 mt-2">Processing images...</div>}

      <aside className="flex flex-row flex-wrap mt-4">
        {product ? (
          Array.isArray(images) && images.length ? (
            <DndProvider backend={HTML5Backend}>
              <Container
                setImageUrl={setImageUrl}
                imageUrl={images}
                handleRemoveImage={handleRemoveImage}
              />
            </DndProvider>
          ) : (
            <div className="text-gray-500 text-sm">No images uploaded yet</div>
          )
        ) : images ? (
          <div className="relative">
            <img
              className="inline-flex border rounded-md border-gray-100 dark:border-gray-600 w-24 max-h-24 p-2"
              src={images}
              alt="product"
            />
            <button
              type="button"
              className="absolute top-0 right-0 text-red-500 focus:outline-none"
              onClick={() => handleRemoveImage(images)}
            >
              <FiXCircle />
            </button>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No image uploaded yet</div>
        )}
      </aside>

      {((Array.isArray(images) && images.length > 0) || images) && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
          📝 Images will be uploaded when you save the product
        </div>
      )}
    </div>
  );
};

export default LocalUploader;
