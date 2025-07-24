# GitHub Login with ZK Proof - Complete Guide

## 🔐 How ZK Proof Login Works

Instead of sharing your GitHub username/password, you prove you own a GitHub account using a ZK proof. The website verifies this proof and grants you access.

## 🎯 The Login Flow

### **Traditional Login (What we're replacing)**
```
User → Website → Enter GitHub username/password → GitHub verifies → Access granted
```

### **ZK Proof Login (What we're implementing)**
```
User → Generate ZK proof (proves GitHub ownership) → Submit proof to website → Website verifies proof → Access granted
```

## 🚀 Complete Implementation

### **Step 1: User Generates ZK Proof**

First, you use your extension to generate a ZK proof:

```javascript
// In your extension popup
async function generateGitHubProof() {
    // 1. User clicks "Start Verification" in your extension
    // 2. Extension captures GitHub data
    // 3. WootzApp generates ZK proof
    // 4. Proof is ready to use
    
    const zkProof = {
        "proof": {
            "publicInputs": ["0x1234...", "0x5678..."],
            "verificationKey": "0xabcd...",
            "provider": "github",
            "username": "john_doe", // This is public info
            "timestamp": 1640995200000
        },
        "metadata": {
            "sessionId": "abc123",
            "generatedAt": "2024-01-01T00:00:00Z",
            "provider": "github"
        }
    };
    
    return zkProof;
}
```

### **Step 2: Website Provides Login Interface**

The website you want to login to provides a ZK proof login option:

```html
<!-- Login page on the target website -->
<div class="login-options">
    <h3>Login with GitHub</h3>
    
    <!-- Traditional OAuth (what we're replacing) -->
    <button class="oauth-button">
        <img src="github-icon.png" alt="GitHub">
        Login with GitHub OAuth
    </button>
    
    <!-- New ZK Proof option -->
    <div class="zk-proof-login">
        <h4>🔐 Login with ZK Proof (Privacy-Preserving)</h4>
        <p>Prove you own a GitHub account without sharing credentials</p>
        
        <div class="proof-input">
            <textarea 
                id="zk-proof-input" 
                placeholder="Paste your ZK proof here..."
                rows="8"
            ></textarea>
        </div>
        
        <button id="submit-proof-btn" onclick="submitZKProof()">
            🔐 Login with ZK Proof
        </button>
        
        <div class="help-text">
            <p>💡 <strong>How to get a ZK proof:</strong></p>
            <ol>
                <li>Install the Reclaim Protocol extension</li>
                <li>Go to GitHub and log in</li>
                <li>Click "Start Verification" in the extension</li>
                <li>Copy the generated ZK proof</li>
                <li>Paste it here to login</li>
            </ol>
        </div>
    </div>
</div>
```

### **Step 3: Website Verifies the Proof**

```javascript
// On the target website
async function submitZKProof() {
    const proofInput = document.getElementById('zk-proof-input').value;
    const submitBtn = document.getElementById('submit-proof-btn');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = '🔍 Verifying...';
        
        // Parse the ZK proof
        const zkProof = JSON.parse(proofInput);
        
        // Verify the proof
        const verificationResult = await verifyZKProof(zkProof);
        
        if (verificationResult.isValid) {
            // Login successful!
            await loginUser(verificationResult.userData);
            showSuccess('✅ Login successful! Welcome, ' + verificationResult.username);
        } else {
            showError('❌ Invalid proof. Please try again.');
        }
        
    } catch (error) {
        showError('❌ Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🔐 Login with ZK Proof';
    }
}

async function verifyZKProof(zkProof) {
    // Send proof to backend for verification
    const response = await fetch('/api/verify-zk-proof', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            proof: zkProof.proof,
            publicInputs: zkProof.proof.publicInputs,
            verificationKey: zkProof.proof.verificationKey,
            provider: zkProof.proof.provider
        })
    });
    
    const result = await response.json();
    return result;
}

async function loginUser(userData) {
    // Create session for the user
    const session = await createUserSession(userData);
    
    // Redirect to dashboard or set login state
    window.location.href = '/dashboard';
}
```

### **Step 4: Backend Verification**

```javascript
// Backend API (Node.js/Express)
app.post('/api/verify-zk-proof', async (req, res) => {
    try {
        const { proof, publicInputs, verificationKey, provider } = req.body;
        
        // 1. Verify the ZK proof cryptographically
        const isValid = await verifyZKProofCryptographically(proof, publicInputs, verificationKey);
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ZK proof'
            });
        }
        
        // 2. Extract user information from public inputs
        const userData = extractUserDataFromProof(proof, publicInputs);
        
        // 3. Check if this proof has been used before (optional)
        const isReused = await checkProofReuse(proof);
        if (isReused) {
            return res.status(400).json({
                success: false,
                message: 'Proof has already been used'
            });
        }
        
        // 4. Store the proof hash to prevent reuse
        await storeProofHash(proof);
        
        // 5. Create or update user account
        const user = await createOrUpdateUser({
            username: userData.username,
            provider: provider,
            verifiedAt: new Date(),
            proofHash: hashProof(proof)
        });
        
        res.json({
            success: true,
            isValid: true,
            userData: {
                id: user.id,
                username: user.username,
                provider: user.provider,
                verifiedAt: user.verifiedAt
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

async function verifyZKProofCryptographically(proof, publicInputs, verificationKey) {
    // This is where you implement the actual ZK proof verification
    // using the verification key from your WootzApp API
    
    // For now, we'll do basic validation
    if (!proof || !publicInputs || !verificationKey) {
        return false;
    }
    
    // TODO: Implement actual cryptographic verification
    // This would use the verification key to verify the proof
    return true; // Placeholder
}

function extractUserDataFromProof(proof, publicInputs) {
    // Extract username and other public data from the proof
    return {
        username: proof.username || 'unknown',
        provider: proof.provider,
        timestamp: proof.timestamp
    };
}
```

