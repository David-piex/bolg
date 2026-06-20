package com.rinana.media.invite;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InviteCodeRepository extends JpaRepository<InviteCodeEntity, UUID> {
  Optional<InviteCodeEntity> findByCode(String code);
}
