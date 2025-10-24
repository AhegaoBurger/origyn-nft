import React, { useState } from "react";

const MintingForm = ({
  coreNftActor,
  storageActor,
  onMintSuccess,
  showAlert,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: null,
    imagePreview: "",
    attributes: [],
  });
  const [isMinting, setIsMinting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showAlert("Image size must be less than 10MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({
        ...prev,
        image: file,
        imagePreview: e.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    if (!storageActor || !formData.image) return null;

    setIsUploading(true);
    try {
      console.log("Starting image upload...");
      console.log("Storage actor available:", !!storageActor);
      console.log("File info:", {
        name: formData.image.name,
        size: formData.image.size,
        type: formData.image.type,
      });

      const chunks = [];
      const chunkSize = 1024 * 1024; // 1MB chunks
      const arrayBuffer = await formData.image.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      console.log("File converted to bytes, total size:", bytes.length);

      for (let i = 0; i < bytes.length; i += chunkSize) {
        chunks.push(bytes.slice(i, i + chunkSize));
      }

      console.log("File divided into", chunks.length, "chunks");

      const fileName = `${Date.now()}_${formData.image.name}`;
      const fileHash = ""; // Calculate hash if needed
      const fileSize = BigInt(bytes.length);

      console.log("Initializing upload for file:", fileName);

      const initResult = await storageActor.init_upload({
        file_path: fileName,
        file_hash: fileHash,
        file_size: fileSize,
        chunk_size: [BigInt(1024 * 1024)], // 1MB chunks wrapped in Some
      });

      if ("Err" in initResult) {
        const errorVariant = initResult.Err;
        const errorType = Object.keys(errorVariant)[0];
        throw new Error(`Upload initialization failed: ${errorType}`);
      }

      console.log("Upload initialized successfully");

      for (let i = 0; i < chunks.length; i++) {
        console.log(`Uploading chunk ${i + 1}/${chunks.length}`);

        const chunkResult = await storageActor.store_chunk({
          file_path: fileName,
          chunk_id: BigInt(i),
          chunk_data: chunks[i],
        });

        if ("Err" in chunkResult) {
          const errorVariant = chunkResult.Err;
          const errorType = Object.keys(errorVariant)[0];
          throw new Error(`Chunk upload failed: ${errorType}`);
        }
      }

      console.log("All chunks uploaded, finalizing...");

      const finalizeResult = await storageActor.finalize_upload({
        file_path: fileName,
      });

      if ("Err" in finalizeResult) {
        const errorVariant = finalizeResult.Err;
        const errorType = Object.keys(errorVariant)[0];
        throw new Error(`Upload finalization failed: ${errorType}`);
      }

      console.log("Upload completed successfully, URL:", finalizeResult.Ok.url);
      return finalizeResult.Ok.url;
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      showAlert(`Failed to upload image: ${error.message}`, "error");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const addAttribute = () => {
    setFormData((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: "", value: "" }],
    }));
  };

  const updateAttribute = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === index ? { ...attr, [field]: value } : attr,
      ),
    }));
  };

  const removeAttribute = (index) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      showAlert("Please fill in all required fields", "error");
      return;
    }

    setIsMinting(true);
    setCurrentStep(2);

    try {
      let imageUrl = "";

      if (formData.image) {
        imageUrl = await uploadImage();
        if (!imageUrl && formData.image) {
          setCurrentStep(1);
          return;
        }
      }

      setCurrentStep(3);

      const metadata = [
        ["name", { Text: formData.name }],
        ["description", { Text: formData.description }],
        ["minted_at", { Text: new Date().toISOString() }],
      ];

      if (imageUrl) {
        metadata.push(["image", { Text: imageUrl }]);
      }

      formData.attributes.forEach((attr) => {
        if (attr.trait_type && attr.value) {
          metadata.push([attr.trait_type, { Text: attr.value }]);
        }
      });

      const result = await coreNftActor.icrc7_mint({
        to: { owner: "owner", subaccount: [] },
        memo: [],
        token_metadata: metadata,
        created_at: [],
      });

      if (result.err) {
        throw new Error(`Minting failed: ${result.err}`);
      }

      showAlert("NFT minted successfully!", "success");
      onMintSuccess();

      // Reset form
      setFormData({
        name: "",
        description: "",
        image: null,
        imagePreview: "",
        attributes: [],
      });
      setCurrentStep(1);
    } catch (error) {
      console.error("Minting error:", error);
      showAlert(`Minting failed: ${error.message}`, "error");
      setCurrentStep(1);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="card">
      <h2>Mint New NFT</h2>

      {isMinting && (
        <div className="alert alert-info">
          <div>Step {currentStep} of 3:</div>
          {currentStep === 1 && "Preparing metadata..."}
          {currentStep === 2 && "Uploading image..."}
          {currentStep === 3 && "Minting NFT..."}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">NFT Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter NFT name"
            disabled={isMinting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your NFT"
            disabled={isMinting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Image (Optional)</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isMinting}
          />
          {formData.imagePreview && (
            <div style={{ marginTop: "10px" }}>
              <img
                src={formData.imagePreview}
                alt="Preview"
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  borderRadius: "8px",
                  border: "2px solid #e1e5e9",
                }}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Attributes (Optional)</label>
          {formData.attributes.map((attr, index) => (
            <div
              key={index}
              style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
            >
              <input
                type="text"
                placeholder="Trait type"
                value={attr.trait_type}
                onChange={(e) =>
                  updateAttribute(index, "trait_type", e.target.value)
                }
                disabled={isMinting}
                style={{ flex: 1 }}
              />
              <input
                type="text"
                placeholder="Value"
                value={attr.value}
                onChange={(e) =>
                  updateAttribute(index, "value", e.target.value)
                }
                disabled={isMinting}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeAttribute(index)}
                disabled={isMinting}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={addAttribute}
            disabled={isMinting}
          >
            Add Attribute
          </button>
        </div>

        <button
          type="submit"
          className="btn"
          disabled={isMinting || isUploading}
        >
          {isMinting ? "Minting..." : "Mint NFT"}
        </button>
      </form>
    </div>
  );
};

export default MintingForm;
