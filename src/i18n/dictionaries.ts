import type { MembershipLevel } from "@/domain/membership";
import type { Locale } from "@/i18n/routing";

type Dictionary = {
  nav: {
    home: string;
    posts: string;
    albums: string;
    videos: string;
    login: string;
    admin: string;
    primary: string;
  };
  home: {
    eyebrow: string;
    archiveKicker: string;
    title: string;
    subtitle: string;
    latest: string;
    recentlyCleared: string;
    viewerStatus: string;
    inviteOnlyLabel: string;
    languageLabel: string;
    accessLadder: string;
    accessLadderAria: string;
    featuredPreviewAria: string;
    inviteOnly: string;
    bilingual: string;
  };
  auth: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    inviteCode: string;
    register: string;
    login: string;
    name: string;
    demoLogin: string;
    currentUser: string;
    logout: string;
    invalidInvite: string;
    usedInvite: string;
    registered: string;
    loggedIn: string;
    authFailed: string;
  };
  admin: {
    title: string;
    subtitle: string;
    content: string;
    invites: string;
    users: string;
    uploadImages: string;
    uploadVideos: string;
    imageStorage: string;
    videoStorage: string;
    contentType: string;
    localFile: string;
    uploadImageFile: string;
    uploadVideoFile: string;
    uploadNeedsLogin: string;
    uploading: string;
    uploadReady: string;
    uploadFailed: string;
    videoUploadNeedsMemberLevel: string;
    generateInvite: string;
    changeLevel: string;
    demoNotice: string;
  };
  membership: Record<MembershipLevel, string> & {
    visitor: string;
    admin: string;
    locked: string;
  };
  content: {
    posts: string;
    albums: string;
    videos: string;
    post: string;
    album: string;
    videoCollection: string;
    archiveEntry: string;
    photoUnit: string;
    videoUnit: string;
    postUnit: string;
    albumUnit: string;
    videoCollectionUnit: string;
    visibility: string;
    albumsDescription: string;
    videosDescription: string;
    inherited: string;
    collectionDefault: string;
    processing: string;
    titlePlaceholder: string;
    bodyPlaceholder: string;
    imageUrl: string;
    videoUrl: string;
    enable: string;
    disable: string;
  };
  common: {
    language: string;
    chinese: string;
    english: string;
    switchToChinese: string;
    switchToEnglish: string;
    view: string;
    publish: string;
    save: string;
    status: string;
    colon: string;
  };
};

