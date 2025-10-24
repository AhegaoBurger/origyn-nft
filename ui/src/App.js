import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { createActor } from "./declarations/core_nft";
import { createActor as createStorageActor } from "./declarations/storage";
import MintingForm from "./components/MintingForm";
import NFTGallery from "./components/NFTGallery";
import ConnectionStatus from "./components/ConnectionStatus";

const CORE_NFT_CANISTER_ID =
  process.env.REACT_APP_CORE_NFT_CANISTER_ID || "rrkah-fqaaa-aaaaa-aaaaq-cai";
const STORAGE_CANISTER_ID =
  process.env.REACT_APP_STORAGE_CANISTER_ID || "ryjl3-tyaaa-aaaaa-aaaba-cai";
const INTERNET_IDENTITY_CANISTER_ID =
  process.env.REACT_APP_INTERNET_IDENTITY_CANISTER_ID ||
  "rdmx6-jaaaa-aaaaa-aaadq-cai";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [coreNftActor, setCoreNftActor] = useState(null);
  const [storageActor, setStorageActor] = useState(null);
  const [activeTab, setActiveTab] = useState("mint");
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initAuth = async () => {
    try {
      const authClient = await AuthClient.create();
      const isAuthenticated = await authClient.isAuthenticated();

      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        const principal = identity.getPrincipal();
        setPrincipal(principal);
        setIsConnected(true);
        createActors(identity);
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
    }
  };

  const createActors = async (identity) => {
    try {
      // Create agents with proper configuration for local development
      const agentOptions = {
        identity,
        host: "http://localhost:4943",
        fetchRootKey: true, // Important for local development
        verifyQuerySignatures: false, // Disable for local development
        rootKeyFetchTimeout: 30000, // 30 second timeout for root key fetch
      };

      const coreNftActor = createActor(CORE_NFT_CANISTER_ID, {
        agentOptions,
      });

      const storageActor = createStorageActor(STORAGE_CANISTER_ID, {
        agentOptions,
      });

      // Initialize agents to ensure root key is fetched
      await coreNftActor.icrc7_symbol();
      await storageActor.get_storage_size(null);

      setCoreNftActor(coreNftActor);
      setStorageActor(storageActor);
    } catch (error) {
      console.error("Error creating actors:", error);
      throw error;
    }
  };

  const handleConnect = async () => {
    try {
      const authClient = await AuthClient.create();
      await authClient.login({
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000000000), // 7 days
        identityProvider: `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`,
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          setPrincipal(principal);
          setIsConnected(true);
          await createActors(identity);
          showAlert("Successfully connected!", "success");
          await loadNFTs();
        },
      });
    } catch (error) {
      console.error("Connection error:", error);
      showAlert(
        "Failed to connect. Make sure dfx is running locally.",
        "error",
      );
    }
  };

  const handleDisconnect = async () => {
    try {
      const authClient = await AuthClient.create();
      await authClient.logout();
      setIsConnected(false);
      setPrincipal(null);
      setCoreNftActor(null);
      setStorageActor(null);
      setNfts([]);
      showAlert("Disconnected successfully", "info");
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  const loadNFTs = async () => {
    if (!coreNftActor) return;

    setLoading(true);
    try {
      const account = {
        owner: principal,
        subaccount: [],
      };
      const userTokenIds = await coreNftActor.icrc7_tokens_of(
        account,
        null,
        null,
      );
      const nftDetails = await Promise.all(
        userTokenIds.map(async (tokenId) => {
          const metadata = await coreNftActor.icrc7_token_metadata([tokenId]);
          return {
            id: tokenId,
            metadata: metadata[0] || [],
          };
        }),
      );
      setNfts(nftDetails);
    } catch (error) {
      console.error("Error loading NFTs:", error);
      showAlert("Failed to load NFTs", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "gallery" && isConnected) {
      loadNFTs();
    }
  };

  const handleMintSuccess = () => {
    showAlert("NFT minted successfully!", "success");
    loadNFTs();
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>NFT Minting UI</h1>
          <p>Mint and manage your ICRC7 NFTs on the Internet Computer</p>

          <div style={{ marginTop: "20px" }}>
            <ConnectionStatus
              isConnected={isConnected}
              principal={principal}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </header>

        {alert && (
          <div className={`alert alert-${alert.type}`}>{alert.message}</div>
        )}

        {isConnected && (
          <div className="tabs">
            <button
              className={`tab ${activeTab === "mint" ? "active" : ""}`}
              onClick={() => handleTabChange("mint")}
            >
              Mint NFT
            </button>
            <button
              className={`tab ${activeTab === "gallery" ? "active" : ""}`}
              onClick={() => handleTabChange("gallery")}
            >
              My NFTs
            </button>
          </div>
        )}

        {isConnected ? (
          <div>
            {activeTab === "mint" && (
              <MintingForm
                coreNftActor={coreNftActor}
                storageActor={storageActor}
                onMintSuccess={handleMintSuccess}
                showAlert={showAlert}
              />
            )}

            {activeTab === "gallery" && (
              <NFTGallery nfts={nfts} loading={loading} onRefresh={loadNFTs} />
            )}
          </div>
        ) : (
          <div className="card">
            <h2>Welcome to NFT Minting UI</h2>
            <p>Please connect your wallet to start minting NFTs.</p>
            <div style={{ marginTop: "20px" }}>
              <h3>Getting Started:</h3>
              <ol>
                <li>
                  Make sure your local dfx network is running:{" "}
                  <code>dfx start --background</code>
                </li>
                <li>
                  Deploy the NFT canisters:{" "}
                  <code>./scripts/deploy/local/deploy_all.sh</code>
                </li>
                <li>Click "Connect Wallet" above to get started</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
