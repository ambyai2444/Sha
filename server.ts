import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is missing.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Google Workspace REST Integrations
async function executeGoogleAPI(endpoint: string, method: string, accessToken: string, body?: any) {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const apiRes = await fetch(endpoint, options);
    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return { error: `Google API Error (${apiRes.status}): ${errText}` };
    }
    return await apiRes.json();
  } catch (error: any) {
    return { error: `Connection failed: ${error.message || error}` };
  }
}

async function executeTool(name: string, args: any, accessToken: string) {
  if (!accessToken) {
    return { error: "Access token is missing. Please authenticate with Google first." };
  }

  switch (name) {
    case "list_emails": {
      const endpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5";
      const listData = await executeGoogleAPI(endpoint, "GET", accessToken);
      if (listData.error) return listData;
      
      const messages = [];
      if (listData.messages && listData.messages.length > 0) {
        for (const msg of listData.messages) {
          const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`;
          const details = await executeGoogleAPI(detailUrl, "GET", accessToken);
          if (details && !details.error) {
            const subjectHeader = details.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'subject');
            const fromHeader = details.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from');
            messages.push({
              id: msg.id,
              subject: subjectHeader ? subjectHeader.value : '(No Subject)',
              from: fromHeader ? fromHeader.value : 'Unknown',
              snippet: details.snippet || ''
            });
          }
        }
      }
      return { messages };
    }

    case "send_email": {
      const rfc822 = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        args.body
      ].join('\r\n');
      
      // Buffer standard base64url encode
      const encodedEmail = Buffer.from(rfc822)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const endpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
      return await executeGoogleAPI(endpoint, "POST", accessToken, { raw: encodedEmail });
    }

    case "list_calendar_events": {
      const timeMin = new Date().toISOString();
      const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=8&singleEvents=true&orderBy=startTime`;
      const data = await executeGoogleAPI(endpoint, "GET", accessToken);
      if (data.error) return data;
      
      return data.items?.map((item: any) => ({
        id: item.id,
        summary: item.summary || "(No Title)",
        description: item.description || "",
        start: item.start?.dateTime || item.start?.date || "",
        end: item.end?.dateTime || item.end?.date || "",
      })) || [];
    }

    case "create_calendar_event": {
      const endpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      return await executeGoogleAPI(endpoint, "POST", accessToken, {
        summary: args.title,
        description: args.description || "",
        start: { dateTime: args.startTime },
        end: { dateTime: args.endTime }
      });
    }

    case "search_drive_files": {
      const searchFragment = args.query ? `and name contains '${args.query.replace(/'/g, "\\'")}'` : '';
      const q = `(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet') ${searchFragment}`;
      const endpoint = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime)`;
      return await executeGoogleAPI(endpoint, "GET", accessToken);
    }

    case "read_google_doc": {
      const endpoint = `https://docs.googleapis.com/v1/documents/${args.documentId}`;
      const docData = await executeGoogleAPI(endpoint, "GET", accessToken);
      if (docData.error) return docData;

      let contentText = "";
      docData.body?.content?.forEach((element: any) => {
        element.paragraph?.elements?.forEach((el: any) => {
          if (el.textRun?.content) contentText += el.textRun.content;
        });
      });
      return { text: contentText || "The document is empty." };
    }

    case "read_google_sheet": {
      const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheetId}/values/${encodeURIComponent(args.range)}`;
      return await executeGoogleAPI(endpoint, "GET", accessToken);
    }

    case "add_to_google_sheet": {
      const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheetId}/values/${encodeURIComponent(args.range)}:append?valueInputOption=USER_ENTERED`;
      return await executeGoogleAPI(endpoint, "POST", accessToken, {
        values: [args.values]
      });
    }

    default:
      return { error: `Tool ${name} is not implemented yet.` };
  }
}