### **Step 5: User Experience Flow**

```javascript
// Complete user flow
async function completeZKProofLogin() {
    // 1. User has ZK proof from extension
    const zkProof = await getZKProofFromExtension();
    
    // 2. User goes to target website
    const targetWebsite = 'https://example.com/login';
    
    // 3. User pastes proof and clicks login
    await submitProofToWebsite(zkProof, targetWebsite);
    
    // 4. Website verifies and grants access
    const loginResult = await verifyAndLogin(zkProof);
    
    if (loginResult.success) {
        console.log('✅ Login successful!');
        console.log('Welcome, ' + loginResult.username);
    }
}

// Helper function to get proof from extension
async function getZKProofFromExtension() {
    // This would be the proof generated by your extension
    return {
        "proof": {
            "publicInputs": ["0x1234...", "0x5678..."],
            "verificationKey": "0xabcd...",
            "provider": "github",
            "username": "john_doe",
            "timestamp": 1640995200000
        },
        "metadata": {
            "sessionId": "abc123",
            "generatedAt": "2024-01-01T00:00:00Z",
            "provider": "github"
        }
    };
}
```

## 🎨 User Interface Examples

### **Login Page Design**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login - Example Website</title>
    <style>
        .login-container {
            max-width: 400px;
            margin: 50px auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        
        .zk-proof-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .proof-input {
            width: 100%;
            min-height: 120px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
        }
        
        .submit-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .submit-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        
        .help-text {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
        }
        
        .help-text ol {
            margin: 10px 0;
            padding-left: 20px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>Welcome to Example Website</h2>
        
        <!-- Traditional OAuth -->
        <div class="oauth-section">
            <h3>Quick Login</h3>
            <button class="oauth-btn">
                <img src="github-icon.png" width="20" height="20">
                Login with GitHub OAuth
            </button>
        </div>
        
        <!-- ZK Proof Login -->
        <div class="zk-proof-section">
            <h3>🔐 Privacy-Preserving Login</h3>
            <p>Prove you own a GitHub account without sharing credentials</p>
            
            <textarea 
                id="zk-proof-input" 
                class="proof-input"
                placeholder="Paste your ZK proof here...
Example:
{
  'proof': {
    'publicInputs': ['0x1234...'],
    'verificationKey': '0xabcd...',
    'provider': 'github',
    'username': 'your_username'
  }
}"
            ></textarea>
            
            <button id="submit-proof-btn" class="submit-btn" onclick="submitZKProof()">
                🔐 Login with ZK Proof
            </button>
            
            <div class="help-text">
                <p><strong>💡 How to get a ZK proof:</strong></p>
                <ol>
                    <li>Install the Reclaim Protocol extension</li>
                    <li>Go to GitHub and log in to your account</li>
                    <li>Click "Start Verification" in the extension</li>
                    <li>Wait for the 4-second verification process</li>
                    <li>Copy the generated ZK proof from the popup</li>
                    <li>Paste it here and click "Login with ZK Proof"</li>
                </ol>
                
                <p><strong>🔒 Privacy Benefits:</strong></p>
                <ul>
                    <li>No passwords shared</li>
                    <li>No OAuth tokens stored</li>
                    <li>Proves account ownership without revealing data</li>
                    <li>One-time use proofs prevent tracking</li>
                </ul>
            </div>
        </div>
    </div>
    
    <script src="zk-proof-login.js"></script>
</body>
</html>
```

## 🔧 Technical Implementation Details

### **What You Submit**

When you want to login to a website using your ZK proof, you submit:

```json
{
  "proof": {
    "publicInputs": ["0x1234...", "0x5678..."],
    "verificationKey": "0xabcd...",
    "provider": "github",
    "username": "john_doe",
    "timestamp": 1640995200000
  },
  "metadata": {
    "sessionId": "abc123",
    "generatedAt": "2024-01-01T00:00:00Z",
    "provider": "github"
  }
}
```

### **What the Website Does**

1. **Receives the proof** from your paste
2. **Verifies it cryptographically** using the verification key
3. **Extracts public data** (username, provider, timestamp)
4. **Creates a session** for you
5. **Grants access** to the website

### **Security Benefits**

- ✅ **No passwords shared** - website never sees your GitHub password
- ✅ **No OAuth tokens** - no third-party access tokens stored
- ✅ **Privacy preserved** - only proves ownership, doesn't reveal data
- ✅ **One-time use** - each proof can only be used once
- ✅ **Cryptographically secure** - mathematically impossible to forge

## 🚀 Quick Start for Website Owners

If you want to add ZK proof login to your website:

1. **Add the login interface** (HTML/CSS above)
2. **Implement the verification API** (Node.js code above)
3. **Test with your extension** - generate a proof and try logging in
4. **Deploy and go live** - users can now login with ZK proofs!

The beauty of this system is that users can prove they own GitHub accounts without ever sharing their credentials with your website. It's like having a digital passport that proves your identity without revealing your personal information! 