import React, { useState, useEffect } from "react";

const MintingForm = ({
  coreNftActor,
  principal,
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
  const [permissions, setPermissions] = useState({
    hasMinting: false,
    hasUpdateUploads: false,
    loading: true,
    checked: false,
    checkFailed: false,
    errorMessage: "",
  });

  // Check user permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      if (!coreNftActor || !principal) {
        console.log("Permission check skipped - no actor or principal");
        return;
      }

      console.log("=== Checking User Permissions ===");
      console.log("Principal:", principal.toString());

      try {
        setPermissions((prev) => ({ ...prev, loading: true }));

        // Check if user has Minting permission
        const mintingResult = await coreNftActor.has_permission({
          principal: principal,
          permission: { Minting: null },
        });

        console.log("Minting permission result:", mintingResult);

        // Check if user has UpdateUploads permission
        const uploadResult = await coreNftActor.has_permission({
          principal: principal,
          permission: { UpdateUploads: null },
        });

        console.log("UpdateUploads permission result:", uploadResult);

        const hasMinting = "Ok" in mintingResult && mintingResult.Ok === true;
        const hasUpdateUploads = "Ok" in uploadResult && uploadResult.Ok === true;

        console.log("Permissions summary:", { hasMinting, hasUpdateUploads });

        setPermissions({
          hasMinting,
          hasUpdateUploads,
          loading: false,
          checked: true,
        });

        // Show warnings if missing permissions
        if (!hasMinting || !hasUpdateUploads) {
          const missingPerms = [];
          if (!hasMinting) missingPerms.push("Minting");
          if (!hasUpdateUploads) missingPerms.push("UpdateUploads");
          console.warn(`Missing permissions: ${missingPerms.join(", ")}`);
        }
      } catch (error) {
        console.error("Error checking permissions:", error);

        // Check if error is due to missing ManageAuthorities permission
        const isManageAuthError = error.message &&
          error.message.includes("manage authorities permission");

        if (isManageAuthError) {
          console.warn("Unable to check permissions - missing ManageAuthorities permission");
          console.warn("Assuming user has permissions; actual operations will fail if not permitted");

          // Optimistically assume user has permissions
          // The actual operations will fail with clear errors if they don't
          setPermissions({
            hasMinting: true,
            hasUpdateUploads: true,
            loading: false,
            checked: true,
            checkFailed: true,
            errorMessage: "Unable to verify permissions (missing ManageAuthorities). Operations will proceed optimistically.",
          });
        } else {
          // Other error - assume no permissions for safety
          console.error("Permission check failed with unexpected error");
          setPermissions({
            hasMinting: false,
            hasUpdateUploads: false,
            loading: false,
            checked: true,
            checkFailed: true,
            errorMessage: `Permission check failed: ${error.message}`,
          });
        }
      }
    };

    checkPermissions();
  }, [coreNftActor, principal]);

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

  // Helper function to calculate SHA-256 hash
  const calculateHash = async (arrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const uploadImage = async () => {
    if (!coreNftActor || !formData.image) {
      console.log("Upload skipped - no coreNftActor or no image selected");
      return null;
    }

    setIsUploading(true);
    console.log("=== Starting Image Upload ===");
    showAlert("Starting image upload...", "info");

    try {
      console.log("Core NFT actor available:", !!coreNftActor);
      console.log("File info:", {
        name: formData.image.name,
        size: formData.image.size,
        type: formData.image.type,
      });

      // Convert file to bytes
      const arrayBuffer = await formData.image.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      console.log("File converted to bytes, total size:", bytes.length);

      // Calculate file hash
      const fileHash = await calculateHash(arrayBuffer);
      console.log("File hash calculated:", fileHash);

      // Prepare chunks
      const chunkSize = 1024 * 1024; // 1MB chunks
      const chunks = [];
      for (let i = 0; i < bytes.length; i += chunkSize) {
        chunks.push(bytes.slice(i, i + chunkSize));
      }
      console.log("File divided into", chunks.length, "chunks");

      const fileName = `${Date.now()}_${formData.image.name}`;
      const fileSize = BigInt(bytes.length);

      // Step 1: Initialize upload
      console.log("Initializing upload for file:", fileName);
      showAlert(`Initializing upload for ${formData.image.name}...`, "info");

      const initResult = await coreNftActor.init_upload({
        file_path: fileName,
        file_hash: fileHash,
        file_size: fileSize,
        chunk_size: [BigInt(chunkSize)], // Optional chunk size
      });

      console.log("Init upload result:", initResult);

      if ("Err" in initResult) {
        const errorVariant = initResult.Err;
        const errorType = Object.keys(errorVariant)[0];
        throw new Error(`Upload initialization failed: ${errorType}`);
      }

      console.log("Upload initialized successfully");
      showAlert("Upload initialized, uploading chunks...", "info");

      // Step 2: Upload chunks
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Uploading chunk ${i + 1}/${chunks.length} (${chunks[i].length} bytes)`);
        showAlert(`Uploading chunk ${i + 1}/${chunks.length}...`, "info");

        const chunkResult = await coreNftActor.store_chunk({
          file_path: fileName,
          chunk_id: BigInt(i),
          chunk_data: Array.from(chunks[i]), // Convert Uint8Array to Array
        });

        console.log(`Chunk ${i + 1} result:`, chunkResult);

        if ("Err" in chunkResult) {
          const errorVariant = chunkResult.Err;
          const errorType = Object.keys(errorVariant)[0];
          throw new Error(`Chunk ${i + 1} upload failed: ${errorType}`);
        }
      }

      console.log("All chunks uploaded successfully, finalizing...");
      showAlert("Finalizing upload...", "info");

      // Step 3: Finalize upload
      const finalizeResult = await coreNftActor.finalize_upload({
        file_path: fileName,
      });

      console.log("Finalize result:", finalizeResult);

      if ("Err" in finalizeResult) {
        const errorVariant = finalizeResult.Err;
        const errorType = Object.keys(errorVariant)[0];
        throw new Error(`Upload finalization failed: ${errorType}`);
      }

      const imageUrl = finalizeResult.Ok.url;
      console.log("=== Upload Completed Successfully ===");
      console.log("Image URL:", imageUrl);
      showAlert("Image uploaded successfully!", "success");

      return imageUrl;
    } catch (error) {
      console.error("=== Upload Error ===");
      console.error("Error:", error);
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
    console.log("=== Mint NFT Button Clicked ===");

    if (!formData.name || !formData.description) {
      console.log("Form validation failed - missing required fields");
      showAlert("Please fill in all required fields", "error");
      return;
    }

    if (!coreNftActor) {
      console.error("No core NFT actor available");
      showAlert("NFT canister not initialized. Please reconnect.", "error");
      return;
    }

    if (!principal) {
      console.error("No principal available");
      showAlert("User principal not available. Please reconnect.", "error");
      return;
    }

    console.log("Form data:", {
      name: formData.name,
      description: formData.description,
      hasImage: !!formData.image,
      attributesCount: formData.attributes.length,
    });
    console.log("User principal:", principal.toString());

    setIsMinting(true);
    setCurrentStep(2);

    try {
      let imageUrl = "";

      // Step 1: Upload image if provided
      if (formData.image) {
        console.log("Image selected, starting upload...");
        imageUrl = await uploadImage();
        if (!imageUrl && formData.image) {
          console.error("Image upload failed, aborting mint");
          setCurrentStep(1);
          return;
        }
        console.log("Image upload complete, URL:", imageUrl);
      } else {
        console.log("No image selected, skipping upload");
      }

      // Step 2: Prepare metadata
      setCurrentStep(3);
      console.log("=== Preparing NFT Metadata ===");

      const metadata = [
        ["name", { Text: formData.name }],
        ["description", { Text: formData.description }],
        ["minted_at", { Text: new Date().toISOString() }],
      ];

      if (imageUrl) {
        metadata.push(["image", { Text: imageUrl }]);
        console.log("Image URL added to metadata:", imageUrl);
      }

      formData.attributes.forEach((attr) => {
        if (attr.trait_type && attr.value) {
          metadata.push([attr.trait_type, { Text: attr.value }]);
          console.log(`Attribute added: ${attr.trait_type} = ${attr.value}`);
        }
      });

      console.log("Final metadata:", metadata);

      // Step 3: Mint NFT
      console.log("=== Calling Mint Function ===");
      showAlert("Minting NFT...", "info");

      const mintRequest = {
        mint_requests: [
          {
            metadata: metadata,
            token_owner: {
              owner: principal,
              subaccount: [],
            },
            memo: [],
          },
        ],
      };

      console.log("Mint request:", mintRequest);

      const result = await coreNftActor.mint(mintRequest);

      console.log("Mint result:", result);

      // Check for errors in the Result type
      if ("Err" in result) {
        const errorVariant = result.Err;
        const errorType = Object.keys(errorVariant)[0];
        const errorMessage = JSON.stringify(errorVariant[errorType]);
        throw new Error(`Minting failed: ${errorType} - ${errorMessage}`);
      }

      if ("Ok" in result) {
        const tokenIds = result.Ok;
        console.log("=== NFT Minted Successfully ===");
        console.log("Token IDs:", tokenIds);
        showAlert(`NFT minted successfully! Token ID: ${tokenIds[0]}`, "success");
      }

      onMintSuccess();

      // Reset form
      console.log("Resetting form");
      setFormData({
        name: "",
        description: "",
        image: null,
        imagePreview: "",
        attributes: [],
      });
      setCurrentStep(1);
    } catch (error) {
      console.error("=== Minting Error ===");
      console.error("Error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      showAlert(`Minting failed: ${error.message}`, "error");
      setCurrentStep(1);
    } finally {
      setIsMinting(false);
      console.log("=== Mint Process Complete ===");
    }
  };

  return (
    <div className="card">
      <h2>Mint New NFT</h2>

      {/* Permission warnings */}
      {permissions.checked && !permissions.loading && (
        <>
          {permissions.checkFailed && permissions.hasMinting && permissions.hasUpdateUploads ? (
            <div className="alert alert-info">
              ℹ {permissions.errorMessage}
              <br />
              <small>You can still try to mint - if you lack permissions, you'll see a clear error message.</small>
            </div>
          ) : null}
          {!permissions.checkFailed && !permissions.hasMinting && (
            <div className="alert alert-error">
              <strong>Missing Permission:</strong> You don't have Minting permission.
              <br />
              Please contact the canister administrator to grant you the "Minting" permission.
            </div>
          )}
          {!permissions.checkFailed && !permissions.hasUpdateUploads && (
            <div className="alert alert-error">
              <strong>Missing Permission:</strong> You don't have UpdateUploads permission.
              <br />
              Image uploads will be disabled. Contact the administrator to grant you the "UpdateUploads" permission.
            </div>
          )}
          {!permissions.checkFailed && permissions.hasMinting && permissions.hasUpdateUploads && (
            <div className="alert alert-success">
              ✓ All permissions verified - Ready to mint!
            </div>
          )}
          {permissions.checkFailed && !permissions.hasMinting && (
            <div className="alert alert-error">
              <strong>Permission Check Failed:</strong> {permissions.errorMessage}
              <br />
              Unable to determine your permissions. Operations may fail.
            </div>
          )}
        </>
      )}

      {permissions.loading && (
        <div className="alert alert-info">
          Checking permissions...
        </div>
      )}

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
          <label htmlFor="image">
            Image (Optional)
            {!permissions.hasUpdateUploads && permissions.checked && (
              <span style={{ color: "#e74c3c", marginLeft: "8px", fontSize: "0.9em" }}>
                - Upload disabled (missing permission)
              </span>
            )}
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isMinting || !permissions.hasUpdateUploads}
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
          disabled={isMinting || isUploading || !permissions.hasMinting}
          title={!permissions.hasMinting ? "Missing Minting permission" : ""}
        >
          {isMinting ? "Minting..." : !permissions.hasMinting ? "Mint NFT (No Permission)" : "Mint NFT"}
        </button>
      </form>
    </div>
  );
};

export default MintingForm;
