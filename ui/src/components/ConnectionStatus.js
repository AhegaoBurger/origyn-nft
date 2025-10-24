import React from 'react';

const ConnectionStatus = ({ isConnected, principal, onConnect, onDisconnect }) => {
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="status-dot"></div>
      <span>
        {isConnected ?
          `Connected: ${principal?.toString()?.slice(0, 8)}...${principal?.toString()?.slice(-6)}` :
          'Disconnected'
        }
      </span>
      {isConnected ? (
        <button className="btn btn-secondary" onClick={onDisconnect}>
          Disconnect
        </button>
      ) : (
        <button className="btn" onClick={onConnect}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;
