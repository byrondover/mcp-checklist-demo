import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Border } from "../printables/selects/select-border";
import { Color } from "../printables/selects/select-color";
import { Button } from "../ui/button";
import { LessonEntity } from "../../types/api-types";
import {
  generateDocumentStyleRequest,
  generateHeaderRequests,
  generateEmptyTableRequest,
  generateTableContentRequests,
  generateCreateFooterRequest,
  generateFooterContentRequest,
  PageTracker,
  estimateTableHeight,
  shouldInsertPageBreak,
  generatePageBreakRequest,
} from "../../lib/google-doc-generator";
import { YesNo } from "../../hooks/use-checklist-options";

const SCOPES =
  "https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file";
const DISCOVERY_DOC = "https://docs.googleapis.com/$discovery/rest?version=v1";

interface GoogleDocExportButtonProps {
  lessons: LessonEntity[];
  courseName: string;
  sectionName: string;
  unitName: string;
  border: Border;
  color: Color;
  includeClassName: YesNo;
  courseClassName: string;
  googleClientId: string;
  teacherSignOff: YesNo;
  includeVideoHyperlinks: YesNo;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token: string; expires_in: number }) => void
          }) => {
            requestAccessToken: () => void
          }
        }
      }
    }
    gapi?: {
      load: (api: string, callback: () => void) => void
      client: {
        init: (config: { apiKey?: string; discoveryDocs: string[] }) => Promise<void>
        drive: {
          files: {
            create: (params: {
              resource: { name: string; mimeType: string }
              fields: string
            }) => Promise<{ result: { id: string; webViewLink: string } }>
          }
        }
      }
    }
  }
}

export function GoogleDocExportButton({
  lessons,
  courseName,
  sectionName,
  unitName,
  border,
  color,
  includeClassName,
  courseClassName,
  googleClientId,
  teacherSignOff,
  includeVideoHyperlinks,
}: GoogleDocExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState<{
    requestAccessToken: () => void;
  } | null>(null);

  const fetchDocumentContent = async (docId: string, token: string) => {
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch doc structure");
    return await response.json();
  };

  const handleExport = useCallback(
    async (accessToken: string) => {
      try {
        const createRes = await fetch(
          "https://www.googleapis.com/drive/v3/files",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `Checklist - ${sectionName}`,
              mimeType: "application/vnd.google-apps.document",
            }),
          }
        );
        const docData = await createRes.json();
        const documentId = docData.id;

        const setupRequests = [
            generateDocumentStyleRequest(),
            ...generateHeaderRequests({
                sectionName,
                courseName,
                unitName,
                borderVariant: border,
                includeClassName,
                courseClassName,
                colorTheme: color,
            })
        ];

        await fetch(
          `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ requests: setupRequests }),
          }
        );

        const pageTracker = new PageTracker();

        for (let i = 0; i < lessons.length; i++) {
            const lesson = lessons[i];

            const tableHeight = estimateTableHeight(lesson, teacherSignOff);

            if (shouldInsertPageBreak(
              pageTracker.getCurrentHeight(),
              tableHeight,
              i === 0
            )) {
                await fetch(
                    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            requests: [generatePageBreakRequest()]
                        }),
                    }
                );
                
                pageTracker.resetPage();
            } else if (i > 0) {
                await fetch(
                    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            requests: [{ insertText: { text: "\n", endOfSegmentLocation: { segmentId: "" } } }]
                        }),
                    }
                );
            }

            await fetch(
                `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        requests: [generateEmptyTableRequest(lesson, teacherSignOff)],
                    }),
                }
            );

            const updatedDoc = await fetchDocumentContent(documentId, accessToken);
            const content = updatedDoc.body.content;
            const tableItem = content.slice().reverse().find((item: any) => item.table);

            if (tableItem && tableItem.table) {
                const formatRequests = generateTableContentRequests(
                    lesson,
                    tableItem.startIndex,
                    tableItem.table.tableRows,
                    {
                        teacherSignOff,
                        includeVideoHyperlinks,
                        colorTheme: color,
                    }
                );

                await fetch(
                    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ requests: formatRequests }),
                    }
                );
            }
            
            pageTracker.addTable(tableHeight);
        }

        const createFooterRes = await fetch(
          `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ requests: [generateCreateFooterRequest()] }),
          }
        );

        const footerResponseData = await createFooterRes.json();
        const footerId =
          footerResponseData.replies[0].createFooter.footerId;

        await fetch(
          `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requests: generateFooterContentRequest(footerId, border, color),
            }),
          }
        );

        toast.success("Google Doc created successfully!");
        window.open(
          `https://docs.google.com/document/d/${documentId}/edit`,
          "_blank"
        );
        setIsLoading(false);
      } catch (error) {
        console.error('Error creating Google Doc:', error)
        toast.error('Failed to create Google Doc')
        setIsLoading(false)
      }
    },
    [
      lessons,
      courseName,
      sectionName,
      unitName,
      courseClassName,
      border,
      color,
      includeClassName,
      teacherSignOff,
      includeVideoHyperlinks,
    ]
  );

  useEffect(() => {
    // Load Google API script
    const script1 = window.document.createElement('script')
    script1.src = 'https://apis.google.com/js/api.js'
    script1.async = true
    script1.defer = true
    script1.onload = () => {
      if (window.gapi) {
        window.gapi.load('client', async () => {
          try {
            await window.gapi!.client.init({
              discoveryDocs: [DISCOVERY_DOC],
            })
            setGapiInited(true)
          } catch (error) {
            console.error('Error initializing GAPI client:', error)
          }
        })
      }
    }
    window.document.body.appendChild(script1)

    // Load Google Identity Services script
    const script2 = window.document.createElement('script')
    script2.src = 'https://accounts.google.com/gsi/client'
    script2.async = true
    script2.defer = true
    script2.onload = () => {
      if (window.google) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: SCOPES,
          callback: async (response) => {
            if (response.access_token) {
              localStorage.setItem('google_access_token', response.access_token)
              localStorage.setItem('google_token_expiry', String(Date.now() + response.expires_in * 1000))
              await handleExport(response.access_token)
            }
          },
        })
        setTokenClient(client)
        setGisInited(true)
      }
    }
    window.document.body.appendChild(script2)

    return () => {
      window.document.body.removeChild(script1)
      window.document.body.removeChild(script2)
    }
  }, [googleClientId, handleExport])

  const handleClick = () => {
    // Check if we have a valid token in localStorage
    const token = localStorage.getItem('google_access_token')
    const expiry = localStorage.getItem('google_token_expiry')

    if (token && expiry && Date.now() < Number(expiry)) {
      // Token is still valid, use it directly
      setIsLoading(true)
      handleExport(token)
    } else {
      // Need to authenticate
      if (!gapiInited || !gisInited || !tokenClient) {
        toast.info('Google APIs are unavailable. Please check VITE_GOOGLE_CLIENT_ID in your .env file.')
        return
      }

      setIsLoading(true)
      tokenClient.requestAccessToken()
    }
  }

  return (
    <Button variant="teal" onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        'Export to Google Docs'
      )}
    </Button>
  )
}
