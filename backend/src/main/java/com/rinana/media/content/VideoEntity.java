package com.rinana.media.content;

import com.rinana.media.common.ContentVisibility;
import com.rinana.media.media.MediaAssetEntity;
import com.rinana.media.user.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "videos")
public class VideoEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, length = 240)
  private String title;

  @Column(nullable = false)
  private String description;

  @Column(length = 80)
  private String category;

  @Column
  private String tags;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private ContentVisibility visibility;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "media_asset_id", nullable = false)
  private MediaAssetEntity mediaAsset;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "cover_media_id")
  private MediaAssetEntity coverMedia;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private ContentStatus status;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "author_id", nullable = false)
  private UserEntity author;

  @Column(name = "published_at")
  private Instant publishedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public UUID getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getTags() {
    return tags;
  }

  public void setTags(String tags) {
    this.tags = tags;
  }

  public ContentVisibility getVisibility() {
    return visibility;
  }

  public void setVisibility(ContentVisibility visibility) {
    this.visibility = visibility;
  }

  public MediaAssetEntity getMediaAsset() {
    return mediaAsset;
  }

  public void setMediaAsset(MediaAssetEntity mediaAsset) {
    this.mediaAsset = mediaAsset;
  }

  public MediaAssetEntity getCoverMedia() {
    return coverMedia;
  }

  public void setCoverMedia(MediaAssetEntity coverMedia) {
    this.coverMedia = coverMedia;
  }

  public ContentStatus getStatus() {
    return status;
  }

  public void setStatus(ContentStatus status) {
    this.status = status;
  }

  public UserEntity getAuthor() {
    return author;
  }

  public void setAuthor(UserEntity author) {
    this.author = author;
  }

  public Instant getPublishedAt() {
    return publishedAt;
  }

  public void setPublishedAt(Instant publishedAt) {
    this.publishedAt = publishedAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
