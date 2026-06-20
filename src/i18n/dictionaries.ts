import type { MembershipLevel } from "@/domain/membership";
import type { Locale } from "@/i18n/routing";

type Dictionary = {
  nav: {
    home: string;
    posts: string;
    albums: string;
    videos: string;
    login: string;
    account: string;
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
    loginTitle: string;
    loginHint: string;
    registerTitle: string;
    registerHint: string;
    registerTab: string;
    loginTab: string;
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
  account: {
    title: string;
    subtitle: string;
    loading: string;
    restoring: string;
    loginRequired: string;
    avatar: string;
    avatarAlt: string;
    uploadAvatar: string;
    avatarHint: string;
    avatarUpdated: string;
    avatarFailed: string;
    passwordTitle: string;
    passwordHint: string;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
    savePassword: string;
    passwordUpdated: string;
    passwordFailed: string;
    emailTitle: string;
    emailHint: string;
    emailPassword: string;
    newEmail: string;
    confirmEmail: string;
    saveEmail: string;
    emailUpdated: string;
    emailFailed: string;
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
    titleLabel: string;
    mediaFile: string;
    mediaAttached: string;
    imageUploadedReady: string;
    videoUploadedReady: string;
    postBody: string;
    albumDescription: string;
    videoDescription: string;
    replaceMediaHint: string;
    localFile: string;
    uploadImageFile: string;
    uploadVideoFile: string;
    uploadNeedsLogin: string;
    uploading: string;
    uploadReady: string;
    uploadFailed: string;
    publishFailed: string;
    videoUploadNeedsMemberLevel: string;
    generateInvite: string;
    changeLevel: string;
    demoNotice: string;
    signedInAs: string;
    existingContent: string;
    editContent: string;
    deleteContent: string;
    deleteInvite: string;
    noContent: string;
    noInvites: string;
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
    noCover: string;
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
    cancel: string;
    delete: string;
    edit: string;
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
      login: "登录",
      account: "我的",
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
      title: "登录或使用邀请码注册",
      subtitle: "已有账号直接登录；新用户需要你发的邀请码才能注册。邀请码会决定初始会员等级。",
      loginTitle: "登录账号",
      loginHint: "用邮箱和密码登录。管理员账号会进入管理页。",
      registerTitle: "邀请码注册",
      registerHint: "先输入邀请码，再填写昵称、邮箱和密码。",
      registerTab: "邀请码注册",
      loginTab: "账号登录",
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
    account: {
      title: "账号设置",
      subtitle: "管理头像、邮箱和密码。会员等级由管理员设置，前台不会展示超级管理员入口。",
      loading: "正在读取账号资料",
      restoring: "正在恢复登录状态",
      loginRequired: "请先登录后再管理账号。",
      avatar: "更换头像",
      avatarAlt: "头像",
      uploadAvatar: "上传头像",
      avatarHint: "支持 JPG、PNG、WebP、GIF，大小不超过 10MB。",
      avatarUpdated: "头像已更新。",
      avatarFailed: "头像上传失败，请重新选择文件。",
      passwordTitle: "修改密码",
      passwordHint: "需要输入原密码、新密码和确认新密码。",
      oldPassword: "原密码",
      newPassword: "新密码",
      confirmPassword: "确认新密码",
      savePassword: "保存密码",
      passwordUpdated: "密码已更新。",
      passwordFailed: "密码修改失败，请检查原密码。",
      emailTitle: "修改邮箱",
      emailHint: "需要输入当前密码、新邮箱和确认新邮箱。",
      emailPassword: "邮箱确认密码",
      newEmail: "新邮箱",
      confirmEmail: "确认新邮箱",
      saveEmail: "保存邮箱",
      emailUpdated: "邮箱已更新。",
      emailFailed: "邮箱修改失败，请检查密码或邮箱。"
    },
    admin: {
      title: "管理员后台",
      subtitle: "发布内容、生成邀请码、调整用户等级。",
      content: "内容管理",
      invites: "邀请码管理",
      users: "用户管理",
      uploadImages: "图片上传服务：MinIO",
      uploadVideos: "视频上传服务：MinIO",
      imageStorage: "图片存储",
      videoStorage: "视频存储",
      contentType: "内容类型",
      titleLabel: "标题",
      mediaFile: "媒体文件",
      mediaAttached: "已关联媒体，重新上传可替换。",
      imageUploadedReady: "图片已上传，可随内容发布。",
      videoUploadedReady: "视频已上传，可随内容发布。",
      postBody: "正文",
      albumDescription: "相册描述",
      videoDescription: "视频简介",
      replaceMediaHint: "上传后会自动关联到这条内容，不需要手动填写地址。",
      localFile: "本地文件",
      uploadImageFile: "上传图片文件",
      uploadVideoFile: "上传视频文件",
      uploadNeedsLogin: "请先用管理员账号登录，再上传文件。",
      uploading: "正在上传文件",
      uploadReady: "上传完成，地址已回填。",
      uploadFailed: "上传失败，请检查服务配置后重试。",
      publishFailed: "发布失败，请检查服务配置后重试。",
      videoUploadNeedsMemberLevel: "视频文件上传请选择普通、黄金或钻石等级。",
      generateInvite: "生成邀请码",
      changeLevel: "调整等级",
      demoNotice: "已登录管理员时会同步到 Java 后端；生产环境默认不显示本地演示数据。",
      signedInAs: "当前管理员",
      existingContent: "已发布内容",
      editContent: "编辑内容",
      deleteContent: "删除内容",
      deleteInvite: "删除邀请码",
      noContent: "还没有内容",
      noInvites: "暂无未使用邀请码"
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
      noCover: "暂无封面",
      enable: "启用",
      disable: "停用"
    },
    common: {
      language: "语言",
      chinese: "中文版",
      english: "英文版",
      switchToChinese: "切换到中文",
      switchToEnglish: "切换到英文",
      view: "查看",
      publish: "发布",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      edit: "编辑",
      status: "状态",
      colon: "："
    }
  },  en: {
    nav: {
      home: "Home",
      posts: "Posts",
      albums: "Albums",
      videos: "Videos",
      login: "Login",
      account: "Account",
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
      title: "Log in or register with an invite",
      subtitle: "Existing members can log in directly. New members need an invite code from the admin.",
      loginTitle: "Account login",
      loginHint: "Log in with email and password. Admins are sent to the dashboard after login.",
      registerTitle: "Invite registration",
      registerHint: "Enter the invite code first, then set your name, email, and password.",
      registerTab: "Invite registration",
      loginTab: "Account login",
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
    account: {
      title: "Account settings",
      subtitle: "Manage avatar, email, and password. Membership level is controlled by the admin.",
      loading: "Loading account profile",
      restoring: "Restoring login state",
      loginRequired: "Log in before managing your account.",
      avatar: "Avatar",
      avatarAlt: "Avatar",
      uploadAvatar: "Upload avatar",
      avatarHint: "JPG, PNG, WebP, or GIF. Max 10MB.",
      avatarUpdated: "Avatar updated.",
      avatarFailed: "Avatar upload failed. Choose another file and try again.",
      passwordTitle: "Change password",
      passwordHint: "Enter old password, new password, and confirmation.",
      oldPassword: "Old password",
      newPassword: "New password",
      confirmPassword: "Confirm new password",
      savePassword: "Save password",
      passwordUpdated: "Password updated.",
      passwordFailed: "Password change failed. Check the old password.",
      emailTitle: "Change email",
      emailHint: "Enter your current password, new email, and confirmation.",
      emailPassword: "Password for email change",
      newEmail: "New email",
      confirmEmail: "Confirm new email",
      saveEmail: "Save email",
      emailUpdated: "Email updated.",
      emailFailed: "Email change failed. Check the password or email."
    },
    admin: {
      title: "Admin dashboard",
      subtitle: "Publish content, generate invite codes, and adjust user levels.",
      content: "Content",
      invites: "Invite codes",
      users: "Users",
      uploadImages: "Upload images to MinIO",
      uploadVideos: "Upload videos to MinIO",
      imageStorage: "Image storage",
      videoStorage: "Video storage",
      contentType: "Content type",
      titleLabel: "Title",
      mediaFile: "Media file",
      mediaAttached: "Media is attached. Upload again to replace it.",
      imageUploadedReady: "Image uploaded and ready to publish.",
      videoUploadedReady: "Video uploaded and ready to publish.",
      postBody: "Body",
      albumDescription: "Album description",
      videoDescription: "Video description",
      replaceMediaHint: "Uploads are attached automatically; no URL needs to be pasted.",
      localFile: "Local file",
      uploadImageFile: "Upload image file",
      uploadVideoFile: "Upload video file",
      uploadNeedsLogin: "Log in as an admin before uploading files.",
      uploading: "Uploading file",
      uploadReady: "Upload complete. URL filled in.",
      uploadFailed: "Upload failed. Check service configuration and try again.",
      publishFailed: "Publish failed. Check service configuration and try again.",
      videoUploadNeedsMemberLevel: "Choose Normal, Gold, or Diamond before uploading a video file.",
      generateInvite: "Generate invite",
      changeLevel: "Change level",
      demoNotice: "Admin sessions sync to the Java backend. Production hides local demo data by default.",
      signedInAs: "Signed in as",
      existingContent: "Published content",
      editContent: "Edit content",
      deleteContent: "Delete content",
      deleteInvite: "Delete invite",
      noContent: "No content yet",
      noInvites: "No unused invite codes"
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
      noCover: "No cover",
      enable: "Enable",
      disable: "Disable"
    },
    common: {
      language: "Language",
      chinese: "Chinese",
      english: "English",
      switchToChinese: "Switch to Chinese",
      switchToEnglish: "Switch to English",
      view: "View",
      publish: "Publish",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      status: "Status",
      colon: ": "
    }
  }
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
