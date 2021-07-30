/**
 * Functions relating to network communication with the Dual server
 */

const DUAL_URL = "http://127.0.0.1:3030";

interface IPostBody {
  prompt: string;
  context: string[];
  generate_paragraphs: number;
}

const fetchEndpoint = (endpoint: string, init?: RequestInit) =>
  fetch(DUAL_URL + endpoint, init);

const getEndpoint = (endpoint: string) => fetchEndpoint(endpoint);
const postEndpoint = (endpoint: string, body: object) =>
  fetchEndpoint(endpoint, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const fetchQuery = (query: string) =>
  getEndpoint("/query" + encodeURIComponent(query));
export const fetchGenerate = (body: IPostBody) =>
  postEndpoint("/generate", body);
export const fetchSearch = (body: IPostBody) => postEndpoint("/search", body);

export async function fetchBinary(url: string): Promise<Blob> {
  const resource = await fetch(url);
  const blob = await resource.blob();
  return blob;
}
