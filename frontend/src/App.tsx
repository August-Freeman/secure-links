import { InMemoryStorageProvider, useInMemoryStorage } from "./hooks/useInMemoryStorage";
import { MetaMaskProvider } from "./hooks/metamask/useMetaMaskProvider";
import { MetaMaskEthersSignerProvider, useMetaMaskEthersSigner } from "./hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "./fhevm/useFhevm";
import { useSecureLinks } from "./hooks/useSecureLinks";
import { useMemo, useState } from "react";
import ExampleLinks from "./components/ExampleLinks";
import "./App.css";

function AppRoot() {
  const { provider, chainId, accounts, isConnected, connect, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner } = useMetaMaskEthersSigner();
  const initialMockChains = useMemo(() => ({ 31337: "http://localhost:8545" }), []);
  const { instance, status, error } = useFhevm({ provider, chainId, initialMockChains, enabled: true });
  const { storage } = useInMemoryStorage();

  const sl = useSecureLinks({
    instance,
    fhevmDecryptionSignatureStorage: storage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [url, setUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const tags = useMemo(() => tagInput.split(",").map((t) => t.trim()).filter(Boolean), [tagInput]);

  const handleSaveLink = () => {
    if (url && sl.canSubmit) {
      sl.saveLink(url, tags);
      setUrl("");
      setTagInput("");
    }
  };

  const getStatusText = () => {
    if (status === "ready") return "Connected";
    if (status === "loading") return "Loading...";
    if (error) return "Connection failed";
    return "Connecting...";
  };

  const getStatusClass = () => {
    if (status === "ready") return "status-badge ready";
    if (error) return "status-badge error";
    return "status-badge loading";
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">
            <span className="icon-lock">🔒</span>
            Secure Links
          </h1>
          <p className="header-subtitle">Privacy-first link management powered by FHEVM</p>
        </div>
      </header>

      <div className="app-container">
        {!isConnected && (
          <div className="connect-section">
            <div className="connect-card">
              <h2>Connect Your Wallet</h2>
              <p>Connect your MetaMask wallet to start managing encrypted links securely on the blockchain</p>
              <button onClick={connect} className="btn btn-primary btn-large">
                Connect MetaMask
              </button>
            </div>
          </div>
        )}

        {isConnected && (
          <>
            <div className="status-card">
              <h2 className="card-title">Connection Status</h2>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Network</span>
                  <span className="status-value">Chain {chainId ?? "Unknown"}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Wallet Address</span>
                  <span className="status-value address">
                    {accounts && accounts.length > 0 ? accounts[0] : "Not connected"}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">FHEVM Status</span>
                  <span className={getStatusClass()}>
                    {getStatusText()}
                  </span>
                  {error && (
                    <span className="status-value" style={{ color: "var(--error-color)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                      {error.message}
                    </span>
                  )}
                </div>
                <div className="status-item">
                  <span className="status-label">Contract</span>
                  <span className="status-value address">
                    {sl.contractAddress ?? "Not deployed"}
                  </span>
                </div>
              </div>
            </div>

            <div className="action-card">
              <h2 className="card-title">Add New Link</h2>
              <div className="form-container">
                <div className="input-wrapper">
                  <label className="input-label">URL</label>
                  <input 
                    className="input-field"
                    placeholder="https://example.com" 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveLink()}
                  />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Tags (optional)</label>
                  <input 
                    className="input-field"
                    placeholder="web3, blockchain, defi" 
                    value={tagInput} 
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveLink()}
                  />
                </div>
                <button 
                  disabled={!sl.canSubmit || !url} 
                  onClick={handleSaveLink}
                  className="btn btn-primary btn-large"
                >
                  {sl.isSubmitting ? (
                    <>
                      Saving Link<span className="spinner"></span>
                    </>
                  ) : (
                    "Save Encrypted Link"
                  )}
                </button>
                <ExampleLinks />
              </div>
            </div>

            <div className="links-grid">
              <div className="links-card">
                <div className="card-header">
                  <h2 className="card-title">My Links</h2>
                  <button 
                    onClick={sl.refreshMyLinks}
                    className="btn btn-icon"
                    title="Refresh my links"
                  >
                    🔄
                  </button>
                </div>
                {sl.myUrls.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No links saved yet. Add your first encrypted link above!</p>
                  </div>
                ) : (
                  <ul className="links-list">
                    {sl.myUrls.map((h, i) => (
                      <li key={h} className="link-item">
                        <div className="link-content">
                          <span className="link-hash">{h}</span>
                          <span className="link-time">
                            {new Date(Number(sl.myTimestamps[i] ?? 0) * 1000).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="links-card">
                <div className="card-header">
                  <h2 className="card-title">Trending Links</h2>
                  <button 
                    onClick={sl.refreshAllLinks}
                    className="btn btn-icon"
                    title="Refresh trending links"
                  >
                    🔄
                  </button>
                </div>
                {sl.allUrls.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔥</div>
                    <p>No trending links yet. Be the first to share!</p>
                  </div>
                ) : (
                  <ul className="links-list">
                    {[...sl.allUrls]
                      .sort((a, b) => Number(sl.urlCounts[b] ?? 0) - Number(sl.urlCounts[a] ?? 0))
                      .map((h) => (
                        <li key={h} className="link-item trending">
                          <div className="link-content">
                            <span className="link-hash">{h}</span>
                            <span className="trending-badge">
                              {String(sl.urlCounts[h] ?? 0)} {Number(sl.urlCounts[h]) === 1 ? 'user' : 'users'}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            {sl.message && (
              <div className={`message-card ${sl.message.toLowerCase().includes('fail') || sl.message.toLowerCase().includes('error') ? 'message-error' : sl.message.toLowerCase().includes('complet') || sl.message.toLowerCase().includes('success') ? 'message-success' : ''}`}>
                <div className="message-content">
                  {sl.message}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function App() {
  const initialMockChains = { 31337: "http://localhost:8545" } as const;
  return (
    <InMemoryStorageProvider>
      <MetaMaskProvider>
        <MetaMaskEthersSignerProvider initialMockChains={initialMockChains}>
          <AppRoot />
        </MetaMaskEthersSignerProvider>
      </MetaMaskProvider>
    </InMemoryStorageProvider>
  );
}