// Function definitions for Gemini API
const workspaceTools = {
  functionDeclarations: [
    {
      name: "list_emails",
      description: "List recent emails from Gmail. Returns a list of subjects, snippets, and senders.",
      parameters: { type: "OBJECT", properties: {} }
    },
    {
      name: "send_email",
      description: "Send a new email on behalf of the user to any recipient.",
      parameters: {
        type: "OBJECT",
        properties: {
          to: { type: "STRING", description: "Recipient's email address" },
          subject: { type: "STRING", description: "The email subject line" },
          body: { type: "STRING", description: "The email message body contents" }
        },
        required: ["to", "subject", "body"]
      }
    },
    {
      name: "list_calendar_events",
      description: "List upcoming calendar events from primary Google Calendar.",
      parameters: { type: "OBJECT", properties: {} }
    },
    {
      name: "create_calendar_event",
      description: "Schedule a new event on Google Calendar.",
      parameters: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Title of the meeting or task event" },
          startTime: { type: "STRING", description: "Start date-time in ISO 8601 format (e.g. 2026-06-06T14:00:00Z)" },
          endTime: { type: "STRING", description: "End date-time in ISO 8601 format (e.g. 2026-06-06T15:00:00Z)" },
          description: { type: "STRING", description: "Optional notes of the meeting" }
        },
        required: ["title", "startTime", "endTime"]
      }
    },
    {
      name: "search_drive_files",
      description: "Search Google Drive files, returning lists of filenames and unique file ID keys.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "Optional snippet or word to match filenames" }
        }
      }
    },
    {
      name: "read_google_doc",
      description: "Fetch plain text contents inside any Google Doc using the documentId.",
      parameters: {
        type: "OBJECT",
        properties: {
          documentId: { type: "STRING", description: "The Google Document ID" }
        },
        required: ["documentId"]
      }
    },
    {
      name: "read_google_sheet",
      description: "Fetch block range value data from a Google Sheet.",
      parameters: {
        type: "OBJECT",
        properties: {
          spreadsheetId: { type: "STRING", description: "The Google Sheets spreadsheetId" },
          range: { type: "STRING", description: "Range in A1 notation, e.g. 'Sheet1!A1:C20'" }
        },
        required: ["spreadsheetId", "range"]
      }
    },
    {
      name: "add_to_google_sheet",
      description: "Append a list of values as a spreadsheet row inside a specified Google Sheet range table.",
      parameters: {
        type: "OBJECT",
        properties: {
          spreadsheetId: { type: "STRING", description: "The Google Sheets spreadsheetId" },
          range: { type: "STRING", description: "Target range or sheet title, e.g. 'Sheet1!A1'" },
          values: { 
            type: "ARRAY", 
            description: "Simple list of column values, e.g. ['Value A', 'Value B', 'Value C']",
            items: { type: "STRING" }
          }
        },
        required: ["spreadsheetId", "range", "values"]
      }
    }
  ]
};

// --- API Router Endpoints ---

// Advisor & Assistant Query endpoint (supports recursive Google Workspace Function Loops)
app.post("/api/shadow/query", async (req, res) => {
  const { prompt, chatHistory, accessToken, adaptiveContext } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt parameter." });
  }

  try {
    // Standardize Chat History format for Gemini
    const contents: any[] = [];
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role === "model" ? "model" : "user",
          parts: msg.parts || [{ text: msg.text || "" }]
        });
      });
    }

    // Append the latest user query
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    let currentContents = [...contents];
    let hasMoreToolInvocations = true;
    let maxIterations = 5; // prevent infinite loops
    let finalQueryResponse = "";
    const toolCallsMade: string[] = [];

    const baseInstruction = "You are 'SHADOW Assistant Agent v1.0', an open-source, highly accessible voice-activated agent designed specifically to assist users with disabilities in managing their desktop and phone environments. You are activated by saying 'Hey Shadow'. You are extremely polite, supportive, clear, and prioritize accessibility. You can access desktop records, phone notifications, and perform home assistant tasks using Google Workspace Tools when requested. Ensure response answers are encouraging, visually clean, and highly voice-synthesis friendly: avoid complex Markdown inside lines, speak with premium screen-reader friendliness, and keep sentences beautifully punchy.";
    const systemInstruction = adaptiveContext ? `${baseInstruction}\n${adaptiveContext}` : baseInstruction;

    while (hasMoreToolInvocations && maxIterations > 0) {
      maxIterations--;
      
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: currentContents,
        config: {
          systemInstruction,
          tools: accessToken ? [workspaceTools as any] : undefined,
        }
      });

      const functionCalls = result.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];
        
        for (const call of functionCalls) {
          const { name, args } = call as any;
          toolCallsMade.push(name);
          
          // Execute Google REST API
          const toolResult = await executeTool(name, args, accessToken);
          
          functionResponses.push({
            name,
            response: { result: toolResult }
          });
        }

        // Add model assistant turn to preserve chain
        currentContents.push({
          role: "model",
          parts: functionCalls.map((fc: any) => ({
            functionCall: fc
          }))
        });

        // Add tool execution response turn
        currentContents.push({
          role: "user",
          parts: functionResponses.map((fcResp: any) => ({
            functionResponse: fcResp
          }))
        });
      } else {
        finalQueryResponse = result.text || "";
        hasMoreToolInvocations = false;
      }
    }

    res.json({
      text: finalQueryResponse || "Shadow computed your request, but generated an empty output.",
      toolCallsMade
    });

  } catch (error: any) {
    console.error("Gemini Shadow Query Failure:", error);
    res.status(500).json({ error: error.message || "Advisor error processing response." });
  }
});

// Live Object/Scene Snapshot Camera Image Analysis
app.post("/api/shadow/image-analysis", async (req, res) => {
  const { image, mimeType, prompt } = req.body;
  if (!image) {
    return res.status(400).json({ error: "Missing base64 representation of snapshot image." });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: image,
      }
    };
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        imagePart,
        { text: prompt || "Analyze this camera frame. Tell me what objects you see, and advise me on any relevant action or detail." }
      ],
      config: {
        systemInstruction: "You are 'Shadow' analyzing live visual snapshots or video feeds from the client camera safely. Maintain a dark, Royal adviser persona, giving premium, clear analytical details."
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Multimodal Snapshot Analysis Fail:", error);
    res.status(500).json({ error: error.message || "Failed to analyze camera feed." });
  }
});

// health indicator check
app.get("/api/health", (req, res) => {
  res.json({ status: "alive" });
});

// Start Host Server & Vite Integration Client serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shadow server running on port ${PORT}`);
  });
}

startServer();
