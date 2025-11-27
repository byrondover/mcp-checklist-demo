import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { LessonEntity } from "../../types/api-types";
import { Color } from "../printables/selects/select-color";
import { LessonDivider } from "../printables/selects/select-lesson-divider";
import { GraphicTheme } from "../printables/selects/select-graphic-theme";
import { YesNo } from "../../hooks/use-checklist-options";
import {
  generateGameBoardDocumentStyleRequest,
  generateGameBoardHeaderRequests,
  generatePageTableRequest,
  generatePageTablePropertiesRequest,
  generateSnakeContentRequests,
  prepareGameBoardItems,
  paginateGameBoardItems,
  DocsRequest,
  GameBoardGenerationData,
} from "../../lib/google-gameboard-generator";
import { UserSetting } from "../../types/user-settings";

const SCOPES =
  "https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file";
const DISCOVERY_DOC = "https://docs.googleapis.com/$discovery/rest?version=v1";

interface GoogleGameBoardExportButtonProps {
  lessons: LessonEntity[];
  courseName: string;
  sectionName: string;
  unitName: string;
  courseClassName: string;
  lessonDivider: LessonDivider;
  graphicTheme: GraphicTheme;
  color: Color;
  settings: UserSetting;
  includeClassName: YesNo;
  googleClientId: string;
}

interface GoogleApiClient {
  requestAccessToken: () => void;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface CreateDocumentResponse {
  id: string;
  name: string;
  mimeType: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => GoogleApiClient;
        };
      };
    };
    gapi?: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: {
          apiKey?: string;
          discoveryDocs: string[];
        }) => Promise<void>;
        drive: {
          files: {
            create: (params: {
              resource: { name: string; mimeType: string };
              fields: string;
            }) => Promise<{ result: { id: string; webViewLink: string } }>;
          };
        };
      };
    };
  }
}

async function docsBatchUpdate(
  documentId: string,
  accessToken: string,
  requests: DocsRequest[]
): Promise<Response> {
  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Batch update error:", errorText);
    throw new Error("Google Docs Batch Update failed");
  }

  return response;
}

async function fetchDocumentContent(
  docId: string,
  token: string
): Promise<gapi.client.docs.Document> {
  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch document structure");
  }

  return await response.json();
}

async function createGoogleDoc(
  accessToken: string,
  documentName: string
): Promise<string> {
  const createResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: documentName,
        mimeType: "application/vnd.google-apps.document",
      }),
    }
  );

  if (!createResponse.ok) {
    throw new Error("Failed to create document");
  }

  const docData: CreateDocumentResponse = await createResponse.json();
  return docData.id;
}

