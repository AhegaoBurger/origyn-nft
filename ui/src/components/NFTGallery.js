import React from "react";

const NFTGallery = ({ nfts, loading, onRefresh }) => {
  // Helper function to check if URL is a video by extension
  const isVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Helper function to rewrite mainnet URLs to localhost for local development
  const rewriteUrlForLocal = (url) => {
    if (!url) return url;

    // Check if we're in local development mode
    const isLocal = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

    if (isLocal && url.includes('.raw.icp0.io')) {
      // Extract canister ID from URL like: https://uxrrr-q7777-77774-qaaaq-cai.raw.icp0.io/path
      const match = url.match(/https?:\/\/([a-z0-9-]+)\.raw\.icp0\.io\/(.+)/);
      if (match) {
        const canisterId = match[1];
        const path = match[2];
        const localUrl = `http://${canisterId}.localhost:4943/${path}`;
        console.log(`[URL Rewrite] ${url} -> ${localUrl}`);
        return localUrl;
      }
    }

    return url;
  };

  const getMetadataValue = (metadata, key) => {
    console.log(`[getMetadataValue] Looking for key: "${key}"`);
    console.log(`[getMetadataValue] Full metadata array:`, metadata);
    console.log(`[getMetadataValue] JSON stringified:`, JSON.stringify(metadata));
    console.log(`[getMetadataValue] Array.isArray(metadata):`, Array.isArray(metadata));
    console.log(`[getMetadataValue] metadata.length:`, metadata.length);
    if (metadata.length > 0) {
      console.log(`[getMetadataValue] First element:`, metadata[0]);
      console.log(`[getMetadataValue] First element type:`, typeof metadata[0], Array.isArray(metadata[0]));
    }

    const item = metadata.find(([k]) => k === key);
    console.log(`[getMetadataValue] Found item for "${key}":`, item);

    if (item) {
      const value = item[1].Text || item[1].Nat || item[1].Int || "";
      console.log(`[getMetadataValue] Extracted value for "${key}":`, value);
      return value;
    }

    console.log(`[getMetadataValue] No item found for "${key}", returning empty string`);
    return "";
  };

  if (loading) {
    return (
      <div className="card">
        <h2>My NFT Collection</h2>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2>My NFT Collection ({nfts.length})</h2>
        <button className="btn btn-secondary" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {nfts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            You don't have any NFTs yet. Start by minting your first NFT!
          </p>
          <div
            style={{
              width: "100px",
              height: "100px",
              margin: "0 auto",
              backgroundColor: "#f8f9fa",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              color: "#ddd",
            }}
          >
            🎨
          </div>
        </div>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft) => {
            console.log("=== Rendering NFT ===");
            console.log("NFT ID:", nft.id.toString());
            console.log("Full NFT object:", nft);
            console.log("Raw metadata:", nft.metadata);

            const name = getMetadataValue(nft.metadata, "name");
            const description = getMetadataValue(nft.metadata, "description");
            const imageUrl = getMetadataValue(nft.metadata, "image");
            const mintedAt = getMetadataValue(nft.metadata, "minted_at");

            // Rewrite image URL for local development
            const displayImageUrl = rewriteUrlForLocal(imageUrl);

            console.log("Extracted values:", { name, description, imageUrl, mintedAt });
            console.log("Display image URL:", displayImageUrl);
            console.log("===================");

            const isVideo = isVideoUrl(imageUrl);

            return (
              <div key={nft.id.toString()} className="nft-card">
                {displayImageUrl ? (
                  isVideo ? (
                    <video
                      src={displayImageUrl}
                      className="nft-image"
                      controls
                      muted
                      loop
                      playsInline
                      onLoadedData={(e) => {
                        console.log(`✓ Video loaded successfully for NFT ${nft.id}:`, displayImageUrl);
                      }}
                      onError={(e) => {
                        console.error(`✗ Video failed to load for NFT ${nft.id}:`, displayImageUrl);
                        console.error("Error event:", e);
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : (
                    <img
                      src={displayImageUrl}
                      alt={name}
                      className="nft-image"
                      onLoad={(e) => {
                        console.log(`✓ Image loaded successfully for NFT ${nft.id}:`, displayImageUrl);
                      }}
                      onError={(e) => {
                        console.error(`✗ Image failed to load for NFT ${nft.id}:`, displayImageUrl);
                        console.error("Error event:", e);
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  )
                ) : (
                  console.log(`No imageUrl for NFT ${nft.id}`)
                )}
                <div
                  style={{
                    display: displayImageUrl ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "200px",
                    backgroundColor: "#f8f9fa",
                    fontSize: "48px",
                    color: "#ddd",
                  }}
                >
                  🎨
                </div>
                <div className="nft-content">
                  <h3 className="nft-title">{name || `NFT #${nft.id}`}</h3>
                  <p className="nft-description">
                    {description || "No description available"}
                  </p>
                  <div className="nft-meta">
                    <div>
                      <div className="nft-id">
                        Token ID: {nft.id.toString()}
                      </div>
                      {mintedAt && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#999",
                            marginTop: "4px",
                          }}
                        >
                          Minted: {new Date(mintedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="nft-owner">You own this</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NFTGallery;
