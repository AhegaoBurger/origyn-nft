import React from "react";

const NFTGallery = ({ nfts, loading, onRefresh }) => {
  const getMetadataValue = (metadata, key) => {
    const item = metadata.find(([k]) => k === key);
    return item
      ? item.value.Text || item.value.Nat || item.value.Int || ""
      : "";
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
            const name = getMetadataValue(nft.metadata, "name");
            const description = getMetadataValue(nft.metadata, "description");
            const imageUrl = getMetadataValue(nft.metadata, "image");
            const mintedAt = getMetadataValue(nft.metadata, "minted_at");

            return (
              <div key={nft.id.toString()} className="nft-card">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="nft-image"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  style={{
                    display: imageUrl ? "none" : "flex",
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
