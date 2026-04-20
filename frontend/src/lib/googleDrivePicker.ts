// src/lib/googleDrivePicker.ts
// Google Drive Picker integration for rubric import

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleWindow extends Window {
  gapi: {
    load: (lib: string, callback: () => void) => void;
  };
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: TokenResponse) => void;
        }) => {
          requestAccessToken: () => void;
        };
      };
    };
    picker: {
      DocsView: new () => {
        setMimeTypes: (types: string) => void;
      };
      PickerBuilder: new () => {
        setAppId: (id: string) => PickerBuilder;
        setDeveloperKey: (key: string) => PickerBuilder;
        setOAuthToken: (token: string) => PickerBuilder;
        addView: (view: unknown) => PickerBuilder;
        setCallback: (callback: (data: PickerData) => void) => PickerBuilder;
        build: () => {
          setVisible: (visible: boolean) => void;
        };
      };
    };
  };
}

interface PickerData {
  action: string;
  docs?: Array<{
    id: string;
    name: string;
    mimeType: string;
  }>;
}

interface PickerBuilder {
  setAppId: (id: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  addView: (view: unknown) => PickerBuilder;
  setCallback: (callback: (data: PickerData) => void) => PickerBuilder;
  build: () => {
    setVisible: (visible: boolean) => void;
  };
}

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
}

export const loadScript = (src: string): Promise<void> =>
  new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });

export async function openGoogleDrivePicker(
  onPicked?: (file: PickedFile) => void
): Promise<PickedFile | undefined> {
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
  const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

  if (!CLIENT_ID || !API_KEY) throw new Error("Missing Google credentials");

  const win = window as unknown as GoogleWindow;

  // Load gapi and picker libs
  await loadScript("https://apis.google.com/js/api.js");
  // Wait for gapi to be ready
  await new Promise<void>((res) => win.gapi.load("client:auth2", res));

  // Use Google Identity Services to get an access token
  await loadScript("https://accounts.google.com/gsi/client");
  const tokenResponse = await new Promise<TokenResponse>((resolve) => {
    const client = win.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (resp: TokenResponse) => resolve(resp),
    });
    client.requestAccessToken();
  });

  const oauthToken = tokenResponse.access_token;
  if (!oauthToken) throw new Error("No access token");

  // Load picker and return a promise that resolves when file is picked
  return new Promise<PickedFile | undefined>((resolve) => {
    win.gapi.load("picker", () => {
      const view = new win.google.picker.DocsView();
      view.setMimeTypes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.ms-excel,text/csv"
      );
      const picker = new win.google.picker.PickerBuilder()
        .setAppId("")
        .setDeveloperKey(API_KEY)
        .setOAuthToken(oauthToken)
        .addView(view)
        .setCallback((data: PickerData) => {
          if (data.action === "picked" && data.docs && data.docs[0]) {
            const doc = data.docs[0];
            const pickedFile: PickedFile = {
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
            };
            if (onPicked) onPicked(pickedFile);
            resolve(pickedFile);
          } else if (data.action === "cancel") {
            resolve(undefined);
          }
        })
        .build();
      picker.setVisible(true);
    });
  });
}
