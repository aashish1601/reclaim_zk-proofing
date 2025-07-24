# ZK Proof Usage Guide

## 🔐 Understanding ZK Proofs

Zero-Knowledge proofs allow you to prove you have certain data without revealing the actual data. In your case, you're generating proofs that verify:
- GitHub account ownership
- LinkedIn profile existence
- Other provider account verifications

## 🎯 Common Use Cases

### 1. **DeFi/KYC Verification**
```javascript
// Example: Proving GitHub account for DeFi protocol
async function verifyForDeFi(zkProof) {
    const verificationResult = await verifyZKProof(zkProof);
    
    if (verificationResult.isValid) {
        // Grant access to DeFi protocol
        await grantDeFiAccess(userAddress, verificationResult.provider);
        return { success: true, accessGranted: true };
    }
    
    return { success: false, error: "Invalid proof" };
}
```

### 2. **NFT Gating**
```javascript
// Example: NFT access based on GitHub account
async function checkNFTAccess(zkProof, nftContract) {
    const proofData = await verifyZKProof(zkProof);
    
    if (proofData.provider === 'github' && proofData.isValid) {
        // Mint or grant access to NFT
        await nftContract.mint(msg.sender);
        return { canMint: true };
    }
    
    return { canMint: false, reason: "GitHub verification required" };
}
```

### 3. **DAO Voting Rights**
```javascript
// Example: DAO voting based on LinkedIn experience
async function checkVotingRights(zkProof, daoContract) {
    const proofData = await verifyZKProof(zkProof);
    
    if (proofData.provider === 'linkedin' && proofData.experienceYears >= 5) {
        // Grant voting rights
        await daoContract.grantVotingRights(msg.sender);
        return { votingRights: true, weight: 1 };
    }
    
    return { votingRights: false, reason: "5+ years experience required" };
}
```

### 4. **Access Control**
```javascript
// Example: Website access control
async function checkWebsiteAccess(zkProof) {
    const proofData = await verifyZKProof(zkProof);
    
    if (proofData.isValid && proofData.provider === 'github') {
        // Grant access to premium content
        return { 
            access: true, 
            tier: 'premium',
            features: ['advanced_analytics', 'api_access']
        };
    }
    
    return { access: false, tier: 'basic' };
}
```

## 🔧 Implementation Examples

### **Smart Contract Integration**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ZKProofVerifier {
    mapping(address => bool) public verifiedUsers;
    mapping(address => string) public userProviders;
    
    event UserVerified(address indexed user, string provider, uint256 timestamp);
    
    function verifyProof(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        string calldata provider
    ) external returns (bool) {
        // Verify the ZK proof using your verification key
        bool isValid = verifyZKProof(proof, publicInputs);
        
        if (isValid) {
            verifiedUsers[msg.sender] = true;
            userProviders[msg.sender] = provider;
            emit UserVerified(msg.sender, provider, block.timestamp);
            return true;
        }
        
        return false;
    }
    
    function isVerified(address user) external view returns (bool) {
        return verifiedUsers[user];
    }
    
    function getUserProvider(address user) external view returns (string memory) {
        return userProviders[user];
    }
    
    // Placeholder for actual ZK proof verification
    function verifyZKProof(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) internal pure returns (bool) {
        // Implement your ZK proof verification logic here
        // This would use the verification key from your WootzApp API
        return true; // Placeholder
    }
}
```

### **Frontend Integration**

```javascript
// React component for ZK proof submission
import React, { useState } from 'react';
import { ethers } from 'ethers';