export function GoogleGameBoardExportButton({
  lessons,
  courseName,
  sectionName,
  unitName,
  courseClassName,
  lessonDivider,
  graphicTheme,
  color,
  settings,
  includeClassName,
  googleClientId,
}: GoogleGameBoardExportButtonProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gapiInited, setGapiInited] = useState<boolean>(false);
  const [gisInited, setGisInited] = useState<boolean>(false);
  const [tokenClient, setTokenClient] = useState<GoogleApiClient | null>(null);

  const handleExport = useCallback(
    async (accessToken: string): Promise<void> => {
      try {
        setIsLoading(true);

        const documentId = await createGoogleDoc(
          accessToken,
          `Game Board - ${sectionName}`
        );

        const generationData: GameBoardGenerationData = {
          courseName,
          sectionName,
          unitName,
          courseClassName,
          includeClassName,
          lessons,
          lessonDivider,
          graphicTheme,
          colorTheme: color,
        };

        const setupRequests = [
          generateGameBoardDocumentStyleRequest(),
          ...generateGameBoardHeaderRequests(generationData),
        ];

        await docsBatchUpdate(documentId, accessToken, setupRequests);

        const allItems = prepareGameBoardItems(lessons);

        // 15 items per page for 3 rows of 7 cols (will calculate this dynamically later)
        const pages = paginateGameBoardItems(allItems, 15);

        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
          const pageItems = pages[pageIndex];

          const tableRequest = generatePageTableRequest(pageItems.length);
          await docsBatchUpdate(documentId, accessToken, [tableRequest]);

          let updatedDoc = await fetchDocumentContent(documentId, accessToken);
          let content = updatedDoc.body?.content ?? [];
          const tables = content.filter((item) => item.table !== undefined);
          const currentTable = tables[tables.length - 1];

          if (!currentTable || !currentTable.startIndex) continue;

          const propertyRequests = generatePageTablePropertiesRequest(
            currentTable.startIndex
          );
          await docsBatchUpdate(documentId, accessToken, propertyRequests);

          updatedDoc = await fetchDocumentContent(documentId, accessToken);
          content = updatedDoc.body?.content ?? [];
          const updatedTable = content
            .filter((item) => item.table !== undefined)
            .pop();

          if (updatedTable) {
            const contentRequests = generateSnakeContentRequests(
              pageItems,
              updatedTable,
              generationData,
              settings
            );

            const batchSize = 40;
            for (let i = 0; i < contentRequests.length; i += batchSize) {
              const batch = contentRequests.slice(i, i + batchSize);
              await docsBatchUpdate(documentId, accessToken, batch);
            }
          }
        }

        toast.success("Game Board created successfully!");
        window.open(
          `https://docs.google.com/document/d/${documentId}/edit`,
          "_blank"
        );
      } catch (error) {
        console.error("Error creating Game Board:", error);
        toast.error("Failed to create Game Board");
      } finally {
        setIsLoading(false);
      }
    },
    [
      lessons,
      courseName,
      sectionName,
      unitName,
      courseClassName,
      lessonDivider,
      graphicTheme,
      color,
      includeClassName,
    ]
  );

  useEffect(() => {
    const loadGoogleApis = (): (() => void) => {
      const gapiScript = document.createElement("script");
      gapiScript.src = "https://apis.google.com/js/api.js";
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = (): void => {
        if (window.gapi) {
          window.gapi.load("client", async () => {
            try {
              await window.gapi!.client.init({
                discoveryDocs: [DISCOVERY_DOC],
              });
              setGapiInited(true);
            } catch (error) {
              console.error("Error initializing GAPI client:", error);
            }
          });
        }
      };
      document.body.appendChild(gapiScript);

      const gisScript = document.createElement("script");
      gisScript.src = "https://accounts.google.com/gsi/client";
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = (): void => {
        if (window.google) {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: SCOPES,
            callback: async (response: TokenResponse) => {
              if (response.access_token) {
                localStorage.setItem(
                  "google_access_token",
                  response.access_token
                );
                localStorage.setItem(
                  "google_token_expiry",
                  String(Date.now() + response.expires_in * 1000)
                );
                await handleExport(response.access_token);
              }
            },
          });
          setTokenClient(client);
          setGisInited(true);
        }
      };
      document.body.appendChild(gisScript);

      return () => {
        if (document.body.contains(gapiScript)) {
          document.body.removeChild(gapiScript);
        }
        if (document.body.contains(gisScript)) {
          document.body.removeChild(gisScript);
        }
      };
    };

    return loadGoogleApis();
  }, [googleClientId, handleExport]);

  const handleClick = (): void => {
    const token = localStorage.getItem("google_access_token");
    const expiry = localStorage.getItem("google_token_expiry");

    if (token && expiry && Date.now() < Number(expiry)) {
      void handleExport(token);
    } else {
      if (!gapiInited || !gisInited || !tokenClient) {
        toast.info(
          "Google APIs are unavailable. Please check VITE_GOOGLE_CLIENT_ID in your .env file."
        );
        return;
      }

      tokenClient.requestAccessToken();
    }
  };

  return (
    <Button variant="teal" onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        "Export to Google Docs"
      )}
    </Button>
  );
}
