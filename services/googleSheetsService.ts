
/**
 * Google Sheets API 연동 서비스
 * - Google OAuth 2.0 인증
 * - Sheets API v4 사용
 * - 실시간 양방향 동기화
 */

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export class GoogleSheetsService {
  private gapiInited = false;
  private gisInited = false;
  private tokenClient: any;
  private spreadsheetId: string = '';

  constructor() {
    this.loadGoogleAPIs();
  }

  private loadGoogleAPIs() {
    if (typeof window === 'undefined') return;
    
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => this.gapiLoaded();
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => this.gisLoaded();
    document.body.appendChild(gisScript);
  }

  private gapiLoaded() {
    window.gapi.load('client', async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
      if (!apiKey) {
        console.warn('Google Sheets API 키가 설정되지 않았습니다. 클라우드 동기화 기능이 비활성화됩니다.');
        return;
      }
      
      await window.gapi.client.init({
        apiKey,
        discoveryDocs: [DISCOVERY_DOC],
      });
      this.gapiInited = true;
    });
  }

  private gisLoaded() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      console.warn('Google OAuth Client ID가 설정되지 않았습니다. 클라우드 동기화 기능이 비활성화됩니다.');
      return;
    }
    
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: '',
    });
    this.gisInited = true;
  }

  async authorize(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.gapiInited || !this.gisInited) {
        reject('Google API가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      this.tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          reject(resp);
          return;
        }
        resolve(true);
      };

      if (window.gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  setSpreadsheetId(id: string) {
    this.spreadsheetId = id;
  }

  async readData(range: string): Promise<any[]> {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });
      return response.result.values || [];
    } catch (err: any) {
      console.error('Read Error:', err);
      throw new Error(err.message);
    }
  }

  async appendData(range: string, values: any[][]): Promise<void> {
    try {
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values },
      });
    } catch (err: any) {
      console.error('Append Error:', err);
      throw new Error(err.message);
    }
  }

  async fetchAccounts(): Promise<any[]> {
    const rows = await this.readData('Accounts!A2:F');
    return rows.map(row => ({
      id: row[0],
      name: row[1],
      broker: row[2],
      taxType: row[3],
      initialBudget: Number(row[4]),
      color: row[5] || 'bg-indigo-600',
    }));
  }

  async fetchTransactions(): Promise<any[]> {
    const rows = await this.readData('Transactions!A2:J');
    return rows.map(row => ({
      id: row[0],
      accountId: row[1],
      date: row[2],
      type: row[3],
      stockName: row[4] || undefined,
      amount: Number(row[5]),
      price: row[6] ? Number(row[6]) : undefined,
      quantity: row[7] ? Number(row[7]) : undefined,
      memo: row[8] || undefined,
    }));
  }

  async addTransaction(tx: any): Promise<void> {
    const row = [
      tx.id,
      tx.accountId,
      tx.date,
      tx.type,
      tx.stockName || '',
      tx.amount,
      tx.price || '',
      tx.quantity || '',
      tx.memo || '',
      new Date().toISOString(),
    ];
    await this.appendData('Transactions!A:J', [row]);
  }

  async addAccount(acc: any): Promise<void> {
    const row = [
      acc.id,
      acc.name,
      acc.broker,
      acc.taxType,
      acc.initialBudget,
      acc.color,
    ];
    await this.appendData('Accounts!A:F', [row]);
  }

  logout() {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken(null);
    }
  }
}

export const sheetsService = new GoogleSheetsService();
