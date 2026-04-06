import { decryptString } from "@/lib/crypto";
import { threadsFetch, threadsFormPost } from "@/lib/platforms/threads/client";
import type { PostContent, PublishResult } from "@/lib/platforms/types";
import { prisma } from "@/lib/prisma";

type ThreadsCreationResponse = {
  id: string;
};

type ThreadsStatusResponse = {
  id: string;
  status?: string;
  error_message?: string;
};

type ThreadsPublishResponse = {
  id: string;
};

type ThreadsPublishedNode = {
  id: string;
  permalink?: string;
};

function getMediaPayload(content: PostContent) {
  if (content.contentType === "carousel" || (content.mediaUrls?.length ?? 0) > 1) {
    throw new Error("第一版暫不支援 carousel，請先使用文字或單一媒體貼文。");
  }

  const firstMediaUrl = content.mediaUrls?.[0];

  switch (content.contentType) {
    case "text":
      return { media_type: "TEXT" };
    case "image":
      if (!firstMediaUrl) {
        throw new Error("圖片貼文需要提供 media URL。");
      }
      return { media_type: "IMAGE", image_url: firstMediaUrl };
    case "video":
      if (!firstMediaUrl) {
        throw new Error("影片貼文需要提供 media URL。");
      }
      return { media_type: "VIDEO", video_url: firstMediaUrl };
    default:
      throw new Error(`尚未支援的內容類型：${content.contentType}`);
  }
}

async function waitForContainer(accessToken: string, containerId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const status = await threadsFetch<ThreadsStatusResponse>(`/${containerId}?fields=id,status,error_message`, {
      accessToken
    });

    if (!status.status || status.status === "FINISHED" || status.status === "PUBLISHED") {
      return;
    }

    if (status.status === "ERROR" || status.error_message) {
      throw new Error(status.error_message ?? "Threads container processing failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
}

export async function publishToThreads(accountId: string, content: PostContent): Promise<PublishResult> {
  const account = await prisma.platformAccount.findUnique({
    where: {
      id: accountId
    }
  });

  if (!account) {
    throw new Error("找不到指定的 Threads 帳號。");
  }

  const accessToken = decryptString(account.accessToken);
  const mediaPayload = getMediaPayload(content);

  const container = await threadsFormPost<ThreadsCreationResponse>(
    `/${account.platformUserId}/threads`,
    {
      text: content.text,
      reply_to_id: content.replyToPostId,
      ...mediaPayload
    },
    accessToken
  );

  if (content.contentType !== "text") {
    await waitForContainer(accessToken, container.id);
  }

  const published = await threadsFormPost<ThreadsPublishResponse>(
    `/${account.platformUserId}/threads_publish`,
    {
      creation_id: container.id
    },
    accessToken
  );

  let permalink: string | undefined;

  try {
    const node = await threadsFetch<ThreadsPublishedNode>(`/${published.id}?fields=id,permalink`, {
      accessToken
    });
    permalink = node.permalink;
  } catch {}

  return {
    platformPostId: published.id,
    url: permalink
  };
}