export const dictionaries: Record<Locale, Dictionary> = {
  zh: {
    nav: {
      home: "首页",
      posts: "动态",
      albums: "相册",
      videos: "视频",
      login: "登录/注册",
      admin: "后台",
      primary: "主导航"
    },
    home: {
      eyebrow: "绫奈",
      archiveKicker: "媒体档案",
      title: "绫奈动态、相册和视频，按会员等级开放。",
      subtitle: "访客看公开内容，普通、黄金、钻石用户按权限浏览。邀请码决定初始等级，你也可以在后台调整。",
      latest: "最新内容",
      recentlyCleared: "最近开放",
      viewerStatus: "当前身份",
      inviteOnlyLabel: "邀请码注册",
      languageLabel: "语言版本",
      accessLadder: "权限阶梯",
      accessLadderAria: "会员权限阶梯",
      featuredPreviewAria: "精选内容预览",
      inviteOnly: "一次性邀请码注册",
      bilingual: "默认中文，可切换英文"
    },
    auth: {
      title: "用邀请码进入",
      subtitle: "没有邀请码不能注册。邀请码可预设普通、黄金或钻石等级。",
      email: "邮箱",
      password: "密码",
      inviteCode: "邀请码",
      register: "注册",
      login: "登录",
      name: "昵称",
      demoLogin: "切换演示身份",
      currentUser: "当前身份",
      logout: "退出",
      invalidInvite: "邀请码无效",
      usedInvite: "邀请码已被使用",
      registered: "注册成功，已切换到新账号",
      loggedIn: "登录成功",
      authFailed: "登录或注册失败"
    },
    admin: {
      title: "管理员后台",
      subtitle: "发布内容、生成邀请码、调整用户等级。",
      content: "内容管理",
      invites: "邀请码管理",
      users: "用户管理",
      uploadImages: "图片上传服务：Supabase",
      uploadVideos: "视频上传服务：Cloudinary",
      imageStorage: "图片存储",
      videoStorage: "视频存储",
      contentType: "内容类型",
      localFile: "本地文件",
      uploadImageFile: "上传图片文件",
      uploadVideoFile: "上传视频文件",
      uploadNeedsLogin: "请先用管理员账号登录，再上传文件。",
      uploading: "正在上传文件",
      uploadReady: "上传完成，地址已回填。",
      uploadFailed: "上传失败，请检查服务配置后重试。",
      videoUploadNeedsMemberLevel: "视频文件上传请选择普通、黄金或钻石等级。",
      generateInvite: "生成邀请码",
      changeLevel: "调整等级",
      demoNotice: "本地演示会保存在浏览器 localStorage，接入 Supabase 后替换为真实数据。"
    },
    membership: {
      public: "公开",
      normal: "普通",
      gold: "黄金",
      diamond: "钻石",
      visitor: "访客",
      admin: "管理员",
      locked: "权限不足"
    },
    content: {
      posts: "动态",
      albums: "相册",
      videos: "视频",
      post: "动态",
      album: "相册",
      videoCollection: "视频合集",
      archiveEntry: "内容条目",
      photoUnit: "张照片",
      videoUnit: "个视频",
      postUnit: "条动态",
      albumUnit: "个相册",
      videoCollectionUnit: "个视频合集",
      visibility: "可见等级",
      albumsDescription: "相册会按默认等级开放，单张照片也可以单独设置权限。",
      videosDescription: "视频按会员等级开放，普通、黄金、钻石用户会看到不同内容。",
      inherited: "继承合集权限",
      collectionDefault: "合集默认权限",
      processing: "处理中",
      titlePlaceholder: "标题",
      bodyPlaceholder: "正文",
      imageUrl: "图片地址",
      videoUrl: "视频地址",
      enable: "启用",
      disable: "停用"
    },
    common: {
      language: "语言",
      chinese: "中文",
      english: "英文版",
      switchToChinese: "切换到中文",
      switchToEnglish: "切换到英文",
      view: "查看",
      publish: "发布",
      save: "保存",
      status: "状态",
      colon: "："
    }
  },
  en: {
    nav: {
      home: "Home",
      posts: "Posts",
      albums: "Albums",
      videos: "Videos",
      login: "Login / Register",
      admin: "Admin",
      primary: "Primary navigation"
    },
    home: {
      eyebrow: "Ayana",
      archiveKicker: "Media archive",
      title: "Ayana updates, albums, and videos gated by member level.",
      subtitle: "Visitors see public content. Normal, Gold, and Diamond members browse by access level. Invite codes set the initial tier, and admins can adjust it later.",
      latest: "Latest",
      recentlyCleared: "Recently cleared",
      viewerStatus: "Viewer status",
      inviteOnlyLabel: "Invite only",
      languageLabel: "Language",
      accessLadder: "Access ladder",
      accessLadderAria: "Membership access ladder",
      featuredPreviewAria: "Featured media preview",
      inviteOnly: "One-time invite-code registration",
      bilingual: "Chinese by default, English available"
    },
    auth: {
      title: "Enter with an invite code",
      subtitle: "Registration requires a one-time invite code with a preset Normal, Gold, or Diamond level.",
      email: "Email",
      password: "Password",
      inviteCode: "Invite code",
      register: "Register",
      login: "Login",
      name: "Name",
      demoLogin: "Switch demo identity",
      currentUser: "Current identity",
      logout: "Logout",
      invalidInvite: "Invalid invite code",
      usedInvite: "Invite code has already been used",
      registered: "Registered and switched to the new account",
      loggedIn: "Logged in",
      authFailed: "Login or registration failed"
    },
    admin: {
      title: "Admin dashboard",
      subtitle: "Publish content, generate invite codes, and adjust user levels.",
      content: "Content",
      invites: "Invite codes",
      users: "Users",
      uploadImages: "Upload images to Supabase",
      uploadVideos: "Upload videos to Cloudinary",
      imageStorage: "Image storage",
      videoStorage: "Video storage",
      contentType: "Content type",
      localFile: "Local file",
      uploadImageFile: "Upload image file",
      uploadVideoFile: "Upload video file",
      uploadNeedsLogin: "Log in as an admin before uploading files.",
      uploading: "Uploading file",
      uploadReady: "Upload complete. URL filled in.",
      uploadFailed: "Upload failed. Check service configuration and try again.",
      videoUploadNeedsMemberLevel: "Choose Normal, Gold, or Diamond before uploading a video file.",
      generateInvite: "Generate invite",
      changeLevel: "Change level",
      demoNotice: "The local demo is saved in browser localStorage. Replace it with Supabase for production."
    },
    membership: {
      public: "Public",
      normal: "Normal",
      gold: "Gold",
      diamond: "Diamond",
      visitor: "Visitor",
      admin: "Admin",
      locked: "Locked"
    },
    content: {
      posts: "Posts",
      albums: "Albums",
      videos: "Videos",
      post: "Post",
      album: "Album",
      videoCollection: "Video collection",
      archiveEntry: "Archive entry",
      photoUnit: "photos",
      videoUnit: "videos",
      postUnit: "posts",
      albumUnit: "albums",
      videoCollectionUnit: "video collections",
      visibility: "Visibility",
      albumsDescription: "Albums open by default access level. Individual photos can use their own visibility.",
      videosDescription: "Videos are opened by member level, so Normal, Gold, and Diamond users may see different collections.",
      inherited: "Inherits collection access",
      collectionDefault: "Collection default",
      processing: "Processing",
      titlePlaceholder: "Title",
      bodyPlaceholder: "Body",
      imageUrl: "Image URL",
      videoUrl: "Video URL",
      enable: "Enable",
      disable: "Disable"
    },
    common: {
      language: "Language",
      chinese: "中文版",
      english: "English",
      switchToChinese: "Switch to Chinese",
      switchToEnglish: "Switch to English",
      view: "View",
      publish: "Publish",
      save: "Save",
      status: "Status",
      colon: ": "
    }
  }
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
