const THREADS_API_BASE = "https://graph.threads.net/v1.0";

type RequestInitWithAuth = RequestInit & {
  accessToken: string;
};

type FormBodyValue = string | number | boolean | undefined | null;

function createUrl(path: string, accessToken: string) {
  const url = new URL(`${THREADS_API_BASE}${path}`);

  if (!url.searchParams.has("access_token")) {
    url.searchParams.set("access_token", accessToken);
  }

  return url;
}

export async function threadsFetch<T>(
  path: string,
  { accessToken, headers, ...init }: RequestInitWithAuth
): Promise<T> {
  const url = createUrl(path, accessToken);

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Threads API error (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}

export async function threadsFormPost<T>(
  path: string,
  payload: Record<string, FormBodyValue>,
  accessToken: string
): Promise<T> {
  const url = createUrl(path, accessToken);
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    body.set(key, String(value));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Threads API error (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}

export type ThreadsNode = {
  id: string;
  text?: string;
  username?: string;
  permalink?: string;
  timestamp?: string;
  media_type?: string;
};

type ThreadsListResponse = {
  data?: ThreadsNode[];
};

export async function getThreadsUserThreads(userId: string, accessToken: string): Promise<ThreadsNode[]> {
  const response = await threadsFetch<ThreadsListResponse>(
    `/${userId}/threads?fields=id,text,username,permalink,timestamp,media_type`,
    { accessToken }
  );

  return response.data ?? [];
}

export async function getThreadsReplies(mediaId: string, accessToken: string): Promise<ThreadsNode[]> {
  const response = await threadsFetch<ThreadsListResponse>(
    `/${mediaId}/replies?fields=id,text,username,permalink,timestamp`,
    { accessToken }
  );

  return response.data ?? [];
}
