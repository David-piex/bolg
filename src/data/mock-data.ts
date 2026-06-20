import type { InviteCode } from "@/domain/invites";
import type { MembershipLevel, Viewer } from "@/domain/membership";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  level: Exclude<MembershipLevel, "public">;
  disabled: boolean;
  isAdmin: boolean;
};

export type PostRecord = {
  id: string;
  type: "post";
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  visibility: MembershipLevel;
  publishedAt: string;
};

export type AlbumRecord = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  defaultVisibility: MembershipLevel;
  publishedAt: string;
};

export type PhotoRecord = {
  id: string;
  albumId: string;
  title: string;
  imageUrl: string;
  visibilityOverride: MembershipLevel | null;
  sortOrder: number;
};

export type VideoCollectionRecord = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  defaultVisibility: MembershipLevel;
  publishedAt: string;
};

export type VideoRecord = {
  id: string;
  collectionId: string;
  title: string;
  description: string;
  mediaAssetId: string;
  playbackUrl: string;
  thumbnailUrl: string;
  visibilityOverride: MembershipLevel | null;
  processingState: "ready" | "processing";
  sortOrder: number;
};

export const users: UserProfile[] = [
  {
    id: "admin-1",
    name: "站长",
    email: "admin@example.com",
    level: "diamond",
    disabled: false,
    isAdmin: true
  },
  {
    id: "user-normal",
    name: "林然",
    email: "normal@example.com",
    level: "normal",
    disabled: false,
    isAdmin: false
  },
  {
    id: "user-gold",
    name: "阿金",
    email: "gold@example.com",
    level: "gold",
    disabled: false,
    isAdmin: false
  },
  {
    id: "user-diamond",
    name: "石野",
    email: "diamond@example.com",
    level: "diamond",
    disabled: false,
    isAdmin: false
  }
];

export const invites: InviteCode[] = [
  { id: "invite-normal", code: "NORMAL-8K2P", targetLevel: "normal", usedByUserId: null, note: "普通用户" },
  { id: "invite-gold", code: "GOLD-9M4Q", targetLevel: "gold", usedByUserId: null, note: "黄金用户" },
  { id: "invite-diamond", code: "DIAMOND-2X7R", targetLevel: "diamond", usedByUserId: null, note: "钻石用户" },
  { id: "invite-used", code: "USED-1A1A", targetLevel: "gold", usedByUserId: "user-gold", note: "已使用" }
];

export const posts: PostRecord[] = [
  {
    id: "post-public",
    type: "post",
    title: "公开更新：六月片场手记",
    excerpt: "一组新的片段和照片已经整理完成，公开视频也会放在这里。",
    body: "这条动态所有访客可见，用来展示公开内容。",
    coverImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    visibility: "public",
    publishedAt: "2026-06-18"
  },
  {
    id: "post-normal",
    type: "post",
    title: "会员更新：幕后照片整理",
    excerpt: "普通会员可见的图文动态，用来承载日常内容。",
    body: "这条动态登录用户可见。",
    coverImage: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
    visibility: "normal",
    publishedAt: "2026-06-17"
  },
  {
    id: "post-gold",
    type: "post",
    title: "黄金内容：完整拍摄笔记",
    excerpt: "黄金和钻石用户可见的长动态。",
    body: "这条动态面向黄金以上用户。",
    coverImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
    visibility: "gold",
    publishedAt: "2026-06-16"
  },
  {
    id: "post-diamond",
    type: "post",
    title: "钻石内容：未公开剪辑说明",
    excerpt: "钻石用户专属说明和片段索引。",
    body: "这条动态只有钻石用户可见。",
    coverImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    visibility: "diamond",
    publishedAt: "2026-06-15"
  }
];

export const albums: AlbumRecord[] = [
  {
    id: "album-public",
    title: "公开相册",
    description: "访客也能浏览的精选照片。",
    coverImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    defaultVisibility: "public",
    publishedAt: "2026-06-14"
  },
  {
    id: "album-members",
    title: "会员相册",
    description: "默认黄金可见，内部照片可单独提升到钻石。",
    coverImage: "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1200&q=80",
    defaultVisibility: "gold",
    publishedAt: "2026-06-13"
  }
];

export const photos: PhotoRecord[] = [
  {
    id: "photo-public-1",
    albumId: "album-public",
    title: "公开封面",
    imageUrl: "https://images.unsplash.com/photo-1480365501497-199581be0e66?auto=format&fit=crop&w=900&q=80",
    visibilityOverride: null,
    sortOrder: 1
  },
  {
    id: "photo-member-1",
    albumId: "album-members",
    title: "黄金现场",
    imageUrl: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
    visibilityOverride: null,
    sortOrder: 1
  },
  {
    id: "photo-member-2",
    albumId: "album-members",
    title: "钻石特写",
    imageUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
    visibilityOverride: "diamond",
    sortOrder: 2
  }
];

export const videoCollections: VideoCollectionRecord[] = [
  {
    id: "videos-public",
    title: "公开短片",
    description: "公开预告和试看内容。",
    coverImage: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
    defaultVisibility: "public",
    publishedAt: "2026-06-12"
  },
  {
    id: "videos-member",
    title: "会员视频合集",
    description: "默认黄金可见，单条视频可设为钻石。",
    coverImage: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80",
    defaultVisibility: "gold",
    publishedAt: "2026-06-11"
  }
];

export const videos: VideoRecord[] = [
  {
    id: "video-public-1",
    collectionId: "videos-public",
    title: "公开预告片",
    description: "所有访客可播放。",
    mediaAssetId: "demo-public-video",
    playbackUrl: "/api/media/demo-public-video/access",
    thumbnailUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
    visibilityOverride: null,
    processingState: "ready",
    sortOrder: 1
  },
  {
    id: "video-member-1",
    collectionId: "videos-member",
    title: "黄金正片",
    description: "黄金和钻石用户可播放。",
    mediaAssetId: "demo-gold-video",
    playbackUrl: "/api/media/demo-gold-video/access",
    thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80",
    visibilityOverride: null,
    processingState: "ready",
    sortOrder: 1
  },
  {
    id: "video-member-2",
    collectionId: "videos-member",
    title: "钻石花絮",
    description: "钻石用户可播放。",
    mediaAssetId: "demo-diamond-video",
    playbackUrl: "/api/media/demo-diamond-video/access",
    thumbnailUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    visibilityOverride: "diamond",
    processingState: "processing",
    sortOrder: 2
  }
];

export const scenarioViewers: Record<string, Viewer> = {
  visitor: null,
  normal: { level: "normal", disabled: false, isAdmin: false },
  gold: { level: "gold", disabled: false, isAdmin: false },
  diamond: { level: "diamond", disabled: false, isAdmin: false },
  admin: { level: "diamond", disabled: false, isAdmin: true }
};
