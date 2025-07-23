// src/popup/index.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { MESSAGE_ACTIONS, MESSAGE_SOURCES } from '../utils/constants';

const PopupApp = () => {
    const [statusMessage, setStatusMessage] = useState('Click the button to start verification.');
    const [loading, setLoading] = useState(false);

    // ⭐ IMPORTANT: This URL MUST be updated every time Ngrok restarts! ⭐
    // Replace with your CURRENT Ngrok HTTPS forwarding URL + /generate-config
    const BACKEND_GENERATE_CONFIG_URL = "https://09236c9d4f31.ngrok-free.app/generate-config"; // Update this with your live URL

    const sendMessageToBackground = async (actionType, payload = {}) => {
        try {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: actionType,
                    source: MESSAGE_SOURCES.POPUP,
                    target: MESSAGE_SOURCES.BACKGROUND,
                    data: payload
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error sending message to background:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        console.log('Response from background:', response);
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            console.error('Error in sendMessageToBackground (before promise):', error);
            return { success: false, error: error.message };
        }
    };

    const handlePerformAction = async () => {
        setLoading(true);
        setStatusMessage('Fetching verification configuration...');

        try {
            console.log('🔍 Attempting to fetch from:', BACKEND_GENERATE_CONFIG_URL);
            
            const response = await fetch(BACKEND_GENERATE_CONFIG_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true', // Helps with Ngrok's redirect page
                    'Origin': 'chrome-extension://' + chrome.runtime.id, // Essential for CORS on backend
                    'ngrok-skip-browser-warning': 'true'
                },
                mode: 'cors'
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            const contentType = response.headers.get('content-type') || '';
            console.log('📡 Content-Type:', contentType);

            if (!response.ok) {
                const responseText = await response.text();
                console.log('❌ Error response body (first 500 chars):', responseText.substring(0, 500));
                
                if (responseText.includes('<!DOCTYPE html>') && responseText.includes('ngrok')) {
                    throw new Error('Received ngrok browser warning page. Ensure Ngrok tunnel is active and you\'ve visited its public URL once in a browser to accept the warning.');
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${responseText.substring(0, 200)}`);
            }

            if (!contentType.includes('application/json')) {
                const responseText = await response.text();
                console.log('❌ Non-JSON response received:', responseText.substring(0, 500));
                
                if (responseText.trim().startsWith('<!DOCTYPE html>')) {
                    if (responseText.includes('ngrok')) {
                        throw new Error('Received ngrok browser warning page instead of JSON. Your backend might not be properly configured for CORS requests from browser extensions or the Ngrok tunnel is serving a default page.');
                    } else {
                        throw new Error('Received HTML page instead of JSON. Check if your backend endpoint is correct and running and explicitly returns JSON.');
                    }
                }
                
                throw new Error(`Expected JSON but received ${contentType}. Response starts with: ${responseText.substring(0, 100)}`);
            }

            const data = await response.json();
            console.log('Popup: Received sessionId from backend:', data.sessionId); // ⭐ CONFIRM THIS LOG SHOWS A VALID ID ⭐
            console.log('✅ Successfully parsed JSON:', data);

            if (!data.reclaimProofRequestConfig) {
                console.log('❌ Response structure:', Object.keys(data));
                throw new Error('Backend response missing reclaimProofRequestConfig field.');
            }

            setStatusMessage('Configuration fetched. Initiating verification...');

            // ⭐ CRITICAL MODIFICATION: Pass templateData fields with APP_ID and PROVIDER_ID ⭐
            const templateDataForBackground = {
                // Use hardcoded values since process.env is not available in browser context
                applicationId: "0x7c74e6112781b2c5B80443fAfcf2Ea0b4c17EE16",     // Your Reclaim Application ID
                providerId: "6d3f6753-7ee6-49ee-a545-62f1b1822ae5",   // Your Reclaim Provider ID
                sessionId: data.sessionId,
                callbackUrl: `${BACKEND_GENERATE_CONFIG_URL.replace('/generate-config', '/receive-proofs')}`, // Use backend's receive-proofs endpoint
                parameters: {}, // Any specific parameters for the proof
                reclaimProofRequestConfig: data.reclaimProofRequestConfig // The main config string
            };

            const backgroundResponse = await sendMessageToBackground(
                MESSAGE_ACTIONS.START_VERIFICATION,
                templateDataForBackground // Pass the structured template data
            );

            if (backgroundResponse.success) {
                setStatusMessage('Verification initiated successfully! Please follow the prompts in the new window.');
            } else {
                setStatusMessage(`Verification failed: ${backgroundResponse.error || 'Unknown error from background'}`);
                setLoading(false);
            }
        } catch (error) {
            console.error('🔥 Detailed error in popup handlePerformAction:', error);
            
            let errorMessage = error.message;
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Cannot reach backend. Ensure your backend server is running and its Ngrok tunnel is active and correctly configured.';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'CORS error: Your backend needs to explicitly allow requests from this Chrome Extension ID.';
            } else if (error.message.includes('ngrok')) {
                errorMessage = error.message;
            }
            
            setStatusMessage(`Error: ${errorMessage}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        const messageListener = (message, sender, sendResponse) => {
            console.log('📨 POPUP: Message received:', message);
            const isTargetedForPopup = message.target === MESSAGE_SOURCES.POPUP;

            switch (message.action) {
                case MESSAGE_ACTIONS.VERIFICATION_STATUS:
                    if (isTargetedForPopup || !message.target) {
                        console.log('📋 POPUP: Status update:', message.data.message);
                        setStatusMessage(message.data.message);
                    }
                    break;
                case MESSAGE_ACTIONS.VERIFICATION_COMPLETE:
                    if (isTargetedForPopup || !message.target) {
                        console.log('🎉 POPUP: Verification completed successfully!');
                        console.log('📊 POPUP: Proofs data:', message.data.proofs);
                        
                        // Check if we have a view URL for the proof
                        if (message.data.viewUrl) {
                            setStatusMessage(`Verification completed successfully! Click here to view proof: ${message.data.viewUrl}`);
                        } else {
                            setStatusMessage('Verification completed successfully!');
                        }
                        setLoading(false);
                    }
                    break;
                case MESSAGE_ACTIONS.VERIFICATION_ERROR:
                    if (isTargetedForPopup || !message.target) {
                        console.error('❌ POPUP: Verification failed:', message.data.error);
                        setStatusMessage(`Verification failed: ${message.data.error}`);
                        setLoading(false);
                    }
                    break;
                default:
                    if (isTargetedForPopup) {
                        console.log('Popup received unhandled message action:', message.action);
                    }
                    break;
            }

            sendResponse({ success: true, message: "Popup received message." });
            return true;
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    // Extract view URL from status message if it exists
    const viewUrlMatch = statusMessage.match(/https:\/\/[^\s]+/);
    const viewUrl = viewUrlMatch ? viewUrlMatch[0] : null;

    return (
        <div className="container">
            <h1>Reclaim Protocol</h1>
            <p className="status-message">
                {viewUrl ? (
                    <>
                        Verification completed successfully!{' '}
                        <a 
                            href={viewUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#4CAF50', textDecoration: 'underline' }}
                        >
                            Click here to view proof details
                        </a>
                    </>
                ) : (
                    statusMessage
                )}
            </p>
            <div style={{ fontSize: '11px', color: '#666', margin: '5px 0', wordBreak: 'break-all' }}>
                Backend: {BACKEND_GENERATE_CONFIG_URL}
            </div>
            <button
                onClick={handlePerformAction}
                disabled={loading}
            >
                {loading ? 'Starting...' : 'Start Reclaim Verification'}
            </button>
            
            {/* Debug section */}
            <div style={{ marginTop: '10px', fontSize: '10px', color: '#888' }}>
                <details>
                    <summary>Debug Info</summary>
                    <div>Extension ID: {chrome.runtime.id}</div>
                    <div>Timestamp: {new Date().toISOString()}</div>
                    {viewUrl && (
                        <div>
                            <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                                View All Proofs
                            </a>
                        </div>
                    )}
                </details>
            </div>
        </div>
    );
};

const appRootElement = document.getElementById('app-root');
if (appRootElement) {
    const root = ReactDOM.createRoot(appRootElement);
    root.render(
        <React.StrictMode>
            <PopupApp />
        </React.StrictMode>
    );
} else {
    console.error('Root element #app-root not found in popup HTML!');
}