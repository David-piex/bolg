package com.rinana.media.content;

import com.rinana.media.media.MediaAssetEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "post_media")
public class PostMediaEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "post_id", nullable = false)
  private PostEntity post;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "media_asset_id", nullable = false)
  private MediaAssetEntity mediaAsset;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  public UUID getId() {
    return id;
  }

  public PostEntity getPost() {
    return post;
  }

  public void setPost(PostEntity post) {
    this.post = post;
  }

  public MediaAssetEntity getMediaAsset() {
    return mediaAsset;
  }

  public void setMediaAsset(MediaAssetEntity mediaAsset) {
    this.mediaAsset = mediaAsset;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }
}