function ZKProofSubmitter({ zkProof, contractAddress }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    
    const submitProof = async () => {
        setIsSubmitting(true);
        
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(contractAddress, ABI, signer);
            
            // Parse the ZK proof data
            const proofData = JSON.parse(zkProof);
            
            // Submit to smart contract
            const tx = await contract.verifyProof(
                proofData.proof,
                proofData.publicInputs,
                proofData.provider
            );
            
            await tx.wait();
            setResult({ success: true, txHash: tx.hash });
            
        } catch (error) {
            setResult({ success: false, error: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div>
            <button 
                onClick={submitProof} 
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Submitting...' : 'Submit ZK Proof'}
            </button>
            
            {result && (
                <div>
                    {result.success ? (
                        <p>✅ Proof submitted successfully! TX: {result.txHash}</p>
                    ) : (
                        <p>❌ Error: {result.error}</p>
                    )}
                </div>
            )}
        </div>
    );
}
```

### **API Integration**

```javascript
// Express.js API for ZK proof verification
const express = require('express');
const app = express();

app.post('/api/verify-proof', async (req, res) => {
    try {
        const { proof, publicInputs, provider, userId } = req.body;
        
        // Verify the ZK proof
        const isValid = await verifyZKProof(proof, publicInputs);
        
        if (isValid) {
            // Store verification in database
            await db.verifications.create({
                userId,
                provider,
                verifiedAt: new Date(),
                proofHash: hashProof(proof)
            });
            
            // Grant access or permissions
            await grantUserPermissions(userId, provider);
            
            res.json({
                success: true,
                message: 'Proof verified successfully',
                permissions: getPermissionsForProvider(provider)
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid proof'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

async function verifyZKProof(proof, publicInputs) {
    // Implement your ZK proof verification logic
    // This would use the verification key from your WootzApp API
    return true; // Placeholder
}
```

## 🎨 UI/UX Integration

### **Proof Display Component**

```javascript
// React component to display ZK proof status
function ZKProofStatus({ proof, onUseProof }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className="zk-proof-card">
            <div className="proof-header">
                <span className="proof-icon">🔐</span>
                <span className="proof-title">ZK Proof Generated</span>
                <button onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? '▼' : '▶'}
                </button>
            </div>
            
            {isExpanded && (
                <div className="proof-details">
                    <pre className="proof-content">
                        {JSON.stringify(proof, null, 2)}
                    </pre>
                    
                    <div className="proof-actions">
                        <button onClick={() => onUseProof(proof)}>
                            Use This Proof
                        </button>
                        <button onClick={() => copyToClipboard(proof)}>
                            Copy Proof
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

### **Verification Dashboard**

```javascript
// Dashboard showing all user verifications
function VerificationDashboard({ userProofs }) {
    return (
        <div className="verification-dashboard">
            <h2>Your Verifications</h2>
            
            {userProofs.map(proof => (
                <div key={proof.id} className="verification-card">
                    <div className="provider-info">
                        <span className="provider-icon">
                            {getProviderIcon(proof.provider)}
                        </span>
                        <span className="provider-name">
                            {proof.provider}
                        </span>
                        <span className="verification-status">
                            ✅ Verified
                        </span>
                    </div>
                    
                    <div className="verification-actions">
                        <button onClick={() => useProofForDeFi(proof)}>
                            Use for DeFi
                        </button>
                        <button onClick={() => useProofForNFT(proof)}>
                            Use for NFT
                        </button>
                        <button onClick={() => useProofForDAO(proof)}>
                            Use for DAO
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
```

## 🔄 Integration with Your Extension

### **Modify Your Extension to Store Proofs**

```javascript
// In your background script, add proof storage
class ProofManager {
    constructor() {
        this.storedProofs = new Map();
    }
    
    storeProof(sessionId, proofData) {
        this.storedProofs.set(sessionId, {
            proof: proofData,
            timestamp: Date.now(),
            provider: this.getProviderFromSession(sessionId)
        });
    }
    
    getProof(sessionId) {
        return this.storedProofs.get(sessionId);
    }
    
    getAllProofs() {
        return Array.from(this.storedProofs.values());
    }
    
    exportProofs() {
        return JSON.stringify(this.getAllProofs(), null, 2);
    }
}

// Initialize in background script
const proofManager = new ProofManager();

// Store proof when generated
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'PROOF_GENERATED') {
        proofManager.storeProof(message.sessionId, message.proofData);
        sendResponse({ success: true });
    }
});
```

### **Add Proof Export to Popup**

```javascript
// Add to your popup UI
function addProofExportToPopup() {
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export All Proofs';
    exportButton.onclick = () => {
        chrome.runtime.sendMessage(
            { action: 'EXPORT_PROOFS' },
            (response) => {
                if (response.success) {
                    downloadFile(response.proofs, 'zk-proofs.json');
                }
            }
        );
    };
    
    document.body.appendChild(exportButton);
}
```

## 🚀 Next Steps

1. **Choose your use case**: DeFi, NFT gating, DAO voting, etc.
2. **Implement verification logic**: Use the verification key from your ZK proof
3. **Integrate with your platform**: Smart contracts, APIs, or frontend
4. **Test thoroughly**: Ensure proofs work correctly in your specific context
5. **Add user experience**: Make it easy for users to use their proofs

The ZK proofs you're generating are cryptographic gold - they provide verifiable proof of account ownership without compromising privacy or security! 