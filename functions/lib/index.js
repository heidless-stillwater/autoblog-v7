"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
// Define the proxy function
exports.apiProxy = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    // Log the incoming path for debugging
    logger.info("Proxy Request:", { path: req.path, method: req.method });
    try {
        let targetUrl = "";
        let pathRemaining = req.path;
        // Determine target based on path prefix
        // The rewrite in firebase.json will send /api/... here
        // But the function might see the full path or stripped path depending on configuration.
        // Assuming rewrite: source: "/api/**", function: "apiProxy"
        // The req.path usually preserves the full path.
        if (req.path.startsWith("/api/perplexity")) {
            pathRemaining = req.path.replace("/api/perplexity", "");
            targetUrl = `https://api.perplexity.ai${pathRemaining}`;
        }
        else if (req.path.startsWith("/api/gemini")) {
            pathRemaining = req.path.replace("/api/gemini", "");
            // Handle Gemini query params (API key)
            const queryString = req.url.split('?')[1] || "";
            targetUrl = `https://generativelanguage.googleapis.com${pathRemaining}${queryString ? `?${queryString}` : ""}`;
        }
        else {
            res.status(404).json({ error: "Unknown proxy target" });
            return;
        }
        logger.info("Forwarding to:", targetUrl);
        // Prepare fetch options
        const fetchOptions = Object.assign({ method: req.method, headers: Object.assign({ "Content-Type": "application/json" }, (req.headers.authorization ? { "Authorization": req.headers.authorization } : {})) }, (req.method !== "GET" && req.method !== "HEAD" ? { body: JSON.stringify(req.body) } : {}));
        const response = await fetch(targetUrl, fetchOptions);
        // Handle response
        if (!response.ok) {
            const errorText = await response.text();
            logger.error("Upstream API Error:", { status: response.status, body: errorText });
            res.status(response.status).send(errorText);
            return;
        }
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        logger.error("Proxy Internal Error:", error);
        res.status(500).json({ error: "Internal Proxy Error", details: error instanceof Error ? error.message : String(error) });
    }
});
//# sourceMappingURL=index.js.map