declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer } | { buffer: any }): Promise<MammothResult>;
  export function extractRawText(input: { arrayBuffer: ArrayBuffer } | { buffer: any }): Promise<MammothResult>;
}
